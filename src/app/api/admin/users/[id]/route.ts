import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') return null
  return session
}

const patchSchema = z.object({
  plan: z.enum(['FREE', 'PRO', 'ENTERPRISE']).optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (parsed.data.plan !== undefined) {
    data.plan = parsed.data.plan
    // When manually granting PRO, set a 1-year expiry and clear subscription status
    if (parsed.data.plan === 'PRO') {
      const expiresAt = new Date()
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      data.planExpiresAt = expiresAt
      data.subscriptionStatus = 'ACTIVE'
    }
    // When downgrading to FREE, clear subscription fields
    if (parsed.data.plan === 'FREE') {
      data.planExpiresAt = null
      data.subscriptionId = null
      data.subscriptionStatus = null
    }
  }
  if (parsed.data.role !== undefined) {
    data.role = parsed.data.role
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, plan: true, role: true, planExpiresAt: true },
  })

  return NextResponse.json(updated)
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      plan: true,
      planExpiresAt: true,
      billingCycle: true,
      subscriptionStatus: true,
      createdAt: true,
      profile: {
        select: {
          displayName: true,
          age: true,
          experience: true,
          riskTolerance: true,
          investmentGoals: true,
        },
      },
      _count: { select: { analyses: true, alerts: true } },
    },
  })

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json(user)
}
