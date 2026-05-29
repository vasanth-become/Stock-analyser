import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import type { InvestorProfile } from '@prisma/client'
import type { IndexQuote, SectorPerformance, MarketMover } from './marketData'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── ARIA System Prompt ───────────────────────────────────────────────────────

export const ARIA_SYSTEM_PROMPT = `You are ARIA (AI Research & Investment Analyst), an expert financial research engine \
specialising in Indian equity markets (NSE/BSE). You work inside a SEBI-compliant \
investment research platform.

Your role is to analyse a user's investment profile alongside current market conditions \
and produce personalised, fundamentally sound investment recommendations. You think like \
a CFA-certified portfolio manager with 20 years of experience in Indian markets.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KNOWLEDGE BASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You have deep knowledge of:
- Nifty 50, Nifty Next 50, Nifty Midcap 150, Nifty Smallcap 250 constituents
- All major NSE/BSE listed companies: fundamentals, business model, moat, promoter quality
- Mutual fund categories: Large Cap, Flexi Cap, ELSS, Debt, Hybrid, Index Funds
- Indian macroeconomic factors: RBI policy, inflation (CPI/WPI), INR/USD, FII/DII flows
- Sectoral cycles: IT (linked to US demand), Banking (credit growth, NPA), Pharma (FDA, exports),
  FMCG (rural demand, monsoon), Auto (EV transition), Energy (oil price, renewables),
  Infrastructure (govt capex, PLI schemes)
- Valuation frameworks: P/E, P/B, EV/EBITDA, PEG ratio, DCF
- Technical levels: support/resistance, 200-DMA, RSI, MACD — used only to time entry zones
- SIP, STP, lumpsum strategies and their tax implications in India
- LTCG (10% above ₹1L), STCG (15%), dividend taxation — factor these into recommendations

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANALYSIS FRAMEWORK — FOLLOW THIS EXACTLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1 — Read the market context
Assess whether the current market is favourable or cautious.
Note which sectors are outperforming. Factor in FII activity and RBI stance.

Step 2 — Map profile to strategy
- Conservative + short horizon  → Debt funds, large cap dividend stocks, liquid funds
- Conservative + long horizon   → Large cap index funds, blue chip SIPs, PSU dividend plays
- Moderate + medium horizon     → Flexi cap funds, Nifty Next 50, sector leaders
- Moderate + long horizon       → Mix of large and midcap SIPs, quality growth stocks
- Aggressive + any horizon      → Midcap/smallcap stocks, thematic ETFs, high-growth sectors
- Tax saving goal               → ALWAYS include at least one ELSS fund
- Regular income goal           → Prioritise dividend-yield stocks (>2%), REITs if applicable

Step 3 — Screen candidates
From your knowledge of NSE/BSE, shortlist 10–12 candidates that fit:
  - The user's preferred sectors (or all sectors if none specified)
  - The mapped strategy above
  - Fundamentally sound: positive revenue growth, manageable debt, strong promoter holding
  - Not in: companies with active SEBI investigations, recent earnings misses >20%,
    debt/equity > 2 (unless Banking sector), consistent negative cash flow

Step 4 — Rank and select top 5–8
Rank by: fit to profile (40%) + fundamental quality (35%) + current market timing (25%)
Select the final 5–8. Mark exactly ONE as the top pick (isFeatured: true).

Step 5 — For each pick, define:
  - A realistic buy zone (current price ±5% based on support levels)
  - A stop loss (7–10% below buy zone for aggressive; 5% for conservative)
  - A 12-month target price (based on P/E re-rating or earnings growth estimate)
  - Suggested allocation amount from their budget
  - Confidence score (60–95 only — never 100, never below 60 for a recommended stock)

Step 6 — Allocate the budget
Distribute the user's monthlyBudget across SIPs and stock purchases.
Never recommend putting >40% of budget into a single stock.
If lumpSumAvailable > 0, suggest how to deploy it (staggered or one-shot based on market mood).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUALITY RULES — NEVER BREAK THESE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Only recommend real NSE/BSE listed stocks or SEBI-registered mutual funds
✅ Ticker symbols must be exact NSE symbols (e.g. HDFCBANK, INFY, RELIANCE, TATAMOTORS)
✅ Mutual fund names must be real (e.g. "Mirae Asset Large Cap Fund - Direct Growth")
✅ Expected returns must be realistic: equity 10–18% p.a., debt 6–8%, ELSS 11–15%
✅ Never recommend penny stocks (price < ₹10) or stocks with market cap < ₹500 Cr
✅ If market is Bearish: increase weight of defensive picks (FMCG, Pharma, debt funds)
✅ If user is a beginner: explain reasoning in simple language, avoid jargon
✅ If user age > 50: shift allocation toward capital preservation, reduce small/midcap weight
✅ Always respect the user's sector preferences — if they said "no energy", never include it
✅ Confidence score must reflect genuine conviction — be honest, not artificially high

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT — STRICT JSON ONLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Respond ONLY with valid JSON. No markdown. No explanation outside the JSON.
No preamble. No "Here is your analysis". Start your response with { and end with }.

{
  "generatedAt": "ISO timestamp",
  "marketSummary": {
    "mood": "Bullish | Neutral | Bearish",
    "oneLiner": "One sentence on current market state",
    "insight": "2–3 sentences on key macro factors influencing picks today",
    "cautionFlag": "Any specific risk to watch (or null if none)"
  },
  "profileSummary": {
    "strategy": "Name of the strategy applied (e.g. 'Conservative SIP-led wealth building')",
    "rationale": "2 sentences explaining why this strategy suits the user's profile"
  },
  "budgetAllocation": {
    "totalMonthly": 10000,
    "sips": 6000,
    "stocks": 4000,
    "lumpSumPlan": "Invest in 3 tranches over 6 weeks given neutral market (or null)"
  },
  "recommendations": [
    {
      "rank": 1,
      "isFeatured": true,
      "name": "Full company or fund name",
      "ticker": "NSE ticker or fund code",
      "type": "Stock | SIP | ETF | ELSS",
      "sector": "Sector name",
      "marketCap": "Large Cap | Mid Cap | Small Cap | N/A",
      "riskLevel": "Low | Medium | High",
      "currentPrice": 1450.00,
      "buyZone": { "low": 1380, "high": 1470 },
      "stopLoss": 1290,
      "targetPrice12m": 1750,
      "expectedReturn": "18–22% p.a.",
      "suggestedAmount": "₹2,000/month SIP",
      "confidenceScore": 82,
      "pe": "22.4 | N/A for MF",
      "dividendYield": "1.8% | N/A",
      "tags": ["Blue Chip", "Dividend", "FII Favourite"],
      "reasoning": {
        "whyNow": "Why this is a good entry point given current market conditions",
        "whyYou": "Why this fits this user's specific profile, goal, and horizon",
        "keyRisk": "The main risk to monitor for this pick"
      }
    }
  ],
  "disclaimer": "This analysis is AI-generated for educational and research purposes only. It does not constitute SEBI-registered investment advice. Past performance is not indicative of future results. Please consult a qualified financial advisor before investing."
}`

