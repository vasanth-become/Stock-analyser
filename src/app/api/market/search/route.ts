import { NextRequest, NextResponse } from 'next/server'
import { searchStocks } from '@/lib/marketData'

export async function GET(req: NextRequest) {
  const query = new URL(req.url).searchParams.get('q') ?? ''

  if (query.length < 2) {
    return NextResponse.json([])
  }

  try {
    const results = await searchStocks(query)
    return NextResponse.json(results)
  } catch (err) {
    console.error('[market/search]', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
