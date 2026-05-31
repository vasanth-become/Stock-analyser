import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateAndSaveThesis } from '@/lib/thesisTracker/thesisGenerator'

const STATUS_ORDER: Record<string, number> = { broken: 0, weakening: 1, intact: 2, achieved: 3 }

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const theses = await prisma.stockThesis.findMany({
    where: { userId: session.user.id },
    include: {
      reviews: { orderBy: { reviewDate: 'desc' }, take: 1 },
      alerts: { where: { isRead: false } },
    },
    orderBy: { addedAt: 'desc' },
  })

  const sorted = theses.sort((a, b) => (STATUS_ORDER[a.currentStatus] ?? 9) - (STATUS_ORDER[b.currentStatus] ?? 9))
  return NextResponse.json(sorted)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { ticker, companyName, sector, fundamentals, riskProfile, investmentHorizon } = body
  if (!ticker || !companyName) return NextResponse.json({ error: 'ticker and companyName required' }, { status: 400 })

  try {
    const id = await generateAndSaveThesis({
      userId: session.user.id,
      ticker: ticker.toUpperCase(),
      companyName,
      sector: sector ?? 'Unknown',
      fundamentals: fundamentals ?? {},
      riskProfile,
      investmentHorizon,
    })
    const thesis = await prisma.stockThesis.findUnique({ where: { id } })
    return NextResponse.json(thesis, { status: 201 })
  } catch (err) {
    console.error('[api/thesis POST]', err)
    return NextResponse.json({ error: 'Failed to generate thesis' }, { status: 500 })
  }
}
