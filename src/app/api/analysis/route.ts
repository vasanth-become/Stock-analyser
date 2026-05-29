import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { analyzeStock } from '@/lib/anthropic'

const schema = z.object({
  symbol: z.string().min(1).max(20),
  exchange: z.enum(['NSE', 'BSE']).default('NSE'),
  type: z.enum(['technical', 'fundamental', 'ai_summary']).default('ai_summary'),
})

function buildPrompt(symbol: string, exchange: string, type: string): string {
  const base = `Stock: ${symbol} listed on ${exchange}`

  if (type === 'technical') {
    return `${base}
Provide a detailed technical analysis including:
1. **Price Action & Trend**: Current trend direction, support/resistance levels
2. **Key Indicators**: RSI, MACD, Moving Averages (20, 50, 200 DMA) signals
3. **Volume Analysis**: Volume trends and what they indicate
4. **Chart Patterns**: Any notable chart patterns forming
5. **Short-term Outlook** (1-4 weeks): Target price range and key levels to watch
6. **Trading Strategy**: Entry points, stop loss, and target levels

Note: Use approximate typical values for a stock of this nature in the Indian market context.`
  }

  if (type === 'fundamental') {
    return `${base}
Provide a detailed fundamental analysis including:
1. **Business Overview**: What the company does and its market position
2. **Financial Health**: Revenue growth, profit margins, debt levels
3. **Key Ratios**: P/E, P/B, ROE, ROCE, Debt/Equity
4. **Growth Catalysts**: Key factors that could drive growth
5. **Risk Factors**: Main risks to the investment thesis
6. **Valuation**: Is the stock fairly valued, overvalued, or undervalued?
7. **Investment Recommendation**: Buy/Hold/Sell with 12-month target

Use Indian market context and SEBI compliance standards.`
  }

  return `${base}
Provide a comprehensive AI-powered stock summary for an Indian retail investor:
1. **Quick Summary**: What this company does in 2-3 sentences
2. **Current Market Position**: Industry standing and competitive advantages
3. **Recent Performance**: Key developments in the last 6-12 months
4. **Investment Highlights**: Top 3 reasons to consider this stock
5. **Key Risks**: Top 3 risks to be aware of
6. **Retail Investor Suitability**: Is this suitable for conservative, moderate, or aggressive investors?
7. **Verdict**: Overall assessment with a recommendation

Keep the language simple and suitable for retail investors. Use INR for all monetary values.`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { symbol, exchange, type } = parsed.data
    const prompt = buildPrompt(symbol, exchange, type)
    const analysis = await analyzeStock(prompt)

    return NextResponse.json({ analysis, symbol, exchange, type })
  } catch (error: unknown) {
    console.error('Analysis error:', error)
    if (error instanceof Error && error.message?.includes('API key')) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Failed to generate analysis' }, { status: 500 })
  }
}
