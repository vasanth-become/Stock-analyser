import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import type { MarketCrashResult } from './crashDetector'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface StockAnalysisItem {
  ticker: string
  drop: string
  thesisStatus: 'intact' | 'weakening' | 'broken'
  thesisReminder: string
  fundamentalUpdate: string
  suggestedAction: 'hold' | 'research_more' | 'review'
}

export interface CalmMessage {
  headline: string
  marketContext: string
  stockAnalysis: StockAnalysisItem[]
  actionPlan: string
  groundingQuestion: string
  behaviourTip: string
}

export interface WatchlistStockData {
  ticker: string
  companyName: string
  changePercent: number
  notes?: string
}

const CALM_SYSTEM_PROMPT = `You are ARIA's Behaviour Guard — a calm, rational voice that appears when markets are falling and investors are tempted to panic sell. Your entire purpose is to prevent emotional decisions.

Your tone is: calm, reassuring, data-driven, like a wise friend who has seen many market cycles. Never dismissive. Never over-optimistic. Always honest but steady.

You receive:
- The market drop percentage today
- The user's risk profile and investment horizon
- The user's watchlist stocks and their individual drops
- The user's original research notes for each affected stock
- The user's Behaviour Score and past panic history

You generate a personalised calm message that:
1. Acknowledges the drop honestly — never minimise it
2. Puts it in historical context (market has recovered from worse)
3. Reviews each affected stock's fundamental thesis — is the original reason to hold still valid?
4. Gives the user a clear, calm action plan
5. Ends with one grounding question: "Has anything fundamentally changed about why you researched this stock?"

Never say: "Don't worry", "Everything will be fine", "This is a buying opportunity" (too pushy)
Always say: "Here is what the data shows", "Your thesis said...", "The fundamentals as of today show..."

Respond in JSON only (no markdown, no code fences):
{
  "headline": "10 words max — calm and factual",
  "marketContext": "2 sentences putting drop in historical context",
  "stockAnalysis": [
    {
      "ticker": "",
      "drop": "",
      "thesisStatus": "intact | weakening | broken",
      "thesisReminder": "what was the original research case based on user notes",
      "fundamentalUpdate": "what the data shows today",
      "suggestedAction": "hold | research_more | review"
    }
  ],
  "actionPlan": "3 bullet points separated by | — calm, specific, actionable",
  "groundingQuestion": "personalised question to stop panic selling",
  "behaviourTip": "one sentence from behavioural finance research"
}`

export async function generateCalmMessage(
  userId: string,
  marketData: MarketCrashResult,
  watchlistStocks: WatchlistStockData[],
): Promise<CalmMessage | null> {
  try {
    const [profile, behaviourScore] = await Promise.all([
      prisma.investorProfile.findUnique({ where: { userId } }),
      prisma.behaviourScore.findUnique({ where: { userId } }),
    ])

    const affectedStocks = watchlistStocks.filter((s) => s.changePercent <= -2)

    const userContext = `
Market today: Nifty ${marketData.niftyChange.toFixed(2)}%, Sensex ${marketData.sensexChange.toFixed(2)}%
Crash level: ${marketData.level}

Investor profile:
- Risk tolerance: ${profile?.riskTolerance ?? 'MODERATE'}
- Investment horizon: ${profile?.investmentHorizon ?? 'MEDIUM_TERM'}
- Experience: ${profile?.experience ?? 'INTERMEDIATE'}
- Investment goals: ${(profile?.investmentGoals ?? []).join(', ')}

Behaviour Score: ${behaviourScore?.score ?? 50}/100
Past panics stopped: ${behaviourScore?.panicsStopped ?? 0}

Affected watchlist stocks:
${affectedStocks.map((s) => `- ${s.ticker} (${s.companyName}): ${s.changePercent.toFixed(2)}% today. Research notes: "${s.notes || 'No notes recorded'}"`).join('\n')}
`.trim()

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: CALM_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContext }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(raw) as CalmMessage
    return parsed
  } catch (err) {
    console.error('[behaviourGuard] generateCalmMessage failed:', err)
    return null
  }
}
