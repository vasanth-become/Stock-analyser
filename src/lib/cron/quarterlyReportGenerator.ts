import { prisma } from '@/lib/prisma'
import { generateQuarterlyReport } from '@/lib/quarterlyReport/reportGenerator'
import { currentQuarter } from '@/lib/quarterlyReport/dataCollector'
import { sendQuarterlyReportEmail } from '@/lib/email'
import type { ReportData } from '@/lib/quarterlyReport/reportGenerator'

export async function runQuarterlyReportGeneration(): Promise<void> {
  const q = currentQuarter()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://stockanalyser.app'

  // All users (Pro first, then Free get preview)
  const users = await prisma.user.findMany({
    where: { onboarded: true },
    select: { id: true, email: true, name: true, plan: true },
  })

  console.log(`[quarterlyReport] Generating ${q} reports for ${users.length} users`)

  for (const user of users) {
    if (!user.email) continue
    try {
      const reportId = await generateQuarterlyReport(user.id, q)
      const report = await prisma.quarterlyReport.findUnique({ where: { id: reportId } })
      if (!report) continue

      const rd = report.reportData as unknown as ReportData
      await sendQuarterlyReportEmail({
        to: user.email,
        name: user.name?.split(' ')[0] ?? 'Investor',
        quarter: q,
        grade: report.portfolioGrade,
        score: report.portfolioScore,
        headline: rd.executiveSummary?.headline ?? 'Your quarterly portfolio review is ready.',
        keyWins: rd.executiveSummary?.keyWins ?? [],
        keyActions: rd.executiveSummary?.keyActions ?? [],
        rebalanceNeeded: rd.rebalanceRecommendations?.rebalanceNeeded ?? false,
        reportUrl: `${appUrl}/reports/${reportId}`,
        isPro: user.plan === 'PRO',
      })

      await prisma.quarterlyReport.update({ where: { id: reportId }, data: { wasEmailed: true } })
    } catch (err) {
      console.error(`[quarterlyReport] Failed for user ${user.id}:`, err)
    }
  }

  console.log(`[quarterlyReport] ${q} reports done.`)
}
