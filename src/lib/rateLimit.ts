import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ─── Types ────────────────────────────────────────────────────────────────────

export type LimiterKey = 'default' | 'auth' | 'ai' | 'strict'

interface LimiterConfig {
  requests: number
  window: string
}

interface RateLimitResult {
  limited: boolean
  headers: Record<string, string>
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CONFIGS: Record<LimiterKey, LimiterConfig> = {
  default: { requests: 100, window: '1 m' }, // general API
  auth:    { requests: 10,  window: '1 m' }, // login/register — brute-force protection
  ai:      { requests: 20,  window: '1 m' }, // Claude AI routes — expensive ops
  strict:  { requests: 5,   window: '1 m' }, // very sensitive (webhooks, admin writes)
}

// ─── Lazy singleton instances ─────────────────────────────────────────────────

let redis: Redis | null = null
const instances = new Map<LimiterKey, Ratelimit>()

function getRedis(): Redis | null {
  if (redis !== null) return redis
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  return redis
}

function getLimiter(key: LimiterKey): Ratelimit | null {
  const r = getRedis()
  if (!r) return null // Rate limiting disabled — Upstash not configured

  if (instances.has(key)) return instances.get(key)!

  const { requests, window } = CONFIGS[key]
  const limiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(requests, window as `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}`),
    analytics: false, // disable Upstash analytics to save bandwidth
    prefix: `sa:rl:${key}`,
  })
  instances.set(key, limiter)
  return limiter
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Check rate limit for a given identifier (usually `ip:limiterKey`).
 * Returns `{ limited: false }` when Upstash is not configured (dev/Docker).
 */
export async function checkRateLimit(
  identifier: string,
  key: LimiterKey = 'default',
): Promise<RateLimitResult> {
  const limiter = getLimiter(key)
  if (!limiter) return { limited: false, headers: {} }

  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier)

    const headers: Record<string, string> = {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': reset.toString(),
    }

    if (!success) {
      const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
      headers['Retry-After'] = retryAfter.toString()
    }

    return { limited: !success, headers }
  } catch {
    // Never block requests due to a rate-limit infrastructure failure
    return { limited: false, headers: {} }
  }
}

/**
 * Determine the limiter key from an API pathname.
 */
export function limiterKeyForPath(pathname: string): LimiterKey {
  if (pathname.startsWith('/api/auth')) return 'auth'
  if (pathname.startsWith('/api/analyse') || pathname.startsWith('/api/sip')) return 'ai'
  if (pathname.startsWith('/api/admin') || pathname.startsWith('/api/webhooks')) return 'strict'
  return 'default'
}
