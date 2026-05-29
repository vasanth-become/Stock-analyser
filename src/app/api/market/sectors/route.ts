import { NextResponse } from 'next/server'
import { getSectorPerformance } from '@/lib/marketData'

export async function GET() {
  try {
    const sectors = await getSectorPerformance()
    return NextResponse.json(sectors, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    })
  } catch (err) {
    console.error('[market/sectors]', err)
    return NextResponse.json({ error: 'Failed to fetch sector data' }, { status: 500 })
  }
}
