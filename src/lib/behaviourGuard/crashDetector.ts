import { getIndexQuotes, getStockQuote } from '@/lib/marketData'
import { prisma } from '@/lib/prisma'

export type CrashLevel = 'yellow' | 'orange' | 'red'

export interface MarketCrashResult {
  triggered: boolean
  level: CrashLevel | null
  niftyChange: number
  sensexChange: number
}

export interface StockCrashResult {
  triggered: boolean
  change: number
  ticker: string
  companyName: string
}

export interface PortfolioDownResult {
  triggered: boolean
  portfolioDropPercent: number
  worstStock: string | null
}

export async function detectMarketCrash(): Promise<MarketCrashResult> {
  try {
    const indices = await getIndexQuotes()
    const nifty = indices.find((i) => i.symbol === '^NSEI') ?? indices[0]
    const sensex = indices.find((i) => i.symbol === '^BSESN') ?? indices[1]

    const niftyChange = nifty?.changePercent ?? 0
    const sensexChange = sensex?.changePercent ?? 0
    const worstChange = Math.min(niftyChange, sensexChange)

    let level: CrashLevel | null = null
    if (worstChange <= -4.0) level = 'red'
    else if (worstChange <= -2.5) level = 'orange'
    else if (worstChange <= -1.5) level = 'yellow'

    return { triggered: level !== null, level, niftyChange, sensexChange }
  } catch {
    return { triggered: false, level: null, niftyChange: 0, sensexChange: 0 }
  }
}

export async function detectStockCrash(ticker: string): Promise<StockCrashResult> {
  try {
    const quote = await getStockQuote(ticker, 'NSE')
    const change = quote.changePercent ?? 0
    return {
      triggered: change <= -5,
      change,
      ticker,
      companyName: quote.companyName ?? ticker,
    }
  } catch {
    return { triggered: false, change: 0, ticker, companyName: ticker }
  }
}

export async function detectPortfolioDown(userId: string): Promise<PortfolioDownResult> {
  try {
    const portfolio = await prisma.portfolio.findUnique({
      where: { userId },
      include: { holdings: true },
    })

    if (!portfolio || portfolio.holdings.length === 0) {
      return { triggered: false, portfolioDropPercent: 0, worstStock: null }
    }

    const quotes = await Promise.allSettled(
      portfolio.holdings.map((h) => getStockQuote(h.symbol, h.exchange as 'NSE' | 'BSE')),
    )

    let totalCost = 0
    let totalCurrentValue = 0
    let worstChange = 0
    let worstStock: string | null = null

    portfolio.holdings.forEach((holding, i) => {
      const result = quotes[i]
      if (result.status !== 'fulfilled') return

      const quote = result.value
      const cost = holding.quantity * holding.buyPrice
      const current = holding.quantity * quote.price
      totalCost += cost
      totalCurrentValue += current

      const dayChange = quote.changePercent ?? 0
      if (dayChange < worstChange) {
        worstChange = dayChange
        worstStock = holding.symbol
      }
    })

    if (totalCost === 0) return { triggered: false, portfolioDropPercent: 0, worstStock: null }

    const dropPercent = ((totalCurrentValue - totalCost) / totalCost) * 100

    return {
      triggered: dropPercent <= -3,
      portfolioDropPercent: dropPercent,
      worstStock,
    }
  } catch {
    return { triggered: false, portfolioDropPercent: 0, worstStock: null }
  }
}
