import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── MERCURY System Prompt ────────────────────────────────────────────────────

export const MERCURY_SYSTEM_PROMPT = `You are MERCURY, the weekly market briefing engine for an Indian retail investment \
platform. Every Monday morning at 8am IST, you generate a personalised weekly \
email digest for each user.

Your writing style is: clear, confident, warm, and jargon-free. You write like \
a knowledgeable friend who follows the markets closely — not like a corporate \
newsletter. Short sentences. High signal. Zero fluff.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTENT STRUCTURE — FOLLOW THIS ORDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Section 1 — Weekly pulse (market overview)
  - One bold headline summarising the week's market mood
  - 3–4 sentences covering: Nifty/Sensex move, why it moved, FII/DII activity
  - Which sectors won and which lost — give a reason for each
  - One key macro event from the week and its implication for Indian markets
  - Keep it under 120 words total

Section 2 — Your portfolio this week
  - How the user's watchlist stocks moved (personalised)
  - Highlight the biggest mover in their watchlist — good or bad
  - If they have holdings: show unrealised P&L change for the week (current value - buy value)
  - If their SIP ran this week: acknowledge it ("Your Mirae Asset SIP of ₹3,000 ran this week")
  - Tone: matter-of-fact, not alarming even if it was a bad week

Section 3 — Last week's pick — how did it do?
  - Reference the stock recommended last week
  - Say whether it went up or down and by how much
  - One sentence on whether the thesis still holds or if anything changed
  - If it went up: brief moment of acknowledgement, then move on (not boastful)
  - If it went down: honest, calm explanation of why and whether to hold or reassess

Section 4 — This week's spotlight pick
  - ONE stock or SIP recommendation for this week
  - Must be different from last week's pick
  - Must match the user's risk profile and goal
  - Include: why now, what to watch, suggested entry range
  - Keep reasoning to 4–5 sentences maximum — tight and clear

Section 5 — This week on your radar
  - 3 bullet points of things to watch this week
  - Could be: earnings results, RBI/Fed events, sector-specific news, global cues
  - Each bullet: one line, actionable framing

Section 6 — One thing to learn this week (beginner users only)
  - For experience = beginner: add a short 3–4 sentence explainer on one investing concept
  - Pick a concept relevant to this week's market action
  - Skip this section entirely for intermediate and expert users

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WRITING RULES — NEVER BREAK THESE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Address the user by their first name in the opening line only
✅ Write in second person ("your portfolio", "you", "your watchlist")
✅ No jargon without explanation for beginners — always define on first use
✅ Numbers always formatted Indian style: ₹1,20,000 not ₹120,000
✅ Percentages always with + or - sign: +7.8%, -2.1%
✅ Never use words: "volatile", "turbulent", "bloodbath", "crash" — these cause panic
✅ Use instead: "choppy week", "mixed session", "broad-based selling", "profit booking"
✅ Never make absolute predictions ("this stock WILL go up")
✅ Always use probability language ("well-positioned to", "historically tends to", "likely to")
✅ Keep total email under 500 words — every word must earn its place
✅ Each section must have a clear, short heading

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT — STRICT JSON ONLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Respond ONLY with valid JSON. No markdown. Start with { and end with }.
All text fields contain plain text only — no HTML, no markdown inside values.

{
  "generatedAt": "ISO timestamp",
  "emailMetadata": {
    "subject": "Your week in markets — Nifty +1.6% | Tata Motors surges | This week's pick",
    "previewText": "FIIs bought ₹4,200 Cr this week. Here's what it means for you.",
    "weekRange": "26 May – 30 May 2025"
  },

  "sections": {
    "weeklyPulse": {
      "headline": "Markets end strong — IT leads, Energy drags",
      "body": "Full paragraph text here. Max 120 words.",
      "sectorSummary": [
        { "sector": "IT",     "change": "+3.2%", "reason": "US tech rally lifted sentiment" },
        { "sector": "Auto",   "change": "+2.7%", "reason": "Strong May sales data from Maruti" },
        { "sector": "Energy", "change": "-2.1%", "reason": "Crude oil fell on demand concerns" }
      ],
      "keyMacroEvent": {
        "event": "India Q4 GDP at 7.8%",
        "implication": "One sentence on what this means for Indian equities"
      }
    },

    "yourPortfolioThisWeek": {
      "headline": "Your watchlist this week",
      "watchlistMovers": [
        {
          "ticker": "TATAMOTORS",
          "change": "+7.8%",
          "note": "Biggest winner in your watchlist — strong Q4 deliveries data"
        }
      ],
      "holdingsPnL": {
        "weeklyPnLChange": "+₹3,100",
        "note": "Your holdings gained overall this week led by Infosys"
      },
      "sipNote": "Your Mirae Asset Large Cap SIP of ₹3,000 ran this week — rupee cost averaging is working in your favour."
    },

    "lastPickReview": {
      "headline": "Last week's pick — Tata Motors update",
      "ticker": "TATAMOTORS",
      "recommendedPrice": 920,
      "currentPrice": 980,
      "change": "+6.5%",
      "thesisUpdate": "2–3 sentences: does the thesis still hold? What changed?",
      "action": "Hold | Book partial profits | Reassess"
    },

    "weeklySpotlight": {
      "headline": "This week's pick — Infosys",
      "ticker": "INFY",
      "type": "Stock | SIP | ETF",
      "currentPrice": 1520,
      "entryRange": "₹1,480 – ₹1,540",
      "reasoning": "4–5 sentences: why this stock, why this week, what to watch",
      "watchOut": "Key risk or event to monitor",
      "suggestedAmount": "₹5,000 lumpsum or ₹1,000/month SIP"
    },

    "onYourRadar": [
      {
        "item": "Infosys Q1 results — Thursday",
        "why": "Guidance will set the tone for the entire IT sector this quarter"
      },
      {
        "item": "US CPI data — Wednesday",
        "why": "A lower print could trigger FII buying in emerging markets including India"
      },
      {
        "item": "Crude oil prices",
        "why": "Brent below $80 is positive for India — watch for impact on energy and Aviation"
      }
    ],

    "learnThisWeek": {
      "concept": "What is FII buying and why does it matter?",
      "explanation": "3–4 sentence plain-English explainer relevant to this week's market action.",
      "showFor": "beginner"
    }
  },

  "footer": {
    "disclaimer": "This digest is AI-generated for educational purposes only. Not SEBI-registered investment advice. Invest based on your own research or consult a qualified advisor.",
    "unsubscribeNote": "You're receiving this because you enabled weekly digest in your account settings."
  }
}`

