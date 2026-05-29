import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getFundCatalogue } from '@/lib/mfData'
import { runSipAnalysis, type SipCalculatorInput } from '@/lib/sipEngine'

export { type FundRecommendation as SipAiRecommendation } from '@/lib/sipEngine'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await prisma.investorProfile.findUnique({
    where: { userId: session.user.id },
  })
  if (!profile) {
    return NextResponse.json({ error: 'Complete your investor profile first.' }, { status: 400 })
  }

  // Accept optional calculator overrides via query params
  const { searchParams } = new URL(req.url)
  const sipBudget = profile.sipBudget ?? Math.round(profile.monthlyIncome * 0.1)

  const calcInput: SipCalculatorInput = {
    monthlyAmount: Number(searchParams.get('amount') ?? sipBudget),
    tenure: Number(searchParams.get('tenure') ?? 10),
    ...(searchParams.has('stepUp')
      ? { stepUpPercent: Number(searchParams.get('stepUp')) }
      : {}),
  }

  const catalogue = await getFundCatalogue()

  let result
  try {
    result = await runSipAnalysis(profile, calcInput, catalogue)
  } catch (err) {
    console.error('PRIYA SIP analysis error:', err)
    return NextResponse.json({ error: 'AI recommendation failed. Please try again.' }, { status: 500 })
  }

  return NextResponse.json(result)
}
