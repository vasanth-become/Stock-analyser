import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(50),
  age: z.number().int().min(18, 'Must be at least 18').max(100),
  monthlyIncome: z.number().positive('Monthly income must be positive'),
  experience: z.enum(['BEGINNER', 'INTERMEDIATE', 'EXPERT']),
  riskTolerance: z.enum(['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE']).default('MODERATE'),
  investmentGoals: z.array(z.string()).min(1, 'Select at least one goal'),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 })
    }

    const { displayName, age, monthlyIncome, experience, riskTolerance, investmentGoals } = parsed.data

    await prisma.$transaction([
      prisma.investorProfile.upsert({
        where: { userId: session.user.id },
        create: { userId: session.user.id, displayName, age, monthlyIncome, experience, riskTolerance, investmentGoals },
        update: { displayName, age, monthlyIncome, experience, riskTolerance, investmentGoals },
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: { onboarded: true },
      }),
    ])

    return NextResponse.json({ message: 'Profile saved' })
  } catch (error) {
    console.error('[onboarding]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