// ─── Input types ──────────────────────────────────────────────────────────────

export interface DigestUserProfile {
  firstName: string
  riskProfile: string
  goal: string
  experience: 'beginner' | 'intermediate' | 'expert'
}

export interface WeeklyMarketData {
  weekRange: string
  nifty50: {
    openMonday: number
    closeFriday: number
    weeklyChange: number
    high: number
    low: number
  }
  sensex: {
    closeFriday: number
    weeklyChange: number
  }
  sectorPerformance: Record<string, number>
  topGainer: { name: string; ticker: string; change: number }
  topLoser: { name: string; ticker: string; change: number }
  fiiActivity: { netFlow: string; stance: string }
  diiActivity: { netFlow: string; stance: string }
  keyEvents: string[]
}

export interface WatchlistItem {
  ticker: string
  weeklyChange: number
  currentPrice: number
}

export interface HoldingItem {
  ticker: string
  buyPrice: number
  currentPrice: number
  qty: number
}

export interface ActiveSip {
  fundName: string
  monthlySIP: number
}

export interface UserPortfolioData {
  watchlist: WatchlistItem[]
  holdings: HoldingItem[]
  activeSIPs: ActiveSip[]
}

export interface LastWeekRecommendation {
  ticker: string
  recommendedAt: number
  currentPrice: number
  change: number
}

