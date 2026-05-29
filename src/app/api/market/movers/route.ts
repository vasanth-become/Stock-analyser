import { NextResponse } from 'next/server'
import { getTopGainersLosers } from '@/lib/marketData'

export async function GET() {
  try {
    const movers = await getTopGainersLosers()
    return NextResponse.json(movers, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    })
  } catch (err) {
    console.error('[market/movers]', err)
    return NextResponse.json({ error: 'Failed to fetch movers' }, { status: 500 })
  }
}