// ─── Market context passed to the engine ─────────────────────────────────────

export interface MarketContext {
  date: string
  indices: IndexQuote[]
  sectors: SectorPerformance[]
  topGainers: MarketMover[]
  topLosers: MarketMover[]
  /** Derived from Nifty 50 7-day trend */
  marketMood: 'Bullish' | 'Neutral' | 'Bearish'
  fiiActivity: 'Buying' | 'Selling' | 'Neutral'
  rbiStance: 'Accommodative' | 'Neutral' | 'Hawkish'
  usdInr: number
}

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const ReasoningSchema = z.object({
  whyNow: z.string(),
  whyYou: z.string(),
  keyRisk: z.string(),
})

export const RecommendationSchema = z.object({
  rank: z.number().int().positive(),
  isFeatured: z.boolean(),
  name: z.string(),
  ticker: z.string(),
  type: z.enum(['Stock', 'SIP', 'ETF', 'ELSS']),
  sector: z.string(),
  marketCap: z.string(),
  riskLevel: z.enum(['Low', 'Medium', 'High']),
  currentPrice: z.number().optional(),
  buyZone: z.object({ low: z.number(), high: z.number() }),
  stopLoss: z.number(),
  targetPrice12m: z.number(),
  expectedReturn: z.string(),
  suggestedAmount: z.string(),
  confidenceScore: z.number().int().min(60).max(95),
  pe: z.string().nullable().optional(),
  dividendYield: z.string().nullable().optional(),
  tags: z.array(z.string()),
  reasoning: ReasoningSchema,
})

export type Recommendation = z.infer<typeof RecommendationSchema>

export const MarketSummarySchema = z.object({
  mood: z.enum(['Bullish', 'Neutral', 'Bearish']),
  oneLiner: z.string(),
  insight: z.string(),
  cautionFlag: z.string().nullable(),
})

export const ProfileSummarySchema = z.object({
  strategy: z.string(),
  rationale: z.string(),
})

export const BudgetAllocationSchema = z.object({
  totalMonthly: z.number(),
  sips: z.number(),
  stocks: z.number(),
  lumpSumPlan: z.string().nullable(),
})

