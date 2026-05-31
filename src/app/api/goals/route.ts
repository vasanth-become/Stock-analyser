import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateGoalProjection } from '@/lib/goalClock/goalCalculator'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1).max(100),
  emoji: z.string().max(8).default('💰'),
  goalType: z.enum(['education', 'home', 'wedding', 'travel', 'retirement', 'emergency', 'vehicle', 'custom']),
  targetAmount: z.number().positive(),
  targetDate: z.string(),
  currentCorpus: z.number().min(0).default(0),
  monthlySIP: z.number().min(0).default(0),
  expectedReturn: z.number().min(1).max(30).default(12),
  linkedFunds: z.array(z.string()).default([]),
  isPrimary: z.boolean().default(false),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

    const { isPrimary, ...data } = parsed.data

    // Demote existing primary if this one is primary
    if (isPrimary) {
      await prisma.financialGoal.updateMany({
        where: { userId: session.user.id, isPrimary: true },
        data: { isPrimary: false },
      })
    }

    const goal = await prisma.financialGoal.create({
      data: { ...data, userId: session.user.id, isPrimary, targetDate: new Date(data.targetDate) },
    })

    // Create 25/50/75/100 milestones
    await prisma.goalMilestone.createMany({
      data: [25, 50, 75, 100].map((percent) => ({ goalId: goal.id, percent })),
    })

    // Initial snapshot
    const projection = calculateGoalProjection(goal)
    await prisma.goalSnapshot.create({
      data: {
        goalId: goal.id,
        corpus: goal.currentCorpus,
        onTrack: projection.onTrack,
        monthsAhead: projection.monthsAheadOrBehind,
      },
    })

    return NextResponse.json({ ...goal, projection }, { status: 201 })
  } catch (err) {
    console.error('[goals POST]', err)
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 })
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const goals = await prisma.financialGoal.findMany({
    where: { userId: session.user.id, isActive: true },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    include: { milestones: true },
  })

  const withProjections = goals.map((g) => ({
    ...g,
    projection: calculateGoalProjection(g),
  }))

  return NextResponse.json(withProjections)
}
