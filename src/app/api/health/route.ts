import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic so this always reflects live state
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const START_TIME = Date.now()

export async function GET() {
  const checks: Record<string, { status: 'ok' | 'error' | 'unconfigured'; latencyMs?: number; detail?: string }> = {}

  // ── Database ──────────────────────────────────────────────────────────────
  const dbStart = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = { status: 'ok', latencyMs: Date.now() - dbStart }
  } catch (e) {
    checks.database = { status: 'error', detail: e instanceof Error ? e.message : 'unknown' }
  }

  // ── External service presence checks (no actual calls — just key presence) ─
  checks.anthropic = {
    status: process.env.ANTHROPIC_API_KEY ? 'ok' : 'unconfigured',
  }
  checks.resend = {
    status: process.env.RESEND_API_KEY ? 'ok' : 'unconfigured',
  }
  checks.razorpay = {
    status: process.env.RAZORPAY_KEY_ID ? 'ok' : 'unconfigured',
  }
  checks.rateLimit = {
    status: process.env.UPSTASH_REDIS_REST_URL ? 'ok' : 'unconfigured',
    detail: process.env.UPSTASH_REDIS_REST_URL ? undefined : 'Rate limiting disabled (no Upstash)',
  }

  const allOk = Object.values(checks).every((c) => c.status !== 'error')

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - START_TIME) / 1000),
      version: process.env.npm_package_version ?? '0.1.0',
      environment: process.env.NEXT_PUBLIC_ENV ?? 'development',
      checks,
    },
    { status: allOk ? 200 : 503 },
  )
}
