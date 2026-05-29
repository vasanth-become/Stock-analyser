import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUserPlan, getSubscriptionHistory } from '@/lib/subscription'
import { PLAN_PRICES } from '@/lib/razorpay'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [plan, events] = await Promise.all([
    getUserPlan(session.user.id),
    getSubscriptionHistory(session.user.id),
  ])

  const invoices = events
    .filter((e) => e.event === 'payment.verified' || e.event === 'subscription.charged')
    .map((e) => ({
      id: e.id,
      date: e.createdAt,
      amount: e.amount ? `₹${(e.amount / 100).toLocaleString('en-IN')}` : null,
      status: 'Paid',
      plan: e.plan,
    }))

  return NextResponse.json({
    currentPlan: plan.effectivePlan,
    subscriptionStatus: plan.subscriptionStatus,
    billingCycle: plan.billingCycle,
    planExpiresAt: plan.planExpiresAt,
    isPro: plan.isPro,
    limits: plan.limits,
    prices: {
      monthly: { amount: PLAN_PRICES.monthly.display, period: 'month' },
      yearly: { amount: PLAN_PRICES.yearly.display, period: 'year', savings: 'Save 30%' },
    },
    invoices,
  })
}
