import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import type { InvestorProfile } from '@prisma/client'
import type { SectorPerformance, MarketMover } from './marketData'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Types ────────────────────────────────────────────────────────────────────

export const RecommendationSchema = z.object({
  name: z.string(),
  ticker: z.string(),
  type: z.enum(['Stock', 'SIP', 'ETF', 'ELSS']),
  sector: z.string(),
  riskLevel: z.enum(['Low', 'Moderate', 'High']),
  expectedReturn: z.string(),
  suggestedAmount: z.number(),
  pe: z.number().nullable(),
  marketCap: z.string(),
  confidenceScore: z.number().min(0).max(100),
  reasoning: z.string(),
  buyZone: z.object({ low: z.number(), high: z.number() }),
  stopLoss: z.number(),
  targetPrice: z.number(),
  tags: z.array(z.string()),
  currentPrice: z.number().optional(),
})

export type Recommendation = z.infer<typeof RecommendationSchema>

export const AnalysisResultSchema = z.object({
  recommendations: z.array(RecommendationSchema).min(5).max(8),
  summary: z.string(),
  marketOutlook: z.string(),
})

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>

// ─── Prompt builder ───────────────────────────────────────────────────────────

function riskLabel(score: number | null): string {
  if (!score) return 'Moderate'
  if (score <= 24) return 'Conservative'
  if (score <= 37) return 'Moderate'
  return 'Aggressive'
}

function horizonLabel(h: string | null): string {
  if (!h) return 'Medium-term (3–5 years)'
  if (h === 'SHORT_TERM') return 'Short-term (< 1 year)'
  if (h === 'LONG_TERM') return 'Long-term (> 5 years)'
  return 'Medium-term (3–5 years)'
}

export function buildAnalysisPrompt(
  profile: InvestorProfile,
  sectors: SectorPerformance[],
  topGainers: MarketMover[],
  topLosers: MarketMover[],
): string {
  const risk = riskLabel(profile.riskScore)
  const horizon = horizonLabel(profile.investmentHorizon as string | null)
  const goals = profile.investmentGoals.join(', ') || 'Wealth creation'
  const prefs = profile.sectorPreferences.join(', ') || 'Diversified'
  const sipStr = profile.sipBudget ? `₹${profile.sipBudget.toLocaleString('en-IN')}/month SIP` : 'No fixed SIP'
  const lumpStr = profile.hasLumpSum && profile.lumpSumAmount
    ? `₹${profile.lumpSumAmount.toLocaleString('en-IN')} lump sum available`
    : 'No lump sum'

  const topSectors = sectors
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 6)
    .map((s) => `${s.sector}: ${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(2)}%`)
    .join(', ')

  const gainersStr = topGainers
    .slice(0, 5)
    .map((g) => `${g.symbol} +${g.changePercent.toFixed(1)}%`)
    .join(', ')

  const losersStr = topLosers
    .slice(0, 5)
    .map((l) => `${l.symbol} ${l.changePercent.toFixed(1)}%`)
    .join(', ')

  return `You are a SEBI-registered investment advisor assistant specialising in Indian equity markets (NSE/BSE). Generate a personalised investment portfolio analysis for the investor profile below.

## Investor Profile
- Risk Tolerance: ${risk} (score: ${profile.riskScore ?? 'not assessed'}/50)
- Investment Horizon: ${horizon}
- Investment Goals: ${goals}
- Preferred Sectors: ${prefs}
- Monthly Income: ₹${profile.monthlyIncome.toLocaleString('en-IN')}
- ${sipStr}
- ${lumpStr}
- Experience Level: ${profile.experience}

## Live Market Context (today)
- Sector Performance: ${topSectors}
- Top Gainers: ${gainersStr}
- Top Losers: ${losersStr}

## Task
Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "recommendations": [
    {
      "name": "Full company or fund name",
      "ticker": "NSE/BSE ticker symbol (e.g. RELIANCE, NIFTY50)",
      "type": "Stock" | "SIP" | "ETF" | "ELSS",
      "sector": "Sector name",
      "riskLevel": "Low" | "Moderate" | "High",
      "expectedReturn": "e.g. 12–18% p.a.",
      "suggestedAmount": <number in INR, monthly for SIP or one-time for Stock/ETF>,
      "pe": <number or null>,
      "marketCap": "e.g. Large Cap / Mid Cap / Small Cap",
      "confidenceScore": <integer 0–100>,
      "reasoning": "3–4 sentence explanation personalised to this investor's profile, goals and risk tolerance",
      "buyZone": { "low": <price>, "high": <price> },
      "stopLoss": <price>,
      "targetPrice": <price>,
      "tags": ["tag1", "tag2"]
    }
  ],
  "summary": "2–3 sentence overall portfolio strategy for this investor",
  "marketOutlook": "1–2 sentence current Indian market outlook"
}

Rules:
- Return 5–8 recommendations, mix of Stock, SIP, ETF types appropriate to ${risk} risk profile
- Align suggestions with the investor's stated sector preferences and goals
- For ELSS: include if goals mention tax saving
- confidenceScore reflects your conviction given current market conditions
- suggestedAmount must be realistic given the investor's income of ₹${profile.monthlyIncome.toLocaleString('en-IN')}
- All prices in INR; use realistic current approximate valuations for well-known Indian stocks/funds
- tags: short labels like "Dividend", "Blue Chip", "High Growth", "Tax Saver", "Defensive", etc.
- Do NOT wrap the JSON in markdown code blocks`
}

// ─── Claude call + parse ──────────────────────────────────────────────────────

export async function runAnalysis(
  profile: InvestorProfile,
  sectors: SectorPerformance[],
  topGainers: MarketMover[],
  topLosers: MarketMover[],
): Promise<AnalysisResult> {
  const prompt = buildAnalysisPrompt(profile, sectors, topGainers, topLosers)

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text.trim()

  // Strip accidental markdown code fences
  const jsonStr = raw.startsWith('```')
    ? raw.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '')
    : raw

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    throw new Error('Claude returned non-JSON response')
  }

  const validated = AnalysisResultSchema.safeParse(parsed)
  if (!validated.success) {
    throw new Error(`Invalid analysis structure: ${validated.error.issues[0]?.message}`)
  }

  return validated.data
}
