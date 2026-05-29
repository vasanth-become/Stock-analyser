import Razorpay from 'razorpay'
import crypto from 'crypto'

// ─── Client singleton ─────────────────────────────────────────────────────────

let _client: Razorpay | null = null

export function getRazorpay(): Razorpay {
  if (!_client) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set')
    }
    _client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  }
  return _client
}

// ─── Plan config ──────────────────────────────────────────────────────────────

export const PLAN_PRICES = {
  monthly: {
    amount: 29900,          // ₹299 in paise
    display: '₹299',
    period: 'month',
    razorpayPlanId: process.env.RAZORPAY_PLAN_MONTHLY ?? '',
  },
  yearly: {
    amount: 249900,         // ₹2,499 in paise
    display: '₹2,499',
    period: 'year',
    razorpayPlanId: process.env.RAZORPAY_PLAN_YEARLY ?? '',
  },
} as const

export type BillingCycle = keyof typeof PLAN_PRICES

// ─── Signature verification ───────────────────────────────────────────────────

/**
 * Verify the HMAC-SHA256 signature on a Razorpay payment.
 * Called after checkout success: verify(orderId, paymentId, signature).
 */
export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) return false
  const body = `${razorpayOrderId}|${razorpayPaymentId}`
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpaySignature))
}

/**
 * Verify the HMAC-SHA256 signature on a Razorpay webhook payload.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) return false
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

// ─── Customer helpers ─────────────────────────────────────────────────────────

export async function createRazorpayCustomer(
  email: string,
  name: string,
): Promise<string> {
  const rp = getRazorpay()
  const customer = await rp.customers.create({ email, name, fail_existing: '0' })
  return (customer as { id: string }).id
}

// ─── Subscription helpers ─────────────────────────────────────────────────────

export async function createRazorpaySubscription(
  customerId: string,
  cycle: BillingCycle,
): Promise<{ subscriptionId: string; shortUrl: string }> {
  const rp = getRazorpay()
  const planId = PLAN_PRICES[cycle].razorpayPlanId
  if (!planId) throw new Error(`Razorpay plan ID not configured for ${cycle}`)

  const sub = await rp.subscriptions.create({
    plan_id: planId,
    customer_notify: 1,
    quantity: 1,
    total_count: cycle === 'yearly' ? 1 : 12,
    addons: [],
    notes: { customer_id: customerId },
  }) as { id: string; short_url: string }

  return { subscriptionId: sub.id, shortUrl: sub.short_url }
}

export async function cancelRazorpaySubscription(
  subscriptionId: string,
  cancelAtCycleEnd = true,
): Promise<void> {
  const rp = getRazorpay()
  await rp.subscriptions.cancel(subscriptionId, cancelAtCycleEnd)
}

export async function fetchRazorpaySubscription(subscriptionId: string) {
  const rp = getRazorpay()
  return rp.subscriptions.fetch(subscriptionId)
}
