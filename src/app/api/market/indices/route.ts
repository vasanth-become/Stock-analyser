import { NextResponse } from 'next/server'
import { getIndexQuotes } from '@/lib/marketData'

export async function GET() {
  try {
    const indices = await getIndexQuotes()
    return NextResponse.json(indices, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    })
  } catch (err) {
    console.error('[market/indices]', err)
    return NextResponse.json({ error: 'Failed to fetch indices' }, { status: 500 })
  }
}
