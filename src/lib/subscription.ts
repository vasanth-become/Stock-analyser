import { prisma } from './prisma'
import type { Plan } from '@prisma/client'

// ─── Feature limits per tier ──────────────────────────────────────────────────

export const PLAN_LIMITS = {
  FREE: {
    dailyAnalyses: 3,
    watchlistStocks: 10,
    priceAlerts: 0,
    weeklyDigest: false,
    xirr: false,
    priorityModel: false,
  },
  PRO: {
    dailyAnalyses: Infinity,
    watchlistStocks: Infinity,
    priceAlerts: 20,
    weeklyDigest: true,
    xirr: true,
    priorityModel: true,
  },
  ENTERPRISE: {
    dailyAnalyses: Infinity,
    watchlistStocks: Infinity,
    priceAlerts: Infinity,
    weeklyDigest: true,
    xirr: true,
    priorityModel: true,
  },
} as const satisfies Record<Plan, object>

export type PlanLimits = typeof PLAN_LIMITS[Plan]
export type ProFeature = keyof typeof PLAN_LIMITS['PRO']

// ─── Plan resolution ──────────────────────────────────────────────────────────

/**
 * Returns the effective plan for a user, treating expired PRO as FREE.
 */
export function effectivePlan(
  plan: Plan,
  planExpiresAt: Date | null | undefined,
): Plan {
  if (plan === 'FREE') return 'FREE'
  if (planExpiresAt && planExpiresAt < new Date()) return 'FREE'
  return plan
}

export function getLimits(plan: Plan, planExpiresAt?: Date | null): PlanLimits {
  return PLAN_LIMITS[effectivePlan(plan, planExpiresAt)]
}

export function isPro(plan: Plan, planExpiresAt?: Date | null): boolean {
  const eff = effectivePlan(plan, planExpiresAt)
  return eff === 'PRO' || eff === 'ENTERPRISE'
}

export function canUseFeature(
  plan: Plan,
  feature: ProFeature,
  planExpiresAt?: Date | null,
): boolean {
  const limits = getLimits(plan, planExpiresAt)
  const val = limits[feature]
  if (typeof val === 'boolean') return val
  if (typeof val === 'number') return val > 0
  return false
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

export async function getUserPlan(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planExpiresAt: true, subscriptionStatus: true, subscriptionId: true, billingCycle: true },
  })
  if (!user) throw new Error('User not found')
  return {
    ...user,
    effectivePlan: effectivePlan(user.plan, user.planExpiresAt),
    isPro: isPro(user.plan, user.planExpiresAt),
    limits: getLimits(user.plan, user.planExpiresAt),
  }
}

export async function activateProPlan(
  userId: string,
  subscriptionId: string,
  cycle: 'MONTHLY' | 'YEARLY',
  razorpayCustomerId?: string,
): Promise<void> {
  const expiresAt = new Date()
  if (cycle === 'YEARLY') {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)
  } else {
    expiresAt.setMonth(expiresAt.getMonth() + 1)
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: 'PRO',
      subscriptionId,
      subscriptionStatus: 'ACTIVE',
      billingCycle: cycle,
      planExpiresAt: expiresAt,
      ...(razorpayCustomerId ? { razorpayCustomerId } : {}),
    },
  })
}

export async function cancelProPlan(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionStatus: 'CANCELLED' },
  })
  // Keep plan=PRO with existing planExpiresAt so they keep access until period ends
}

export async function expireProPlan(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: 'FREE',
      subscriptionStatus: 'EXPIRED',
      subscriptionId: null,
      planExpiresAt: null,
    },
  })
}

export async function recordSubscriptionEvent(
  userId: string,
  event: string,
  plan: Plan,
  status: import('@prisma/client').SubscriptionStatus,
  payload: object,
  razorpayEventId?: string,
  amount?: number,
): Promise<void> {
  await prisma.subscriptionEvent.create({
    data: {
      userId,
      event,
      plan,
      status,
      amount,
      payload: JSON.stringify(payload),
      ...(razorpayEventId ? { razorpayEventId } : {}),
    },
  })
}

export async function getSubscriptionHistory(userId: string) {
  return prisma.subscriptionEvent.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      event: true,
      plan: true,
      status: true,
      amount: true,
      createdAt: true,
    },
  })
}

// ─── Rate limiting helper ─────────────────────────────────────────────────────

/**
 * Returns true if a free user has hit their daily analysis limit.
 */
export async function hasHitDailyAnalysisLimit(userId: string, plan: Plan): Promise<boolean> {
  const limit = PLAN_LIMITS[plan].dailyAnalyses
  if (limit === Infinity) return false

  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  const count = await prisma.analysis.count({
    where: { userId, createdAt: { gte: todayStart } },
  })
  return count >= limit
}

/**
 * Returns true if a user has hit their watchlist stock limit.
 */
export async function hasHitWatchlistLimit(userId: string, plan: Plan): Promise<boolean> {
  const limit = PLAN_LIMITS[plan].watchlistStocks
  if (limit === Infinity) return false

  const count = await prisma.watchlistStock.count({
    where: { watchlist: { userId } },
  })
  return count >= limit
}

/**
 * Returns true if a user has hit their alert limit.
 */
export async function hasHitAlertLimit(userId: string, plan: Plan): Promise<boolean> {
  const limit = PLAN_LIMITS[plan].priceAlerts
  if (limit === Infinity) return false
  if (limit === 0) return true

  const count = await prisma.alert.count({
    where: { userId, active: true },
  })
  return count >= limit
}
