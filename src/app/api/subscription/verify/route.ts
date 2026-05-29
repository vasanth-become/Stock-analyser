import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { verifyPaymentSignature } from '@/lib/razorpay'
import { activateProPlan, recordSubscriptionEvent } from '@/lib/subscription'
import { z } from 'zod'

const VerifySchema = z.object({
  razorpay_payment_id: z.string(),
  razorpay_subscription_id: z.string(),
  razorpay_signature: z.string(),
  cycle: z.enum(['monthly', 'yearly']),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = VerifySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Missing payment verification fields' }, { status: 400 })
  }

  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, cycle } = parsed.data

  const valid = verifyPaymentSignature(
    razorpay_subscription_id,
    razorpay_payment_id,
    razorpay_signature,
  )
  if (!valid) {
    return NextResponse.json({ error: 'Payment signature verification failed' }, { status: 400 })
  }

  const billingCycle = cycle === 'yearly' ? 'YEARLY' : 'MONTHLY'

  await activateProPlan(session.user.id, razorpay_subscription_id, billingCycle)

  await recordSubscriptionEvent(
    session.user.id,
    'payment.verified',
    'PRO',
    'ACTIVE',
    { razorpay_payment_id, razorpay_subscription_id, cycle },
    razorpay_payment_id,
  )

  return NextResponse.json({ ok: true, plan: 'PRO', cycle: billingCycle })
}
