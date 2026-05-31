import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateGoalProjection, generateGoalInsight } from '@/lib/goalClock/goalCalculator'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const goal = await prisma.financialGoal.findFirst({
    where: { id: params.id, userId: session.user.id, isActive: true },
  })
  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const projection = calculateGoalProjection(goal)
  const insight = await generateGoalInsight(goal, projection)
  return NextResponse.json({ projection, insight })
}
