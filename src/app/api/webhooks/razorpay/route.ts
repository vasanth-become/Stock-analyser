import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/razorpay'
import { prisma } from '@/lib/prisma'
import {
  activateProPlan,
  expireProPlan,
  cancelProPlan,
  recordSubscriptionEvent,
} from '@/lib/subscription'

// Razorpay webhook event shape (partial)
interface RazorpayWebhookPayload {
  entity: string
  account_id: string
  event: string
  contains: string[]
  payload: {
    subscription?: {
      entity: {
        id: string
        customer_id?: string
        plan_id?: string
        status: string
      }
    }
    payment?: {
      entity: {
        id: string
        amount: number
        subscription_id?: string
      }
    }
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-razorpay-signature') ?? ''

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
  }

  let payload: RazorpayWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const event = payload.event
  const sub = payload.payload.subscription?.entity
  const payment = payload.payload.payment?.entity

  // Resolve user from subscription_id
  const subscriptionId = sub?.id ?? payment?.subscription_id
  if (!subscriptionId) {
    return NextResponse.json({ ok: true, skipped: 'no subscription id' })
  }

  const user = await prisma.user.findFirst({
    where: { subscriptionId },
    select: { id: true, plan: true },
  })

  // For new subscriptions, fall back to customer lookup
  if (!user && sub?.customer_id) {
    const byCustomer = await prisma.user.findFirst({
      where: { razorpayCustomerId: sub.customer_id },
      select: { id: true, plan: true },
    })
    if (!byCustomer) return NextResponse.json({ ok: true, skipped: 'user not found' })

    await handleEvent(byCustomer.id, event, subscriptionId, payment?.amount, payload)
    return NextResponse.json({ ok: true })
  }

  if (!user) return NextResponse.json({ ok: true, skipped: 'user not found' })

  await handleEvent(user.id, event, subscriptionId, payment?.amount, payload)
  return NextResponse.json({ ok: true })
}

async function handleEvent(
  userId: string,
  event: string,
  subscriptionId: string,
  amount: number | undefined,
  payload: RazorpayWebhookPayload,
) {
  switch (event) {
    case 'subscription.activated':
    case 'subscription.charged': {
      const cycle = detectCycle(payload.payload.subscription?.entity.plan_id)
      await activateProPlan(userId, subscriptionId, cycle)
      await recordSubscriptionEvent(userId, event, 'PRO', 'ACTIVE', payload, subscriptionId, amount)
      break
    }

    case 'subscription.cancelled':
      await cancelProPlan(userId)
      await recordSubscriptionEvent(userId, event, 'PRO', 'CANCELLED', payload, subscriptionId)
      break

    case 'subscription.completed':
    case 'subscription.expired':
      await expireProPlan(userId)
      await recordSubscriptionEvent(userId, event, 'FREE', 'EXPIRED', payload, subscriptionId)
      break

    case 'subscription.halted':
      await prisma.user.update({
        where: { id: userId },
        data: { subscriptionStatus: 'HALTED' },
      })
      await recordSubscriptionEvent(userId, event, 'PRO', 'HALTED', payload, subscriptionId)
      break

    default:
      // Record but take no action for unknown events
      await recordSubscriptionEvent(userId, event, 'PRO', 'ACTIVE', payload, subscriptionId, amount)
  }
}

function detectCycle(planId: string | undefined): 'MONTHLY' | 'YEARLY' {
  if (!planId) return 'MONTHLY'
  if (planId === process.env.RAZORPAY_PLAN_YEARLY) return 'YEARLY'
  return 'MONTHLY'
}
