import { prisma } from '@/lib/prisma'
import { calculateGoalProjection } from '@/lib/goalClock/goalCalculator'

export function currentQuarter(): string {
  const now = new Date()
  const q = Math.ceil((now.getMonth() + 1) / 3)
  return `Q${q}-${now.getFullYear()}`
}

export function quarterDateRange(quarter: string): { start: Date; end: Date } {
  const [q, y] = quarter.split('-')
  const year = parseInt(y)
  const qNum = parseInt(q.slice(1))
  const startMonth = (qNum - 1) * 3
  return {
    start: new Date(year, startMonth, 1),
    end: new Date(year, startMonth + 3, 0, 23, 59, 59),
  }
}

export interface QuarterlyDataPackage {
  quarter: string
  user: {
    id: string
    name: string | null
    email: string
    plan: string
    profile: {
      displayName: string
      riskTolerance: string
      investmentHorizon: string | null
      experience: string
      monthlyIncome: number
      investmentGoals: string[]
      sectorPreferences: string[]
    } | null
  }
  portfolio: {
    holdings: {
      symbol: string
      companyName: string | null
      sector: string | null
      quantity: number
      buyPrice: number
      buyDate: Date
    }[]
    totalInvested: number
  }
  theses: {
    ticker: string
    companyName: string
    sector: string
    currentStatus: string
    confidenceScore: number
    originalThesis: string
    lastReviewedAt: Date
    reviewsThisQuarter: number
    statusChanges: number
  }[]
  behaviourScore: {
    score: number
    badges: string[]
    panicsStopped: number
    eventsThisQuarter: number
  } | null
  goals: {
    name: string
    emoji: string
    goalType: string
    targetAmount: number
    currentCorpus: number
    monthlySIP: number
    percentComplete: number
    onTrack: boolean
    monthsRemaining: number
    sipGap: number
  }[]
  recentAnalyses: {
    symbol: string
    type: string
    createdAt: Date
    recommendations: string
  }[]
  quarterRange: { start: Date; end: Date }
}

export async function collectQuarterlyData(userId: string, quarter?: string): Promise<QuarterlyDataPackage> {
  const q = quarter ?? currentQuarter()
  const range = quarterDateRange(q)

  const [user, portfolio, theses, behaviourScore, behaviourEvents, goals, recentAnalyses] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      }),
      prisma.portfolio.findUnique({
        where: { userId },
        include: { holdings: true },
      }),
      prisma.stockThesis.findMany({
        where: { userId },
        include: {
          reviews: {
            where: { reviewDate: { gte: range.start, lte: range.end } },
          },
        },
      }),
      prisma.behaviourScore.findUnique({ where: { userId } }),
      prisma.behaviourEvent.count({
        where: { userId, createdAt: { gte: range.start, lte: range.end } },
      }),
      prisma.financialGoal.findMany({
        where: { userId, isActive: true },
      }),
      prisma.analysis.findMany({
        where: { userId, createdAt: { gte: range.start, lte: range.end } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])

  const holdings = portfolio?.holdings ?? []
  const totalInvested = holdings.reduce((s, h) => s + h.buyPrice * h.quantity, 0)

  const thesesMapped = theses.map((t) => ({
    ticker: t.ticker,
    companyName: t.companyName,
    sector: t.sector,
    currentStatus: t.currentStatus,
    confidenceScore: t.confidenceScore,
    originalThesis: t.originalThesis,
    lastReviewedAt: t.lastReviewedAt,
    reviewsThisQuarter: t.reviews.length,
    statusChanges: t.reviews.filter((r) => r.statusChanged).length,
  }))

  const goalsMapped = goals.map((g) => {
    const proj = calculateGoalProjection(g)
    return {
      name: g.name,
      emoji: g.emoji,
      goalType: g.goalType,
      targetAmount: g.targetAmount,
      currentCorpus: g.currentCorpus,
      monthlySIP: g.monthlySIP,
      percentComplete: proj.percentComplete,
      onTrack: proj.onTrack,
      monthsRemaining: proj.monthsRemaining,
      sipGap: proj.sipGap,
    }
  })

  return {
    quarter: q,
    user: {
      id: userId,
      name: user?.name ?? null,
      email: user?.email ?? '',
      plan: user?.plan ?? 'FREE',
      profile: user?.profile
        ? {
            displayName: user.profile.displayName,
            riskTolerance: user.profile.riskTolerance,
            investmentHorizon: user.profile.investmentHorizon ?? null,
            experience: user.profile.experience,
            monthlyIncome: user.profile.monthlyIncome,
            investmentGoals: user.profile.investmentGoals,
            sectorPreferences: user.profile.sectorPreferences,
          }
        : null,
    },
    portfolio: { holdings: holdings.map((h) => ({ symbol: h.symbol, companyName: h.companyName, sector: h.sector, quantity: h.quantity, buyPrice: h.buyPrice, buyDate: h.buyDate })), totalInvested },
    theses: thesesMapped,
    behaviourScore: behaviourScore
      ? {
          score: behaviourScore.score,
          badges: behaviourScore.badges,
          panicsStopped: behaviourScore.panicsStopped,
          eventsThisQuarter: behaviourEvents,
        }
      : null,
    goals: goalsMapped,
    recentAnalyses: recentAnalyses.map((a) => ({
      symbol: a.symbol,
      type: a.type,
      createdAt: a.createdAt,
      recommendations: a.recommendations.slice(0, 500),
    })),
    quarterRange: range,
  }
}
