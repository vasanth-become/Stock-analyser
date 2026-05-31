import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateGoalProjection } from '@/lib/goalClock/goalCalculator'
import { generateMilestoneCelebration } from '@/lib/goalClock/goalInsights'
import { z } from 'zod'

const schema = z.object({ corpus: z.number().min(0) })

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const goal = await prisma.financialGoal.findFirst({
    where: { id: params.id, userId: session.user.id, isActive: true },
    include: { milestones: true },
  })
  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const oldPct = goal.targetAmount > 0 ? (goal.currentCorpus / goal.targetAmount) * 100 : 0
  const newPct = goal.targetAmount > 0 ? (parsed.data.corpus / goal.targetAmount) * 100 : 0

  const updated = await prisma.financialGoal.update({
    where: { id: goal.id },
    data: { currentCorpus: parsed.data.corpus },
    include: { milestones: true },
  })

  const projection = calculateGoalProjection(updated)
  await prisma.goalSnapshot.create({
    data: { goalId: goal.id, corpus: parsed.data.corpus, onTrack: projection.onTrack, monthsAhead: projection.monthsAheadOrBehind },
  })

  // Check for newly crossed milestones
  const crossedMilestones: Array<{ percent: number; message: string }> = []
  for (const milestone of goal.milestones) {
    if (!milestone.reachedAt && newPct >= milestone.percent && oldPct < milestone.percent) {
      await prisma.goalMilestone.update({
        where: { id: milestone.id },
        data: { reachedAt: new Date(), celebrated: true },
      })
      // Reward behaviour score
      await prisma.behaviourScore.upsert({
        where: { userId: session.user.id },
        update: { score: { increment: 15 }, totalEvents: { increment: 1 } },
        create: { userId: session.user.id, score: 65, totalEvents: 1, badges: [] },
      }).catch(() => {})

      const message = await generateMilestoneCelebration(goal, milestone.percent)
      crossedMilestones.push({ percent: milestone.percent, message })
    }
  }

  return NextResponse.json({ ...updated, projection, crossedMilestones })
}
