// Manual/scheduled cache refresh endpoint.
// For Vercel Cron Jobs, add to vercel.json:
//   { "crons": [{ "path": "/api/cron/refresh", "schedule": "*/15 3-10 * * 1-5" }] }
// Protected by CRON_SECRET env var.
import { NextRequest, NextResponse } from 'next/server'
import { cacheInvalidate } from '@/lib/cache'
import { getIndexQuotes, getSectorPerformance, getTopGainersLosers, isMarketOpen } from '@/lib/marketData'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const expected = process.env.CRON_SECRET

  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isMarketOpen()) {
    return NextResponse.json({ skipped: true, reason: 'Market closed' })
  }

  const start = Date.now()
  cacheInvalidate('indices:')
  cacheInvalidate('sectors:')
  cacheInvalidate('movers:')

  const results = await Promise.allSettled([
    getIndexQuotes(),
    getSectorPerformance(),
    getTopGainersLosers(),
  ])

  const errors = results.filter((r) => r.status === 'rejected').length

  return NextResponse.json({
    refreshed: true,
    durationMs: Date.now() - start,
    errors,
    timestamp: new Date().toISOString(),
  })
}
