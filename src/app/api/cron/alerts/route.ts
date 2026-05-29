// Vercel Cron: add to vercel.json
// { "crons": [{ "path": "/api/cron/alerts", "schedule": "*/15 9-16 * * 1-5" }] }
import { NextRequest, NextResponse } from 'next/server'
import { isMarketOpen } from '@/lib/marketData'
import { checkAlerts } from '@/lib/alertChecker'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isMarketOpen()) {
    return NextResponse.json({ skipped: true, reason: 'Market closed' })
  }

  const start = Date.now()
  await checkAlerts()
  return NextResponse.json({ ok: true, durationMs: Date.now() - start, timestamp: new Date().toISOString() })
}
