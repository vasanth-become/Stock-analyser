import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const FREE_ALERT_LIMIT = 5

const createSchema = z.object({
  symbol: z.string().min(1).max(30).toUpperCase(),
  exchange: z.enum(['NSE', 'BSE']).default('NSE'),
  type: z.enum(['PRICE_ABOVE', 'PRICE_BELOW', 'PERCENT_CHANGE']),
  value: z.number().positive(),
})

const updateSchema = z.object({
  id: z.string(),
  active: z.boolean().optional(),
  value: z.number().positive().optional(),
})

// GET /api/alerts — list all alerts for the user
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const alerts = await prisma.alert.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(alerts)
}

// POST /api/alerts — create a new alert
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const userId = session.user.id
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } })

  if (user?.plan === 'FREE') {
    const count = await prisma.alert.count({ where: { userId, active: true } })
    if (count >= FREE_ALERT_LIMIT) {
      return NextResponse.json(
        { error: `Free plan allows up to ${FREE_ALERT_LIMIT} active alerts. Upgrade to Pro for unlimited.` },
        { status: 429 },
      )
    }
  }

  const alert = await prisma.alert.create({
    data: { userId, ...parsed.data },
  })

  return NextResponse.json(alert, { status: 201 })
}

// PATCH /api/alerts — toggle active or update threshold
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
  const existing = await prisma.alert.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Re-arming: clear triggered state when user updates threshold or re-enables
  const resetTriggered = data.active === true || data.value !== undefined
  const updated = await prisma.alert.update({
    where: { id },
    data: {
      ...data,
      ...(resetTriggered ? { triggered: false, triggeredAt: null } : {}),
    },
  })

  return NextResponse.json(updated)
}

// DELETE /api/alerts?id=X
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const existing = await prisma.alert.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.alert.delete({ where: { id } })
  return NextResponse.json({ deleted: true })
}
