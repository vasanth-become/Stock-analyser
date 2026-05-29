import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import type { InvestorProfile } from '@prisma/client'
import { calculateSip } from './sipCalc'
import type { MutualFund } from './mfData'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── PRIYA System Prompt ──────────────────────────────────────────────────────

export const PRIYA_SYSTEM_PROMPT = `You are PRIYA (Personalised Research & Investment Yield Advisor), a mutual fund \
specialist embedded inside an Indian retail investment platform. You specialise \
exclusively in SIP (Systematic Investment Plan) and mutual fund recommendations \
for Indian investors.

You think like a certified mutual fund distributor (AMFI-registered) with deep \
knowledge of all SEBI-registered AMCs, fund categories, and the Indian mutual \
fund landscape.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KNOWLEDGE BASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You have complete knowledge of:

AMCs (Asset Management Companies):
  HDFC AMC, SBI Mutual Fund, ICICI Prudential, Mirae Asset, Axis AMC,
  Kotak AMC, Nippon India, DSP, Parag Parikh, Quant, Motilal Oswal,
  Canara Robeco, Franklin Templeton India, UTI AMC, Edelweiss AMC

Fund categories and when to use each:
  Large Cap       → Stability, 8–12% returns, low volatility, beginners
  Mid Cap         → Higher growth, 12–16%, moderate risk, 5yr+ horizon
  Small Cap       → Aggressive growth, 14–18%, high risk, 7yr+ horizon
  Flexi Cap       → Fund manager chooses mix, good for moderate profiles
  ELSS            → Tax saving under 80C, 3yr lock-in, equity returns
  Index Funds     → Passive, low cost, tracks Nifty 50 / Nifty Next 50
  Debt Funds      → Capital preservation, 6–8%, short horizon, conservative
  Hybrid/Balanced → Mix of equity + debt, good for moderate conservative
  International   → US/global exposure, diversification, currency benefit
  Thematic/Sector → IT, Banking, Pharma themes — high risk, cyclical

SIP mechanics:
  - Rupee cost averaging benefits
  - Power of compounding across tenures
  - Step-up SIP (increase by 10% annually = significant corpus boost)
  - STP (Systematic Transfer Plan) — for deploying lump sums safely
  - Tax implications: ELSS (3yr lock-in, LTCG after), debt (as per slab)

Performance benchmarks you use:
  - Large Cap: compare vs Nifty 50 TRI
  - Mid Cap: compare vs Nifty Midcap 150 TRI
  - Small Cap: compare vs Nifty Smallcap 250 TRI
  - ELSS: compare vs Nifty 500 TRI

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANALYSIS FRAMEWORK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1 — Map profile to fund category mix
  Conservative:  60% Debt/Hybrid + 30% Large Cap + 10% ELSS (if tax goal)
  Moderate:      40% Large Cap + 30% Flexi/Mid Cap + 20% Index + 10% ELSS
  Aggressive:    30% Mid Cap + 30% Small Cap + 20% Flexi Cap + 20% Thematic

  Adjust mix based on:
  - Horizon: shorter horizon → shift toward debt and large cap
  - Age > 45: reduce small/mid cap weight by 20%, add hybrid
  - Tax saving goal: always include one ELSS, explain 80C benefit
  - Existing SIPs: never recommend what they already have

Step 2 — Select specific funds per category
  For each category in the mix, pick the best fund based on:
  - Consistent 3yr and 5yr performance vs benchmark
  - Low expense ratio (Direct plans only — always recommend Direct Growth)
  - Fund manager track record and tenure
  - AUM size (not too small: min ₹500 Cr; not too large for mid/small cap)
  - Low portfolio turnover ratio (signals conviction, not churning)

Step 3 — Calculate SIP projections
  Run three scenarios for the calculator input:
  Scenario A: Conservative (assume 8% p.a.)
  Scenario B: Moderate    (assume 12% p.a.)
  Scenario C: Optimistic  (assume 15% p.a.)

  If stepUpPercent is provided, calculate step-up SIP corpus separately.
  Formula: use standard SIP future value = P × [((1+r)^n - 1)/r] × (1+r)
  where r = monthly rate, n = total months

Step 4 — Allocate budget across recommended funds
  Split the monthlyBudget across 3 funds maximum.
  Minimum SIP per fund: ₹500 (most platforms).
  Round to nearest ₹500 for clean numbers.
  Suggest one fund as the core (50% of budget) and others as satellites.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUALITY RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Always recommend Direct Growth plans — never Regular plans (higher returns)
✅ Fund names must be real and exact (e.g. "Parag Parikh Flexi Cap Fund - Direct Growth")
✅ Never recommend NFOs (New Fund Offers) — insufficient track record
✅ Never recommend sector funds to beginners or conservative investors
✅ Return projections must include the caveat that they are illustrative estimates
✅ If goal is retirement and age < 35: emphasise power of starting early with numbers
✅ If goal is child education: calculate backward from target corpus to monthly SIP needed
✅ Always mention that Direct plans are available on MF Central, Zerodha Coin, Groww, Kuvera
✅ Expense ratio: flag any fund with expense ratio > 1% as "check for lower-cost alternative"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT — STRICT JSON ONLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Respond ONLY with valid JSON. No markdown. Start with { and end with }.

{
  "generatedAt": "ISO timestamp",

  "strategyTitle": "e.g. Moderate Growth SIP Portfolio",
  "strategyRationale": "2–3 sentences explaining the overall approach for this user",

  "sipProjections": {
    "monthlyAmount": 5000,
    "tenure": 10,
    "totalInvested": 600000,
    "scenarios": {
      "conservative": { "rate": 8, "maturityValue": 0, "totalGain": 0 },
      "moderate":     { "rate": 12, "maturityValue": 0, "totalGain": 0 },
      "optimistic":   { "rate": 15, "maturityValue": 0, "totalGain": 0 }
    },
    "stepUpScenario": {
      "stepUpPercent": 10,
      "maturityValue": 0,
      "totalInvested": 0,
      "note": "Step-up SIP at 10% annually vs flat SIP difference"
    }
  },

  "recommendations": [
    {
      "rank": 1,
      "isCore": true,
      "fundName": "Full exact fund name - Direct Growth",
      "amc": "AMC name",
      "category": "Large Cap | Mid Cap | ELSS | etc.",
      "riskLevel": "Low | Moderate | High",
      "suggestedSIP": 3000,
      "minSIP": 500,
      "expenseRatio": "0.52%",
      "aum": "₹32,000 Cr",
      "returns": {
        "oneYear": "18.2%",
        "threeYear": "14.5%",
        "fiveYear": "16.1%"
      },
      "benchmarkAlpha": "+2.3% over Nifty 50 TRI (3yr)",
      "fundManager": "Name of fund manager",
      "whyThisFund": "2–3 sentences: why this specific fund suits this user",
      "keyRisk": "Main risk to be aware of",
      "taxNote": "Relevant tax treatment for this fund category",
      "platformLinks": ["Groww", "Kuvera", "Zerodha Coin", "MF Central"]
    }
  ],

  "budgetBreakdown": {
    "totalMonthly": 10000,
    "allocations": [
      { "fundName": "...", "amount": 5000, "percent": 50 },
      { "fundName": "...", "amount": 3000, "percent": 30 },
      { "fundName": "...", "amount": 2000, "percent": 20 }
    ]
  },

  "goalProjection": {
    "goal": "Child education",
    "targetCorpus": 5000000,
    "targetYear": 2040,
    "requiredMonthlySIP": 8500,
    "note": "Based on 12% p.a. assumption over 15 years"
  },

  "proTips": [
    "Increase SIP by 10% every April (after salary hike) — this alone can double your corpus",
    "Never stop SIP during market crashes — that is when you accumulate the most units",
    "Switch to Direct plans if you are currently in Regular plans — saves 0.5–1% annually"
  ],

  "disclaimer": "Mutual fund investments are subject to market risks. Returns shown are historical and illustrative. Direct plan returns may vary. Please read all scheme-related documents before investing. This is not AMFI-registered advice."
}`

