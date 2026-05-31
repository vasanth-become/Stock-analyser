import { prisma } from '@/lib/prisma'
import { reviewThesis } from '@/lib/thesisTracker/thesisReviewer'
import { sendThesisWeeklyEmail } from '@/lib/email'

export async function runWeeklyThesisReview(): Promise<void> {
  const due = await prisma.stockThesis.findMany({
    where: { nextReviewDue: { lte: new Date() } },
    select: { id: true, userId: true },
  })

  console.log(`[thesisReview] ${due.length} theses due for review`)

  // Batch in groups of 10
  for (let i = 0; i < due.length; i += 10) {
    const batch = due.slice(i, i + 10)
    await Promise.allSettled(batch.map((t) => reviewThesis(t.id, 'auto_weekly')))
    if (i + 10 < due.length) await new Promise((r) => setTimeout(r, 2000))
  }

  // Per-user summary emails for users with status changes
  const userIds = Array.from(new Set(due.map((t) => t.userId)))
  for (const userId of userIds) {
    try {
      await sendThesisWeeklySummary(userId)
    } catch (err) {
      console.error(`[thesisReview] Email failed for ${userId}:`, err)
    }
  }
}

async function sendThesisWeeklySummary(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  })
  if (!user?.email) return

  const theses = await prisma.stockThesis.findMany({
    where: { userId },
    include: { reviews: { orderBy: { reviewDate: 'desc' }, take: 1 } },
  })

  const withChanges = theses.filter((t) => t.reviews[0]?.statusChanged)
  if (withChanges.length === 0) return

  await sendThesisWeeklyEmail({
    to: user.email,
    name: user.name?.split(' ')[0] ?? 'Investor',
    intact: theses.filter((t) => t.currentStatus === 'intact').map((t) => t.ticker),
    weakening: theses
      .filter((t) => t.currentStatus === 'weakening')
      .map((t) => ({ ticker: t.ticker, summary: t.reviews[0]?.aiSummary ?? '' })),
    broken: theses
      .filter((t) => t.currentStatus === 'broken')
      .map((t) => ({ ticker: t.ticker, summary: t.reviews[0]?.aiSummary ?? '' })),
  })
}
