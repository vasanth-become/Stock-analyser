import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateGoalProjection, generateGoalInsight } from '@/lib/goalClock/goalCalculator'
import { z } from 'zod'

async function getGoal(id: string, userId: string) {
  return prisma.financialGoal.findFirst({
    where: { id, userId, isActive: true },
    include: { milestones: { orderBy: { percent: 'asc' } }, snapshots: { orderBy: { snapshotDate: 'desc' }, take: 12 } },
  })
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const goal = await getGoal(params.id, session.user.id)
  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const projection = calculateGoalProjection(goal)
  const insight = await generateGoalInsight(goal, projection)

  return NextResponse.json({ ...goal, projection, insight })
}

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  emoji: z.string().max(8).optional(),
  targetAmount: z.number().positive().optional(),
  targetDate: z.string().optional(),
  currentCorpus: z.number().min(0).optional(),
  monthlySIP: z.number().min(0).optional(),
  expectedReturn: z.number().min(1).max(30).optional(),
  isPrimary: z.boolean().optional(),
  linkedFunds: z.array(z.string()).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const goal = await getGoal(params.id, session.user.id)
  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  const { isPrimary, targetDate, ...rest } = parsed.data

  if (isPrimary) {
    await prisma.financialGoal.updateMany({ where: { userId: session.user.id, isPrimary: true }, data: { isPrimary: false } })
  }

  const updated = await prisma.financialGoal.update({
    where: { id: params.id },
    data: { ...rest, ...(isPrimary !== undefined ? { isPrimary } : {}), ...(targetDate ? { targetDate: new Date(targetDate) } : {}) },
    include: { milestones: true },
  })

  const projection = calculateGoalProjection(updated)
  await prisma.goalSnapshot.create({
    data: { goalId: updated.id, corpus: updated.currentCorpus, onTrack: projection.onTrack, monthsAhead: projection.monthsAheadOrBehind },
  })

  return NextResponse.json({ ...updated, projection })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const goal = await getGoal(params.id, session.user.id)
  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.financialGoal.update({ where: { id: params.id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
