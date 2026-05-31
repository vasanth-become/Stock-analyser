import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface ThesisGenerationInput {
  userId: string
  ticker: string
  companyName: string
  sector: string
  fundamentals: Record<string, unknown>
  riskProfile?: string
  investmentHorizon?: string
}

interface GeneratedThesis {
  originalThesis: string
  keyMetrics: {
    pe: number | null
    revenueGrowth: number | null
    debtEquity: number | null
    promoterHolding: number | null
    epsGrowth: number | null
  }
  watchPoints: string[]
  bullCase: string
  bearCase: string
  thesisStrength: number
}

export async function generateAndSaveThesis(input: ThesisGenerationInput): Promise<string> {
  const { userId, ticker, companyName, sector, fundamentals, riskProfile, investmentHorizon } = input

  const prompt = `You are ARIA's Thesis Generator. Create a structured investment thesis for this stock.

Stock: ${ticker} — ${companyName}
Sector: ${sector}
Risk profile: ${riskProfile ?? 'moderate'}
Investment horizon: ${investmentHorizon ?? 'medium term (1–3 years)'}

Current fundamentals:
${JSON.stringify(fundamentals, null, 2)}

Generate a thesis in this exact JSON format (no markdown, pure JSON):
{
  "originalThesis": "3-4 sentences: the core research case. Why is this company worth watching? What is the growth driver? What makes the valuation reasonable or attractive?",
  "keyMetrics": {
    "pe": current P/E ratio as number or null,
    "revenueGrowth": trailing 12m revenue growth % as number or null,
    "debtEquity": debt to equity ratio as number or null,
    "promoterHolding": promoter holding % as number or null,
    "epsGrowth": EPS growth YoY % as number or null
  },
  "watchPoints": [
    "Specific thing 1 to monitor",
    "Specific thing 2",
    "Specific thing 3"
  ],
  "bullCase": "1 sentence best case scenario",
  "bearCase": "1 sentence risk/bear case",
  "thesisStrength": 65
}`

  let thesis: GeneratedThesis
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = (response.content[0] as { type: string; text: string }).text.trim()
    const jsonStr = text.startsWith('{') ? text : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
    thesis = JSON.parse(jsonStr) as GeneratedThesis
  } catch {
    thesis = {
      originalThesis: `${companyName} (${ticker}) is a ${sector} sector company being tracked for research purposes. Further analysis of fundamentals, competitive positioning, and growth catalysts is needed to form a complete investment case.`,
      keyMetrics: { pe: null, revenueGrowth: null, debtEquity: null, promoterHolding: null, epsGrowth: null },
      watchPoints: ['Monitor quarterly earnings for revenue and margin trends', 'Track sector tailwinds and regulatory changes', 'Watch for management commentary on growth outlook'],
      bullCase: 'Strong sector tailwinds and quality management could drive significant re-rating.',
      bearCase: 'Valuation risk and macro headwinds could compress returns.',
      thesisStrength: 60,
    }
  }

  const nextReviewDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const saved = await prisma.stockThesis.upsert({
    where: { userId_ticker: { userId, ticker } },
    create: {
      userId,
      ticker,
      companyName,
      sector,
      originalThesis: thesis.originalThesis,
      keyMetrics: thesis.keyMetrics,
      watchPoints: thesis.watchPoints,
      confidenceScore: thesis.thesisStrength,
      nextReviewDue,
      lastReviewedAt: new Date(),
    },
    update: {
      companyName,
      sector,
      originalThesis: thesis.originalThesis,
      keyMetrics: thesis.keyMetrics,
      watchPoints: thesis.watchPoints,
      confidenceScore: thesis.thesisStrength,
      nextReviewDue,
      lastReviewedAt: new Date(),
    },
  })

  return saved.id
}