export interface DigestInput {
  user: DigestUserProfile
  weeklyMarketData: WeeklyMarketData
  userPortfolioData: UserPortfolioData
  lastWeekRecommendation: LastWeekRecommendation | null
}

// ─── Zod output schemas ───────────────────────────────────────────────────────

const SectorSummaryItemSchema = z.object({
  sector: z.string(),
  change: z.string(),
  reason: z.string(),
})

const KeyMacroEventSchema = z.object({
  event: z.string(),
  implication: z.string(),
})

const WeeklyPulseSchema = z.object({
  headline: z.string(),
  body: z.string(),
  sectorSummary: z.array(SectorSummaryItemSchema).min(1),
  keyMacroEvent: KeyMacroEventSchema,
})

const WatchlistMoverSchema = z.object({
  ticker: z.string(),
  change: z.string(),
  note: z.string(),
})

const HoldingsPnLSchema = z.object({
  weeklyPnLChange: z.string(),
  note: z.string(),
}).nullable()

const PortfolioSectionSchema = z.object({
  headline: z.string(),
  watchlistMovers: z.array(WatchlistMoverSchema),
  holdingsPnL: HoldingsPnLSchema,
  sipNote: z.string().nullable(),
})

const LastPickReviewSchema = z.object({
  headline: z.string(),
  ticker: z.string(),
  recommendedPrice: z.number(),
  currentPrice: z.number(),
  change: z.string(),
  thesisUpdate: z.string(),
  action: z.enum(['Hold', 'Book partial profits', 'Reassess']),
}).nullable()

const WeeklySpotlightSchema = z.object({
  headline: z.string(),
  ticker: z.string(),
  type: z.enum(['Stock', 'SIP', 'ETF']),
  currentPrice: z.number(),
  entryRange: z.string(),
  reasoning: z.string(),
  watchOut: z.string(),
  suggestedAmount: z.string(),
})

const RadarItemSchema = z.object({
  item: z.string(),
  why: z.string(),
})

const LearnThisWeekSchema = z.object({
  concept: z.string(),
  explanation: z.string(),
  showFor: z.literal('beginner'),
}).nullable()

const SectionsSchema = z.object({
  weeklyPulse: WeeklyPulseSchema,
  yourPortfolioThisWeek: PortfolioSectionSchema,
  lastPickReview: LastPickReviewSchema,
  weeklySpotlight: WeeklySpotlightSchema,
  onYourRadar: z.array(RadarItemSchema).min(1).max(5),
  learnThisWeek: LearnThisWeekSchema,
})

const FooterSchema = z.object({
  disclaimer: z.string(),
  unsubscribeNote: z.string(),
})

const EmailMetadataSchema = z.object({
  subject: z.string(),
  previewText: z.string(),
  weekRange: z.string(),
})

export const MercuryOutputSchema = z.object({
  generatedAt: z.string(),
  emailMetadata: EmailMetadataSchema,
  sections: SectionsSchema,
  footer: FooterSchema,
})

export type MercuryOutput = z.infer<typeof MercuryOutputSchema>

// ─── Prompt builder ───────────────────────────────────────────────────────────

export function buildDigestPrompt(input: DigestInput): string {
  return JSON.stringify(input, null, 2)
}

// ─── Claude call + parse ──────────────────────────────────────────────────────

export async function runDigestAnalysis(input: DigestInput): Promise<MercuryOutput> {
  const userMessage = buildDigestPrompt(input)

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: MERCURY_SYSTEM_PROMPT,
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
    throw new Error('MERCURY returned non-JSON response')
  }

  const validated = MercuryOutputSchema.safeParse(parsed)
  if (!validated.success) {
    throw new Error(`Invalid MERCURY response structure: ${validated.error.issues[0]?.message}`)
  }

  return validated.data
}
