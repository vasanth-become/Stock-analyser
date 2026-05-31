import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { runAnalysis } from '@/lib/analysisEngine'
import { getSectorPerformance, getTopGainersLosers, getIndexQuotes, getStockFundamentals } from '@/lib/marketData'
import { canRunAnalysis, incrementAnalysisCount } from '@/lib/middleware/roleCheck'
import { checkSpendLimit } from '@/lib/spendGuard'

export async function POST(req: NextRequest) {
  try {
    return await handlePost(req)
  } catch (err) {
    console.error('[analyse] unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error. Please try again.' }, { status: 500 })
  }
}

async function handlePost(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  // Role-aware rate limit
  const { allowed, reason, remainingToday } = await canRunAnalysis(userId)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Daily limit reached', reason, upgradeUrl: '/pricing' },
      { status: 429 },
    )
  }

  // API spend guard
  const spendCheck = await checkSpendLimit()
  if (!spendCheck.safe) {
    return NextResponse.json(
      {
        error: 'Service temporarily limited',
        message: 'Monthly analysis limit reached. Resets on the 1st. Contact support.',
      },
      { status: 503 },
    )
  }

  // Check Anthropic key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'AI service not configured. Add ANTHROPIC_API_KEY to your .env.local file.' },
      { status: 503 },
    )
  }

  // Fetch investor profile
  const profile = await prisma.investorProfile.findUnique({ where: { userId } })
  if (!profile) {
    return NextResponse.json(
      { error: 'Complete your investor profile first.' },
      { status: 400 },
    )
  }

  // Fetch live market context
  const [sectors, { gainers, losers }, indices] = await Promise.all([
    getSectorPerformance(),
    getTopGainersLosers(),
    getIndexQuotes(),
  ])

  // Run ARIA analysis
  let result
  try {
    result = await runAnalysis(profile, sectors, gainers, losers, {
      date: new Date().toISOString().slice(0, 10),
      indices,
      sectors,
      topGainers: gainers,
      topLosers: losers,
    })
  } catch (err) {
    console.error('Claude analysis error:', err)
    return NextResponse.json({ error: 'AI analysis failed. Please try again.' }, { status: 500 })
  }

  // Enrich with live fundamentals (best-effort, non-fatal)
  const enriched = await Promise.all(
    result.recommendations.map(async (rec) => {
      try {
        const fund = await getStockFundamentals(rec.ticker)
        return { ...rec, pe: rec.pe ?? fund.pe, liveMarketCap: fund.marketCap }
      } catch {
        return rec
      }
    }),
  )

  const finalResult = { ...result, recommendations: enriched }

  // Persist to DB
  const profileSnapshot = JSON.stringify({
    riskScore: profile.riskScore,
    riskTolerance: profile.riskTolerance,
    investmentGoals: profile.investmentGoals,
    sectorPreferences: profile.sectorPreferences,
    sipBudget: profile.sipBudget,
    hasLumpSum: profile.hasLumpSum,
    lumpSumAmount: profile.lumpSumAmount,
    investmentHorizon: profile.investmentHorizon,
    experience: profile.experience,
  })

  const analysis = await prisma.analysis.create({
    data: {
      userId,
      symbol: 'PORTFOLIO',
      type: 'AI_SUMMARY',
      recommendations: JSON.stringify(finalResult.recommendations),
      profileSnapshot,
    },
  })

  // Track usage AFTER successful analysis
  await incrementAnalysisCount(userId)

  const newRemaining = remainingToday === 999 ? 999 : Math.max(0, remainingToday - 1)

  return NextResponse.json({
    id: analysis.id,
    createdAt: analysis.createdAt,
    marketSummary: finalResult.marketSummary,
    profileSummary: finalResult.profileSummary,
    budgetAllocation: finalResult.budgetAllocation,
    recommendations: finalResult.recommendations,
    disclaimer: finalResult.disclaimer,
    remainingToday: newRemaining,
  })
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const analyses = await prisma.analysis.findMany({
    where: { userId: session.user.id, type: 'AI_SUMMARY' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      createdAt: true,
      recommendations: true,
      profileSnapshot: true,
    },
  })

  return NextResponse.json(
    analyses.map((a) => ({
      id: a.id,
      createdAt: a.createdAt,
      recommendations: JSON.parse(a.recommendations),
    })),
  )
}
