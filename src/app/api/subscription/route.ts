import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  createRazorpayCustomer,
  createRazorpaySubscription,
  cancelRazorpaySubscription,
  PLAN_PRICES,
  type BillingCycle,
} from '@/lib/razorpay'
import { cancelProPlan, getUserPlan } from '@/lib/subscription'
import { z } from 'zod'

const CreateSchema = z.object({
  cycle: z.enum(['monthly', 'yearly']),
})

// POST /api/subscription — create a new Razorpay subscription
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid cycle — use "monthly" or "yearly"' }, { status: 400 })
  }

  const { cycle } = parsed.data
  const userId = session.user.id

  // Fetch or create Razorpay customer
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, razorpayCustomerId: true, plan: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (user.plan === 'PRO') {
    return NextResponse.json({ error: 'You already have an active Pro plan' }, { status: 409 })
  }

  let customerId = user.razorpayCustomerId
  if (!customerId) {
    customerId = await createRazorpayCustomer(user.email!, user.name ?? 'Investor')
    await prisma.user.update({ where: { id: userId }, data: { razorpayCustomerId: customerId } })
  }

  const { subscriptionId, shortUrl } = await createRazorpaySubscription(customerId, cycle as BillingCycle)

  return NextResponse.json({
    subscriptionId,
    shortUrl,
    amount: PLAN_PRICES[cycle as BillingCycle].amount,
    cycle,
    keyId: process.env.RAZORPAY_KEY_ID,
  })
}

// DELETE /api/subscription — cancel current subscription
export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id
  const plan = await getUserPlan(userId)

  if (!plan.isPro) {
    return NextResponse.json({ error: 'No active Pro subscription to cancel' }, { status: 400 })
  }

  if (plan.subscriptionId) {
    await cancelRazorpaySubscription(plan.subscriptionId, true)
  }

  await cancelProPlan(userId)

  return NextResponse.json({
    ok: true,
    message: 'Subscription cancelled. You keep Pro access until the end of your billing period.',
    expiresAt: plan.planExpiresAt,
  })
}

// GET /api/subscription — fetch current subscription status
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const plan = await getUserPlan(session.user.id)
  return NextResponse.json(plan)
}
