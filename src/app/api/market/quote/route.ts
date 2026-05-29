import { NextRequest, NextResponse } from 'next/server'
import { getStockQuote, getStockFundamentals } from '@/lib/marketData'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')?.toUpperCase()
  const exchange = (searchParams.get('exchange') ?? 'NSE').toUpperCase() as 'NSE' | 'BSE'
  const withFundamentals = searchParams.get('fundamentals') === 'true'

  if (!symbol) {
    return NextResponse.json({ error: 'symbol is required' }, { status: 400 })
  }

  try {
    const [quote, fundamentals] = await Promise.all([
      getStockQuote(symbol, exchange),
      withFundamentals ? getStockFundamentals(symbol, exchange) : Promise.resolve(null),
    ])

    return NextResponse.json({ quote, fundamentals }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    })
  } catch (err) {
    console.error('[market/quote]', err)
    return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 })
  }
}
