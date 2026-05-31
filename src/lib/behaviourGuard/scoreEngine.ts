import { prisma } from '@/lib/prisma'

export const BADGE_DEFINITIONS = [
  { id: 'first_hold', label: 'First Hold', description: 'Held through your first red day', icon: '🛡️' },
  { id: 'bear_survivor', label: 'Bear Survivor', description: 'Held through a >5% market drop', icon: '🐻' },
  { id: 'sip_warrior', label: 'SIP Warrior', description: 'Kept SIPs running without interruption', icon: '⚔️' },
  { id: 'iron_hands', label: 'Iron Hands', description: 'Behaviour Score above 75', icon: '🦾' },
  { id: 'market_sage', label: 'Market Sage', description: 'Behaviour Score above 90', icon: '🧠' },
  { id: 'thesis_checker', label: 'Thesis Checker', description: 'Used manual "Should I sell?" check 10 times', icon: '🔍' },
  { id: '100_day_holder', label: '100 Day Holder', description: 'Held any stock for 100+ days', icon: '📅' },
  { id: 'panic_free_month', label: 'Panic-Free Month', description: 'No panic events in 30 days', icon: '🧘' },
]

export async function getOrCreateScore(userId: string) {
  const existing = await prisma.behaviourScore.findUnique({ where: { userId } })
  if (existing) return existing
  return prisma.behaviourScore.create({ data: { userId, score: 50, badges: [] } })
}

export async function applyResponse(
  userId: string,
  response: 'stay_course' | 'research_more' | 'ignored',
  marketDrop: number,
): Promise<{ newScore: number; newBadges: string[] }> {
  const current = await getOrCreateScore(userId)

  let scoreDelta = 0
  let panicDelta = 0

  if (response === 'stay_course') {
    scoreDelta = 20
    panicDelta = 1
  } else if (response === 'research_more') {
    scoreDelta = 10
  }

  const rawScore = Math.min(100, Math.max(0, current.score + scoreDelta))
  const existingBadges = new Set(current.badges)
  const newBadgesEarned: string[] = []

  // First Hold badge
  if (!existingBadges.has('first_hold') && response === 'stay_course') {
    existingBadges.add('first_hold')
    newBadgesEarned.push('first_hold')
  }

  // Bear Survivor — held through >5% drop
  if (!existingBadges.has('bear_survivor') && Math.abs(marketDrop) >= 5 && response === 'stay_course') {
    existingBadges.add('bear_survivor')
    newBadgesEarned.push('bear_survivor')
  }

  // Iron Hands — score > 75
  if (!existingBadges.has('iron_hands') && rawScore > 75) {
    existingBadges.add('iron_hands')
    newBadgesEarned.push('iron_hands')
  }

  // Market Sage — score > 90
  if (!existingBadges.has('market_sage') && rawScore > 90) {
    existingBadges.add('market_sage')
    newBadgesEarned.push('market_sage')
  }

  await prisma.behaviourScore.update({
    where: { userId },
    data: {
      score: rawScore,
      totalEvents: { increment: 1 },
      panicsStopped: { increment: panicDelta },
      holdingsKept: response === 'stay_course' ? { increment: 1 } : undefined,
      badges: Array.from(existingBadges),
      lastUpdated: new Date(),
    },
  })

  return { newScore: rawScore, newBadges: newBadgesEarned }
}

export async function checkPanicFreeBadge(userId: string): Promise<boolean> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const recentPanics = await prisma.behaviourEvent.count({
    where: {
      userId,
      eventType: 'panic_detected',
      createdAt: { gte: thirtyDaysAgo },
    },
  })

  if (recentPanics > 0) return false

  const score = await getOrCreateScore(userId)
  if (score.badges.includes('panic_free_month')) return false

  await prisma.behaviourScore.update({
    where: { userId },
    data: { badges: { push: 'panic_free_month' } },
  })
  return true
}