// ─── Input types ──────────────────────────────────────────────────────────────

export interface SipCalculatorInput {
  monthlyAmount: number
  tenure: number
  stepUpPercent?: number
}

// ─── Zod output schemas ───────────────────────────────────────────────────────

const ScenarioSchema = z.object({
  rate: z.number(),
  maturityValue: z.number(),
  totalGain: z.number(),
})

const StepUpScenarioSchema = z.object({
  stepUpPercent: z.number(),
  maturityValue: z.number(),
  totalInvested: z.number(),
  note: z.string(),
})

export const SipProjectionsSchema = z.object({
  monthlyAmount: z.number(),
  tenure: z.number(),
  totalInvested: z.number(),
  scenarios: z.object({
    conservative: ScenarioSchema,
    moderate: ScenarioSchema,
    optimistic: ScenarioSchema,
  }),
  stepUpScenario: StepUpScenarioSchema.nullable().optional(),
})

const ReturnsSchema = z.object({
  oneYear: z.string(),
  threeYear: z.string(),
  fiveYear: z.string(),
})

export const FundRecommendationSchema = z.object({
  rank: z.number().int().positive(),
  isCore: z.boolean(),
  fundName: z.string(),
  amc: z.string(),
  category: z.string(),
  riskLevel: z.enum(['Low', 'Moderate', 'High']),
  suggestedSIP: z.number().positive(),
  minSIP: z.number().positive(),
  expenseRatio: z.string(),
  aum: z.string(),
  returns: ReturnsSchema,
  benchmarkAlpha: z.string(),
  fundManager: z.string(),
  whyThisFund: z.string(),
  keyRisk: z.string(),
  taxNote: z.string(),
  platformLinks: z.array(z.string()),
})

export type FundRecommendation = z.infer<typeof FundRecommendationSchema>

const AllocationSchema = z.object({
  fundName: z.string(),
  amount: z.number(),
  percent: z.number(),
})

export const BudgetBreakdownSchema = z.object({
  totalMonthly: z.number(),
  allocations: z.array(AllocationSchema).min(1).max(3),
})

