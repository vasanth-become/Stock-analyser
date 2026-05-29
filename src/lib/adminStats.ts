import { prisma } from './prisma'
import { effectivePlan } from './subscription'

// ─── Time helpers ─────────────────────────────────────────────────────────────

function startOfToday(): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000)
}

function startOfWeek(): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - d.getUTCDay())
  return d
}

// ─── User metrics ─────────────────────────────────────────────────────────────

export async function getUserMetrics() {
  const [totalUsers, newToday, newThisWeek] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: startOfToday() } } }),
    prisma.user.count({ where: { createdAt: { gte: startOfWeek() } } }),
  ])

  // Active Pro: plan=PRO and (planExpiresAt null OR in the future)
  const proUsers = await prisma.user.findMany({
    where: { plan: { in: ['PRO', 'ENTERPRISE'] } },
    select: { plan: true, planExpiresAt: true },
  })
  const activeProCount = proUsers.filter(
    (u) => effectivePlan(u.plan, u.planExpiresAt) !== 'FREE',
  ).length

  // DAU: distinct users who ran an analysis today
  const dauResult = await prisma.analysis.groupBy({
    by: ['userId'],
    where: { createdAt: { gte: startOfToday() } },
  })

  // MAU: distinct users who ran an analysis in the last 30 days
  const mauResult = await prisma.analysis.groupBy({
    by: ['userId'],
    where: { createdAt: { gte: daysAgo(30) } },
  })

  return {
    totalUsers,
    newToday,
    newThisWeek,
    activeProCount,
    dau: dauResult.length,
    mau: mauResult.length,
  }
}

// ─── Analysis metrics ─────────────────────────────────────────────────────────

export async function getAnalysisMetrics() {
  const [today, thisWeek, thisMonth] = await Promise.all([
    prisma.analysis.count({ where: { createdAt: { gte: startOfToday() } } }),
    prisma.analysis.count({ where: { createdAt: { gte: startOfWeek() } } }),
    prisma.analysis.count({ where: { createdAt: { gte: daysAgo(30) } } }),
  ])

  // Daily counts for the last 14 days for a sparkline
  const last14 = await Promise.all(
    Array.from({ length: 14 }, (_, i) => {
      const from = daysAgo(13 - i)
      from.setUTCHours(0, 0, 0, 0)
      const to = daysAgo(12 - i)
      to.setUTCHours(0, 0, 0, 0)
      return prisma.analysis
        .count({ where: { createdAt: { gte: from, lt: to } } })
        .then((count) => ({ date: from.toISOString().slice(0, 10), count }))
    }),
  )

  return { today, thisWeek, thisMonth, last14 }
}

// ─── Top recommended stocks ───────────────────────────────────────────────────

export async function getTopRecommendedStocks(limit = 10) {
  // recommendations column stores the JSON string from ARIA output.
  // We group by symbol in the analyses table (each row = one stock analysis).
  const rows = await prisma.analysis.groupBy({
    by: ['symbol'],
    _count: { symbol: true },
    where: {
      symbol: { not: 'PORTFOLIO' },
      createdAt: { gte: daysAgo(30) },
    },
    orderBy: { _count: { symbol: 'desc' } },
    take: limit,
  })

  return rows.map((r) => ({ symbol: r.symbol, count: r._count.symbol }))
}

// ─── Revenue metrics ──────────────────────────────────────────────────────────

export async function getRevenueMetrics() {
  const proUsers = await prisma.user.findMany({
    where: { plan: { in: ['PRO', 'ENTERPRISE'] } },
    select: { plan: true, planExpiresAt: true, billingCycle: true, subscriptionStatus: true },
  })

  const activeMonthly = proUsers.filter(
    (u) =>
      effectivePlan(u.plan, u.planExpiresAt) !== 'FREE' &&
      u.billingCycle === 'MONTHLY' &&
      u.subscriptionStatus === 'ACTIVE',
  ).length

  const activeYearly = proUsers.filter(
    (u) =>
      effectivePlan(u.plan, u.planExpiresAt) !== 'FREE' &&
      u.billingCycle === 'YEARLY' &&
      u.subscriptionStatus === 'ACTIVE',
  ).length

  const cancelled = proUsers.filter((u) => u.subscriptionStatus === 'CANCELLED').length
  const total = proUsers.length

  // MRR in paise: monthly subs * 29900 + yearly subs / 12 * 249900
  const mrrPaise = activeMonthly * 29900 + Math.round((activeYearly * 249900) / 12)
  const arrPaise = mrrPaise * 12

  const churnRate = total > 0 ? Math.round((cancelled / total) * 100) : 0

  // Revenue over last 6 months from subscription events
  const sixMonthsAgo = daysAgo(180)
  const revenueEvents = await prisma.subscriptionEvent.findMany({
    where: {
      event: { in: ['payment.verified', 'subscription.charged'] },
      createdAt: { gte: sixMonthsAgo },
      amount: { not: null },
    },
    select: { amount: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  // Group into monthly buckets
  const monthlyRevenue: Record<string, number> = {}
  for (const e of revenueEvents) {
    const key = e.createdAt.toISOString().slice(0, 7) // YYYY-MM
    monthlyRevenue[key] = (monthlyRevenue[key] ?? 0) + (e.amount ?? 0)
  }
  const revenueChart = Object.entries(monthlyRevenue).map(([month, amountPaise]) => ({
    month,
    amount: Math.round(amountPaise / 100),
  }))

  return {
    mrr: Math.round(mrrPaise / 100),
    arr: Math.round(arrPaise / 100),
    activeMonthly,
    activeYearly,
    churnRate,
    revenueChart,
  }
}

// ─── API Usage metrics ────────────────────────────────────────────────────────

export async function getApiUsageMetrics() {
  const limit = parseFloat(process.env.MONTHLY_SPEND_LIMIT ?? '50')
  const currentMonth = new Date().toISOString().slice(0, 7)

  const [current, history] = await Promise.all([
    prisma.monthlyApiUsage.findUnique({ where: { month: currentMonth } }),
    prisma.monthlyApiUsage.findMany({
      orderBy: { month: 'desc' },
      take: 6,
    }),
  ])

  return {
    currentMonth,
    totalCalls: current?.totalCalls ?? 0,
    estimatedCost: current?.estimatedCost ?? 0,
    limit,
    history: history.map((h) => ({
      month: h.month,
      totalCalls: h.totalCalls,
      estimatedCost: h.estimatedCost,
    })),
  }
}

// ─── User list (paginated) ────────────────────────────────────────────────────

export async function listUsers(page = 1, pageSize = 20, search = '') {
  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { name: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        planExpiresAt: true,
        subscriptionStatus: true,
        billingCycle: true,
        createdAt: true,
        _count: { select: { analyses: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ])

  return {
    users: users.map((u) => ({
      ...u,
      effectivePlan: effectivePlan(u.plan, u.planExpiresAt),
      analysesCount: u._count.analyses,
    })),
    total,
    pages: Math.ceil(total / pageSize),
  }
}
