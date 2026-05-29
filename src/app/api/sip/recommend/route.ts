import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getFundCatalogue } from '@/lib/mfData'
import type { MutualFund } from '@/lib/mfData'
import { z } from 'zod'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const RecommendationSchema = z.object({
  schemeCode: z.string(),
  reasoning: z.string(),
  goalAlignment: z.string(),
  suggestedSipAmount: z.number(),
  priority: z.enum(['Primary', 'Secondary', 'Optional']),
})

const ResponseSchema = z.object({
  recommendations: z.array(RecommendationSchema).min(2).max(4),
  strategy: z.string(),
  disclaimer: z.string(),
})

export type SipAiRecommendation = z.infer<typeof RecommendationSchema> & {
  fund: MutualFund
}

export async function GET() {
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

  const catalogue = await getFundCatalogue()

  // Build a compact fund list for Claude context (keep token count reasonable)
  const fundSummary = catalogue.map((f) => ({
    code: f.schemeCode,
    name: f.schemeName,
    amc: f.amc,
    category: `${f.category} – ${f.subCategory}`,
    risk: f.riskLevel,
    return1y: f.return1y,
    return3y: f.return3y,
    return5y: f.return5y,
    expenseRatio: f.expenseRatio,
    minSip: f.minSipAmount,
  }))

  const riskLabel = profile.riskScore
    ? profile.riskScore <= 24 ? 'Conservative'
      : profile.riskScore <= 37 ? 'Moderate' : 'Aggressive'
    : profile.riskTolerance

  const sipBudget = profile.sipBudget ?? Math.round(profile.monthlyIncome * 0.1)
  const goals = profile.investmentGoals.join(', ') || 'Wealth creation'
  const horizon = profile.investmentHorizon ?? 'MEDIUM_TERM'
  const horizonLabel = horizon === 'SHORT_TERM' ? 'short-term (<1 yr)' : horizon === 'LONG_TERM' ? 'long-term (>5 yrs)' : 'medium-term (3–5 yrs)'

  const prompt = `You are a SEBI-registered mutual fund advisor assistant for Indian retail investors.

## Investor Profile
- Risk: ${riskLabel}
- Goals: ${goals}
- Monthly SIP Budget: ₹${sipBudget.toLocaleString('en-IN')}
- Investment Horizon: ${horizonLabel}
- Experience: ${profile.experience}
- Has Lump Sum: ${profile.hasLumpSum ? `Yes – ₹${(profile.lumpSumAmount ?? 0).toLocaleString('en-IN')}` : 'No'}

## Available Funds
${JSON.stringify(fundSummary, null, 2)}

## Task
Select 3 mutual funds from the list above that best match this investor's profile. Return ONLY a valid JSON object:
{
  "recommendations": [
    {
      "schemeCode": "<exact code from list>",
      "reasoning": "2–3 sentences explaining why this fund suits this specific investor",
      "goalAlignment": "Which of the investor's goals this serves",
      "suggestedSipAmount": <monthly INR amount, must be >= fund's minSip and <= total budget>,
      "priority": "Primary" | "Secondary" | "Optional"
    }
  ],
  "strategy": "2 sentence overall SIP strategy for this investor",
  "disclaimer": "One-sentence regulatory disclaimer"
}

Rules:
- Exactly 3 recommendations (one Primary, one Secondary, one Optional or Secondary)
- Total suggestedSipAmount across all 3 should not exceed ₹${sipBudget.toLocaleString('en-IN')}
- Match risk profile: ${riskLabel} investors should get ${riskLabel === 'Conservative' ? 'mostly Debt/Hybrid/Index funds' : riskLabel === 'Moderate' ? 'Large Cap / Flexi Cap / Index funds, max 1 mid-cap' : 'equity across market caps, can include mid/small cap'}
- Include an ELSS fund if goals mention "tax saving" or "tax"
- Do NOT include markdown. Return only the JSON object.`

  let result
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })
    const raw = (message.content[0] as { type: string; text: string }).text.trim()
    const jsonStr = raw.startsWith('```') ? raw.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '') : raw
    const parsed = JSON.parse(jsonStr)
    result = ResponseSchema.parse(parsed)
  } catch (err) {
    console.error('SIP recommendation error:', err)
    return NextResponse.json({ error: 'AI recommendation failed. Please try again.' }, { status: 500 })
  }

  // Hydrate each recommendation with full fund data
  const codeMap = new Map(catalogue.map((f) => [f.schemeCode, f]))
  const recommendations: SipAiRecommendation[] = result.recommendations
    .map((r) => {
      const fund = codeMap.get(r.schemeCode)
      if (!fund) return null
      return { ...r, fund }
    })
    .filter(Boolean) as SipAiRecommendation[]

  return NextResponse.json({
    recommendations,
    strategy: result.strategy,
    disclaimer: result.disclaimer,
    totalSip: recommendations.reduce((s, r) => s + r.suggestedSipAmount, 0),
  })
}