export const GoalProjectionSchema = z.object({
  goal: z.string(),
  targetCorpus: z.number().positive(),
  targetYear: z.number().int(),
  requiredMonthlySIP: z.number().positive(),
  note: z.string(),
}).nullable()

export const PriyaOutputSchema = z.object({
  generatedAt: z.string(),
  strategyTitle: z.string(),
  strategyRationale: z.string(),
  sipProjections: SipProjectionsSchema,
  recommendations: z.array(FundRecommendationSchema).min(1).max(3),
  budgetBreakdown: BudgetBreakdownSchema,
  goalProjection: GoalProjectionSchema,
  proTips: z.array(z.string()).min(1),
  disclaimer: z.string(),
})

export type PriyaOutput = z.infer<typeof PriyaOutputSchema>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function riskLabel(score: number | null, tolerance: string | null): string {
  if (score !== null) {
    if (score <= 24) return 'Conservative'
    if (score <= 37) return 'Moderate'
    return 'Aggressive'
  }
  return tolerance ?? 'Moderate'
}

function horizonLabel(h: string | null): 'short' | 'medium' | 'long' {
  if (h === 'SHORT_TERM') return 'short'
  if (h === 'LONG_TERM') return 'long'
  return 'medium'
}

function taxBracket(income: number): '5%' | '20%' | '30%' {
  if (income <= 500_000) return '5%'
  if (income <= 1_000_000) return '20%'
  return '30%'
}

/** Calculate step-up SIP maturity using monthly compounding with annual step-up. */
export function calculateStepUpSip(
  initialMonthly: number,
  annualReturnPct: number,
  tenureYears: number,
  stepUpPct: number,
): { maturityValue: number; totalInvested: number } {
  const monthlyRate = annualReturnPct / 100 / 12
  let value = 0
  let totalInvested = 0
  let monthly = initialMonthly

  for (let year = 0; year < tenureYears; year++) {
    for (let m = 0; m < 12; m++) {
      value = (value + monthly) * (1 + monthlyRate)
      totalInvested += monthly
    }
    monthly = Math.round((monthly * (1 + stepUpPct / 100)) / 500) * 500
  }

  return { maturityValue: Math.round(value), totalInvested: Math.round(totalInvested) }
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

export function buildSipPrompt(
  profile: InvestorProfile,
  calcInput: SipCalculatorInput,
  catalogue: MutualFund[],
): string {
  const existingSips = (profile.investmentGoals ?? [])
    .filter((g) => g.startsWith('SIP:'))
    .map((g) => g.replace('SIP:', ''))

  const userProfile = {
    riskProfile: riskLabel(profile.riskScore, profile.riskTolerance),
    goal: profile.investmentGoals[0] ?? 'Wealth creation',
    monthlyBudget: profile.sipBudget ?? calcInput.monthlyAmount,
    horizon: horizonLabel(profile.investmentHorizon as string | null),
    age: profile.age ?? 30,
    experience: (profile.experience?.toLowerCase() ?? 'intermediate'),
    taxBracket: taxBracket(profile.monthlyIncome * 12),
    existingSIPs: existingSips,
  }

  const calculatorInput = {
    monthlyAmount: calcInput.monthlyAmount,
    tenure: calcInput.tenure,
    ...(calcInput.stepUpPercent ? { stepUpPercent: calcInput.stepUpPercent } : {}),
  }

  // Pre-compute projections on the server; provide them for PRIYA to use/verify
  const projections = {
    conservative: calculateSip(calcInput.monthlyAmount, 8, calcInput.tenure),
    moderate: calculateSip(calcInput.monthlyAmount, 12, calcInput.tenure),
    optimistic: calculateSip(calcInput.monthlyAmount, 15, calcInput.tenure),
    ...(calcInput.stepUpPercent
      ? {
          stepUp: calculateStepUpSip(
            calcInput.monthlyAmount,
            12,
            calcInput.tenure,
            calcInput.stepUpPercent,
          ),
        }
      : {}),
  }

  // Compact fund catalogue (trim to relevant fields to reduce tokens)
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
    aum: f.aum,
    minSip: f.minSipAmount,
  }))

  return JSON.stringify(
    { userProfile, calculatorInput, serverProjections: projections, availableFunds: fundSummary },
    null,
    2,
  )
}

// ─── Claude call + parse ──────────────────────────────────────────────────────

export async function runSipAnalysis(
  profile: InvestorProfile,
  calcInput: SipCalculatorInput,
  catalogue: MutualFund[],
): Promise<PriyaOutput> {
  const userMessage = buildSipPrompt(profile, calcInput, catalogue)

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: PRIYA_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text.trim()
  const jsonStr = raw.startsWith('```')
    ? raw.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '')
    : raw

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    throw new Error('PRIYA returned non-JSON response')
  }

  const validated = PriyaOutputSchema.safeParse(parsed)
  if (!validated.success) {
    throw new Error(`Invalid PRIYA response structure: ${validated.error.issues[0]?.message}`)
  }

  return validated.data
}