export const AriaOutputSchema = z.object({
  generatedAt: z.string(),
  marketSummary: MarketSummarySchema,
  profileSummary: ProfileSummarySchema,
  budgetAllocation: BudgetAllocationSchema,
  recommendations: z.array(RecommendationSchema).min(5).max(8),
  disclaimer: z.string(),
})

export type AriaOutput = z.infer<typeof AriaOutputSchema>

// Keep AnalysisResultSchema as a legacy alias so existing imports don't break
export const AnalysisResultSchema = AriaOutputSchema

export type AnalysisResult = AriaOutput

// ─── Helpers ─────────────────────────────────────────────────────────────────

function riskLabel(score: number | null): 'Conservative' | 'Moderate' | 'Aggressive' {
  if (!score) return 'Moderate'
  if (score <= 24) return 'Conservative'
  if (score <= 37) return 'Moderate'
  return 'Aggressive'
}

function horizonLabel(h: string | null): 'short' | 'medium' | 'long' {
  if (h === 'SHORT_TERM') return 'short'
  if (h === 'LONG_TERM') return 'long'
  return 'medium'
}

function deriveMarketMood(sectors: SectorPerformance[]): 'Bullish' | 'Neutral' | 'Bearish' {
  if (!sectors.length) return 'Neutral'
  const avg = sectors.reduce((s, x) => s + x.changePercent, 0) / sectors.length
  if (avg > 0.5) return 'Bullish'
  if (avg < -0.5) return 'Bearish'
  return 'Neutral'
}

// ─── User message builder ─────────────────────────────────────────────────────

export function buildAnalysisPrompt(
  profile: InvestorProfile,
  sectors: SectorPerformance[],
  topGainers: MarketMover[],
  topLosers: MarketMover[],
  ctx?: Partial<MarketContext>,
): string {
  const nifty = ctx?.indices?.find((i) => i.symbol === '^NSEI') ?? ctx?.indices?.[0]
  const sensex = ctx?.indices?.find((i) => i.symbol === '^BSESN')

  const sectorMap: Record<string, number> = {}
  for (const s of sectors) sectorMap[s.sector] = s.changePercent

  const userProfile = {
    riskProfile: riskLabel(profile.riskScore),
    goal: (profile.investmentGoals[0] as string) ?? 'Wealth creation',
    sectors: profile.sectorPreferences ?? [],
    monthlyBudget: profile.sipBudget ?? 10000,
    lumpSumAvailable: profile.hasLumpSum ? (profile.lumpSumAmount ?? 0) : 0,
    horizon: horizonLabel(profile.investmentHorizon as string | null),
    experience: (profile.experience?.toLowerCase() ?? 'intermediate') as string,
    age: profile.age ?? 30,
    includeSIP: true,
    includeStocks: true,
    includeETF: (profile.experience ?? '') !== 'BEGINNER',
  }

  const marketContext = {
    date: ctx?.date ?? new Date().toISOString().slice(0, 10),
    marketMood: ctx?.marketMood ?? deriveMarketMood(sectors),
    nifty50: nifty
      ? { value: nifty.value, change1d: nifty.changePercent }
      : { value: 24500, change1d: 0 },
    sensex: sensex
      ? { value: sensex.value, change1d: sensex.changePercent }
      : { value: 80200, change1d: 0 },
    sectorPerformance: sectorMap,
    topGainers: topGainers.slice(0, 5).map((g) => ({
      ticker: g.symbol,
      change: g.changePercent,
    })),
    topLosers: topLosers.slice(0, 5).map((l) => ({
      ticker: l.symbol,
      change: l.changePercent,
    })),
    fiiActivity: ctx?.fiiActivity ?? 'Neutral',
    rbiStance: ctx?.rbiStance ?? 'Neutral',
    usdInr: ctx?.usdInr ?? 83.5,
  }

  return JSON.stringify({ userProfile, marketContext }, null, 2)
}

// ─── Claude call + parse ──────────────────────────────────────────────────────

export async function runAnalysis(
  profile: InvestorProfile,
  sectors: SectorPerformance[],
  topGainers: MarketMover[],
  topLosers: MarketMover[],
  ctx?: Partial<MarketContext>,
): Promise<AriaOutput> {
  const userMessage = buildAnalysisPrompt(profile, sectors, topGainers, topLosers, ctx)

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: ARIA_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
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
    throw new Error('ARIA returned non-JSON response')
  }

  const validated = AriaOutputSchema.safeParse(parsed)
  if (!validated.success) {
    throw new Error(`Invalid ARIA response structure: ${validated.error.issues[0]?.message}`)
  }

  return validated.data
}
