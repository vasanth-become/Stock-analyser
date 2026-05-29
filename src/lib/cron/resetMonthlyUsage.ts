import { prisma } from '@/lib/prisma'

export async function resetMonthlyUsage(): Promise<void> {
  const month = new Date().toISOString().slice(0, 7)

  // Create new month record
  await prisma.monthlyApiUsage.upsert({
    where: { month },
    update: {},
    create: { month, totalCalls: 0, estimatedCost: 0 },
  })

  // Reset all users' daily analysis count
  await prisma.user.updateMany({
    data: { monthlyAnalysisCount: 0, lastAnalysisReset: new Date() },
  })

  console.log(`[cron] Monthly usage reset complete for ${month}`)
}
