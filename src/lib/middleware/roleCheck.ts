import { prisma } from '@/lib/prisma'

// 5-minute TTL cache for admin checks
const adminCache = new Map<string, { value: boolean; expiresAt: number }>()
const TTL = 5 * 60 * 1000

export async function isAdmin(userId: string): Promise<boolean> {
  const cached = adminCache.get(userId)
  if (cached && cached.expiresAt > Date.now()) return cached.value

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  const value = user?.role === 'ADMIN'
  adminCache.set(userId, { value, expiresAt: Date.now() + TTL })
  return value
}

export async function isPro(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, plan: true, planExpiresAt: true },
  })
  if (!user) return false

  // Admin counts as pro
  if (user.role === 'ADMIN') return true

  const isProPlan = user.plan === 'PRO' || user.plan === 'ENTERPRISE'
  if (!isProPlan) return false

  // Check expiry
  if (user.planExpiresAt && user.planExpiresAt < new Date()) {
    // Auto-downgrade expired PRO
    await prisma.user.update({
      where: { id: userId },
      data: { plan: 'FREE', subscriptionStatus: 'EXPIRED' },
    })
    return false
  }

  return true
}

export async function canRunAnalysis(userId: string): Promise<{
  allowed: boolean
  reason: string
  remainingToday: number
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      plan: true,
      planExpiresAt: true,
      monthlyAnalysisCount: true,
      lastAnalysisReset: true,
    },
  })

  if (!user) return { allowed: false, reason: 'User not found', remainingToday: 0 }

  // Admin and Pro: always allowed
  if (user.role === 'ADMIN') {
    return { allowed: true, reason: '', remainingToday: 999 }
  }

  const proUser = await isPro(userId)
  if (proUser) {
    return { allowed: true, reason: '', remainingToday: 999 }
  }

  // Free: 3 per day
  const FREE_LIMIT = 3
  const now = new Date()
  const lastReset = new Date(user.lastAnalysisReset)

  // Check if it's a new calendar day (UTC)
  const isNewDay =
    now.getUTCFullYear() !== lastReset.getUTCFullYear() ||
    now.getUTCMonth() !== lastReset.getUTCMonth() ||
    now.getUTCDate() !== lastReset.getUTCDate()

  let currentCount = user.monthlyAnalysisCount

  if (isNewDay) {
    // Reset count for the new day
    await prisma.user.update({
      where: { id: userId },
      data: { monthlyAnalysisCount: 0, lastAnalysisReset: now },
    })
    currentCount = 0
  }

  const remaining = Math.max(0, FREE_LIMIT - currentCount)

  if (currentCount >= FREE_LIMIT) {
    return {
      allowed: false,
      reason: 'Daily limit reached. Upgrade to Pro for unlimited analyses.',
      remainingToday: 0,
    }
  }

  return { allowed: true, reason: '', remainingToday: remaining }
}

export async function incrementAnalysisCount(userId: string): Promise<void> {
  const now = new Date()
  const month = now.toISOString().slice(0, 7) // "2025-06"

  await Promise.all([
    // Increment user's daily count
    prisma.user.update({
      where: { id: userId },
      data: {
        monthlyAnalysisCount: { increment: 1 },
        lastAnalysisReset: now,
      },
    }),
    // Increment global monthly usage + cost tracking
    prisma.monthlyApiUsage.upsert({
      where: { month },
      update: {
        totalCalls: { increment: 1 },
        estimatedCost: { increment: 0.02 },
      },
      create: {
        month,
        totalCalls: 1,
        estimatedCost: 0.02,
      },
    }),
  ])
}
