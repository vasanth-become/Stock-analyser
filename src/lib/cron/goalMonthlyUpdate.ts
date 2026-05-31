import { prisma } from '@/lib/prisma'
import { calculateGoalProjection } from '@/lib/goalClock/goalCalculator'
import { sendGoalMonthlyUpdate } from '@/lib/email'

export async function sendMonthlyGoalUpdates(): Promise<void> {
  const month = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  const users = await prisma.user.findMany({
    where: { financialGoals: { some: { isActive: true } } },
    select: {
      id: true,
      name: true,
      email: true,
      financialGoals: { where: { isActive: true } },
    },
  })

  console.log(`[goalMonthly] Sending updates to ${users.length} users for ${month}`)

  for (const user of users) {
    if (!user.email) continue
    try {
      const goals = user.financialGoals.map((g) => {
        const proj = calculateGoalProjection(g)
        return {
          name: g.name,
          emoji: g.emoji,
          percentComplete: proj.percentComplete,
          currentCorpus: g.currentCorpus,
          targetAmount: g.targetAmount,
          onTrack: proj.onTrack,
          monthsRemaining: proj.monthsRemaining,
          sipGap: proj.sipGap,
        }
      })
      await sendGoalMonthlyUpdate({
        to: user.email,
        name: user.name?.split(' ')[0] ?? 'Investor',
        month,
        goals,
      })
    } catch (err) {
      console.error(`[goalMonthly] Failed for user ${user.id}:`, err)
    }
  }
}
