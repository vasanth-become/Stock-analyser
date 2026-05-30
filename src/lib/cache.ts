/**
 * Two-tier cache: in-memory (always) + optional Redis (when REDIS_URL is set).
 * Both honour a per-entry TTL.  The in-memory tier doubles as a hot-path guard
 * against stampedes even when Redis is configured.
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

// ─── In-memory tier ───────────────────────────────────────────────────────────

const store = new Map<string, CacheEntry<unknown>>()

/** Periodically evict expired entries so the Map doesn't grow unbounded. */
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    store.forEach((v, k) => {
      if (v.expiresAt < now) store.delete(k)
    })
  }, 60_000)
}

function memGet<T>(key: string): T | null {
  const entry = store.get(key)
  if (!entry || entry.expiresAt < Date.now()) {
    store.delete(key)
    return null
  }
  return entry.value as T
}

function memSet<T>(key: string, value: T, ttlSeconds: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1_000 })
}

// ─── Redis tier (optional) ────────────────────────────────────────────────────

type RedisClient = {
  get(key: string): Promise<string | null>
  set(key: string, value: string, options?: { EX?: number }): Promise<unknown>
}

let redis: RedisClient | null = null

async function getRedis(): Promise<RedisClient | null> {
  if (redis) return redis
  if (!process.env.REDIS_URL) return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { createClient } = (await import(/* webpackIgnore: true */ 'redis')) as any
    const client = createClient({ url: process.env.REDIS_URL })
    await client.connect()
    redis = client as unknown as RedisClient
    return redis
  } catch {
    return null
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function cacheGet<T>(key: string): Promise<T | null> {
  // 1. Hot-path: in-memory
  const mem = memGet<T>(key)
  if (mem !== null) return mem

  // 2. Redis (if configured)
  const r = await getRedis()
  if (r) {
    const raw = await r.get(key).catch(() => null)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as T
        memSet(key, parsed, 60) // warm memory tier for 60s
        return parsed
      } catch {
        /* ignore malformed */
      }
    }
  }
  return null
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  memSet(key, value, ttlSeconds)

  const r = await getRedis()
  if (r) {
    await r.set(key, JSON.stringify(value), { EX: ttlSeconds }).catch(() => {
      /* non-fatal */
    })
  }
}

export async function cacheGetOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number,
): Promise<T> {
  const cached = await cacheGet<T>(key)
  if (cached !== null) return cached

  const fresh = await fetcher()
  await cacheSet(key, fresh, ttlSeconds)
  return fresh
}

export function cacheInvalidate(prefix: string): void {
  store.forEach((_, k) => {
    if (k.startsWith(prefix)) store.delete(k)
  })
}
