// Vercel Cron: add to vercel.json
// { "crons": [{ "path": "/api/cron/digest", "schedule": "30 2 * * 1" }] }
import { NextRequest, NextResponse } from 'next/server'
import { sendWeeklyDigests } from '@/lib/alertChecker'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  await sendWeeklyDigests()
  return NextResponse.json({ ok: true, durationMs: Date.now() - start, timestamp: new Date().toISOString() })
}
