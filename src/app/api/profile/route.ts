import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  // Step 1 – risk quiz
  riskScore: z.number().int().min(10).max(50),
  riskTolerance: z.enum(['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE']),
  // Step 2 – goals
  investmentGoals: z.array(z.string()).min(1, 'Select at least one goal'),
  // Step 3 – sectors
  sectorPreferences: z.array(z.string()).min(1, 'Select at least one sector'),
  // Step 4 – SIP & lump sum
  sipBudget: z.number().nonnegative().optional(),
  hasLumpSum: z.boolean(),
  lumpSumAmount: z.number().positive().optional(),
  // Step 5 – horizon
  investmentHorizon: z.enum(['SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM']),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await prisma.investorProfile.findUnique({
    where: { userId: session.user.id },
  })

  return NextResponse.json(profile)
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const data = parsed.data

    const profile = await prisma.investorProfile.update({
      where: { userId: session.user.id },
      data: {
        riskScore: data.riskScore,
        riskTolerance: data.riskTolerance,
        investmentGoals: data.investmentGoals,
        sectorPreferences: data.sectorPreferences,
        sipBudget: data.sipBudget ?? null,
        hasLumpSum: data.hasLumpSum,
        lumpSumAmount: data.hasLumpSum ? (data.lumpSumAmount ?? null) : null,
        investmentHorizon: data.investmentHorizon,
      },
    })

    return NextResponse.json(profile)
  } catch (error) {
    console.error('[profile PUT]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
