import { NextRequest, NextResponse } from 'next/server'
import { resetMonthlyUsage } from '@/lib/cron/resetMonthlyUsage'

// Called by Vercel Cron on schedule: 0 0 1 * *  (midnight on the 1st)
export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await resetMonthlyUsage()
  return NextResponse.json({ ok: true, message: 'Monthly usage reset complete' })
}
