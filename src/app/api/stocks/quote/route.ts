import { NextRequest, NextResponse } from 'next/server'

// In production, integrate with NSE/BSE data providers like:
// - Alpha Vantage (has Indian stocks)
// - Twelve Data
// - Yahoo Finance API
// - NSE official APIs
// For now, returns realistic mock data

function generateMockQuote(symbol: string, exchange: string) {
  const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const basePrice = 100 + (seed % 4900)
  const changePercent = ((seed % 1000) - 500) / 100
  const change = (basePrice * changePercent) / 100

  return {
    symbol,
    exchange,
    companyName: `${symbol} Limited`,
    price: parseFloat(basePrice.toFixed(2)),
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    open: parseFloat((basePrice * 0.99).toFixed(2)),
    high: parseFloat((basePrice * 1.02).toFixed(2)),
    low: parseFloat((basePrice * 0.98).toFixed(2)),
    previousClose: parseFloat((basePrice - change).toFixed(2)),
    volume: Math.floor(100000 + (seed % 10000000)),
    marketCap: Math.floor(basePrice * 1000000000),
    pe: parseFloat((15 + (seed % 35)).toFixed(1)),
    eps: parseFloat((basePrice / (15 + (seed % 35))).toFixed(2)),
    week52High: parseFloat((basePrice * 1.3).toFixed(2)),
    week52Low: parseFloat((basePrice * 0.7).toFixed(2)),
    timestamp: new Date().toISOString(),
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')
  const exchange = searchParams.get('exchange') || 'NSE'

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })
  }

  const quote = generateMockQuote(symbol.toUpperCase(), exchange.toUpperCase())
  return NextResponse.json(quote)
}
