import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const holdingSchema = z.object({
  symbol: z.string().min(1).max(30).toUpperCase(),
  exchange: z.enum(['NSE', 'BSE']).default('NSE'),
  companyName: z.string().optional(),
  sector: z.string().optional(),
  quantity: z.number().positive(),
  buyPrice: z.number().positive(),
  buyDate: z.string().transform((s) => new Date(s)),
  notes: z.string().max(500).optional(),
})

const updateSchema = z.object({
  id: z.string(),
  quantity: z.number().positive().optional(),
  buyPrice: z.number().positive().optional(),
  buyDate: z.string().transform((s) => new Date(s)).optional(),
  notes: z.string().max(500).optional(),
  sector: z.string().optional(),
  companyName: z.string().optional(),
})

async function getOrCreatePortfolio(userId: string) {
  return prisma.portfolio.upsert({
    where: { userId },
    update: {},
    create: { userId },
  })
}

// GET /api/portfolio — list all holdings
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const portfolio = await prisma.portfolio.findUnique({
    where: { userId: session.user.id },
    include: { holdings: { orderBy: { buyDate: 'asc' } } },
  })

  return NextResponse.json({
    holdings: portfolio?.holdings ?? [],
    portfolioId: portfolio?.id ?? null,
  })
}

// POST /api/portfolio — add a holding
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = holdingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const portfolio = await getOrCreatePortfolio(session.user.id)
  const holding = await prisma.holding.create({
    data: { portfolioId: portfolio.id, ...parsed.data },
  })

  return NextResponse.json(holding, { status: 201 })
}

// PATCH /api/portfolio — update a holding
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const { id, ...data } = parsed.data

  // Verify ownership
  const existing = await prisma.holding.findFirst({
    where: { id, portfolio: { userId: session.user.id } },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.holding.update({ where: { id }, data })
  return NextResponse.json(updated)
}

// DELETE /api/portfolio?id=X
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const existing = await prisma.holding.findFirst({
    where: { id, portfolio: { userId: session.user.id } },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.holding.delete({ where: { id } })
  return NextResponse.json({ deleted: true })
}
