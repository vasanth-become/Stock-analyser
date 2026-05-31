import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateCalmMessage } from '@/lib/behaviourGuard/calmMessageGenerator'
import { getStockQuote } from '@/lib/marketData'
import { z } from 'zod'

const schema = z.object({
  ticker: z.string().min(1).max(20).toUpperCase(),
  reason: z.string().min(1).max(500),
})

const DAILY_LIMIT = 5

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { ticker, reason } = parsed.data
  const userId = session.user.id

  // Rate limit: max 5 manual checks per day
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayCount = await prisma.behaviourEvent.count({
    where: {
      userId,
      eventType: 'thesis_checked',
      createdAt: { gte: todayStart },
    },
  })
  if (todayCount >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: `Daily limit of ${DAILY_LIMIT} manual checks reached. Come back tomorrow.` },
      { status: 429 },
    )
  }

  // Fetch current quote
  let changePercent = 0
  let companyName = ticker
  try {
    const quote = await getStockQuote(ticker, 'NSE')
    changePercent = quote.changePercent ?? 0
    companyName = quote.companyName ?? ticker
  } catch {
    // proceed with defaults
  }

  // Build a minimal market context for the prompt
  const mockMarket = { triggered: true, level: 'yellow' as const, niftyChange: changePercent, sensexChange: changePercent }
  const watchlistData = [{ ticker, companyName, changePercent, notes: reason }]

  const calmMsg = await generateCalmMessage(userId, mockMarket, watchlistData)
  if (!calmMsg) {
    return NextResponse.json({ error: 'AI analysis failed. Please try again.' }, { status: 500 })
  }

  // Log the event
  await prisma.behaviourEvent.create({
    data: {
      userId,
      eventType: 'thesis_checked',
      marketDrop: changePercent,
      userAction: reason.slice(0, 200),
      stocksAffected: [ticker],
    },
  })

  // Check thesis_checker badge (10 manual checks)
  const totalChecks = todayCount + 1
  if (totalChecks >= 10) {
    const score = await prisma.behaviourScore.findUnique({ where: { userId } })
    if (score && !score.badges.includes('thesis_checker')) {
      await prisma.behaviourScore.update({
        where: { userId },
        data: { badges: { push: 'thesis_checker' } },
      })
    }
  }

  return NextResponse.json({ calmMessage: calmMsg, remainingChecks: DAILY_LIMIT - (todayCount + 1) })
}
