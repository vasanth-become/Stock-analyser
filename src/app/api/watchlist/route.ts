import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const addSchema = z.object({
  symbol: z.string().min(1).max(30).toUpperCase(),
  exchange: z.enum(['NSE', 'BSE']).default('NSE'),
  watchlistName: z.string().default('My Watchlist'),
})

// GET  /api/watchlist — list all watchlists with their stocks
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const watchlists = await prisma.watchlist.findMany({
    where: { userId: session.user.id },
    include: { stocks: { orderBy: { addedAt: 'desc' } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(watchlists)
}

// POST /api/watchlist — add a stock (creates default watchlist if needed)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = addSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const { symbol, exchange, watchlistName } = parsed.data
  const userId = session.user.id

  // Upsert the default watchlist
  let watchlist = await prisma.watchlist.findFirst({
    where: { userId, name: watchlistName },
  })
  if (!watchlist) {
    watchlist = await prisma.watchlist.create({
      data: { userId, name: watchlistName },
    })
  }

  // Upsert the stock (ignore duplicate)
  try {
    const stock = await prisma.watchlistStock.upsert({
      where: { watchlistId_symbol: { watchlistId: watchlist.id, symbol } },
      update: {},
      create: { watchlistId: watchlist.id, symbol, exchange },
    })
    return NextResponse.json({ watchlistId: watchlist.id, stock })
  } catch {
    return NextResponse.json({ error: 'Failed to add stock' }, { status: 500 })
  }
}

// DELETE /api/watchlist?symbol=X&watchlistId=Y
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')?.toUpperCase()
  const watchlistId = searchParams.get('watchlistId')

  if (!symbol || !watchlistId) {
    return NextResponse.json({ error: 'symbol and watchlistId required' }, { status: 400 })
  }

  // Verify ownership
  const watchlist = await prisma.watchlist.findFirst({
    where: { id: watchlistId, userId: session.user.id },
  })
  if (!watchlist) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.watchlistStock.deleteMany({ where: { watchlistId, symbol } })
  return NextResponse.json({ removed: true })
}
