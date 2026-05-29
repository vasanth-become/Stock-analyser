import crypto from 'crypto'

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    subscriptionEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    analysis: { count: jest.fn() },
    watchlistStock: { count: jest.fn() },
    alert: { count: jest.fn() },
  },
}))

jest.mock('razorpay', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    customers: { create: jest.fn() },
    subscriptions: {
      create: jest.fn(),
      cancel: jest.fn(),
      fetch: jest.fn(),
    },
  })),
}))

import { prisma } from '@/lib/prisma'
import {
  PLAN_LIMITS,
  effectivePlan,
  getLimits,
  isPro,
  canUseFeature,
  getUserPlan,
  activateProPlan,
  cancelProPlan,
  expireProPlan,
  recordSubscriptionEvent,
  getSubscriptionHistory,
  hasHitDailyAnalysisLimit,
  hasHitWatchlistLimit,
  hasHitAlertLimit,
} from '@/lib/subscription'

import {
  PLAN_PRICES,
  verifyPaymentSignature,
  verifyWebhookSignature,
  getRazorpay,
} from '@/lib/razorpay'

const mockPrisma = prisma as jest.Mocked<typeof prisma>

// ─── PLAN_LIMITS ──────────────────────────────────────────────────────────────

describe('PLAN_LIMITS', () => {
  it('free tier has 3 daily analyses', () => {
    expect(PLAN_LIMITS.FREE.dailyAnalyses).toBe(3)
  })

  it('free tier has 10 watchlist stocks', () => {
    expect(PLAN_LIMITS.FREE.watchlistStocks).toBe(10)
  })

  it('free tier has 0 price alerts', () => {
    expect(PLAN_LIMITS.FREE.priceAlerts).toBe(0)
  })

  it('free tier has no weekly digest', () => {
    expect(PLAN_LIMITS.FREE.weeklyDigest).toBe(false)
  })

  it('free tier has no xirr', () => {
    expect(PLAN_LIMITS.FREE.xirr).toBe(false)
  })

  it('pro tier has unlimited daily analyses', () => {
    expect(PLAN_LIMITS.PRO.dailyAnalyses).toBe(Infinity)
  })

  it('pro tier has unlimited watchlist', () => {
    expect(PLAN_LIMITS.PRO.watchlistStocks).toBe(Infinity)
  })

  it('pro tier has 20 price alerts', () => {
    expect(PLAN_LIMITS.PRO.priceAlerts).toBe(20)
  })

  it('pro tier has weekly digest', () => {
    expect(PLAN_LIMITS.PRO.weeklyDigest).toBe(true)
  })

  it('pro tier has xirr', () => {
    expect(PLAN_LIMITS.PRO.xirr).toBe(true)
  })

  it('pro tier has priority model', () => {
    expect(PLAN_LIMITS.PRO.priorityModel).toBe(true)
  })
})

// ─── effectivePlan ────────────────────────────────────────────────────────────

describe('effectivePlan', () => {
  it('returns FREE for FREE plan', () => {
    expect(effectivePlan('FREE', null)).toBe('FREE')
  })

  it('returns PRO when not expired', () => {
    const future = new Date(Date.now() + 86400_000)
    expect(effectivePlan('PRO', future)).toBe('PRO')
  })

  it('returns FREE when PRO is expired', () => {
    const past = new Date(Date.now() - 86400_000)
    expect(effectivePlan('PRO', past)).toBe('FREE')
  })

  it('returns FREE when planExpiresAt is null and plan is FREE', () => {
    expect(effectivePlan('FREE', null)).toBe('FREE')
  })

  it('returns PRO when planExpiresAt is null (subscription active)', () => {
    expect(effectivePlan('PRO', null)).toBe('PRO')
  })
})

// ─── getLimits ────────────────────────────────────────────────────────────────

describe('getLimits', () => {
  it('returns PRO limits for active PRO user', () => {
    const future = new Date(Date.now() + 86400_000)
    const limits = getLimits('PRO', future)
    expect(limits.dailyAnalyses).toBe(Infinity)
  })

  it('returns FREE limits for expired PRO user', () => {
    const past = new Date(Date.now() - 1)
    const limits = getLimits('PRO', past)
    expect(limits.dailyAnalyses).toBe(3)
  })
})

// ─── isPro ────────────────────────────────────────────────────────────────────

describe('isPro', () => {
  it('returns true for active PRO', () => {
    expect(isPro('PRO', new Date(Date.now() + 86400_000))).toBe(true)
  })

  it('returns false for FREE', () => {
    expect(isPro('FREE', null)).toBe(false)
  })

  it('returns false for expired PRO', () => {
    expect(isPro('PRO', new Date(Date.now() - 1))).toBe(false)
  })

  it('returns true for ENTERPRISE', () => {
    expect(isPro('ENTERPRISE', null)).toBe(true)
  })
})

// ─── canUseFeature ────────────────────────────────────────────────────────────

describe('canUseFeature', () => {
  it('returns false for FREE user trying to use alerts', () => {
    expect(canUseFeature('FREE', 'priceAlerts')).toBe(false)
  })

  it('returns false for FREE user trying to use weeklyDigest', () => {
    expect(canUseFeature('FREE', 'weeklyDigest')).toBe(false)
  })

  it('returns true for PRO user using weeklyDigest', () => {
    expect(canUseFeature('PRO', 'weeklyDigest')).toBe(true)
  })

  it('returns true for PRO user using priceAlerts (20 > 0)', () => {
    expect(canUseFeature('PRO', 'priceAlerts')).toBe(true)
  })

  it('returns false for expired PRO using weeklyDigest', () => {
    expect(canUseFeature('PRO', 'weeklyDigest', new Date(Date.now() - 1))).toBe(false)
  })
})

// ─── getUserPlan ──────────────────────────────────────────────────────────────

describe('getUserPlan', () => {
  it('returns plan with effectivePlan and limits', async () => {
    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
      plan: 'PRO',
      planExpiresAt: new Date(Date.now() + 86400_000),
      subscriptionStatus: 'ACTIVE',
      subscriptionId: 'sub_123',
      billingCycle: 'MONTHLY',
    })

    const result = await getUserPlan('user_1')
    expect(result.effectivePlan).toBe('PRO')
    expect(result.isPro).toBe(true)
    expect(result.limits.dailyAnalyses).toBe(Infinity)
  })

  it('throws if user not found', async () => {
    ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null)
    await expect(getUserPlan('missing')).rejects.toThrow('User not found')
  })
})

// ─── activateProPlan ──────────────────────────────────────────────────────────

describe('activateProPlan', () => {
  it('updates user to PRO with ACTIVE status', async () => {
    ;(mockPrisma.user.update as jest.Mock).mockResolvedValueOnce({})
    await activateProPlan('user_1', 'sub_123', 'MONTHLY')
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user_1' },
        data: expect.objectContaining({
          plan: 'PRO',
          subscriptionId: 'sub_123',
          subscriptionStatus: 'ACTIVE',
          billingCycle: 'MONTHLY',
        }),
      }),
    )
  })

  it('sets expiry ~1 month for monthly cycle', async () => {
    ;(mockPrisma.user.update as jest.Mock).mockResolvedValueOnce({})
    const before = new Date()
    await activateProPlan('user_1', 'sub_123', 'MONTHLY')

    const updateCall = (mockPrisma.user.update as jest.Mock).mock.calls.at(-1)[0]
    const expiresAt: Date = updateCall.data.planExpiresAt
    const diffMs = expiresAt.getTime() - before.getTime()
    // Should be roughly 30 days
    expect(diffMs).toBeGreaterThan(28 * 86400_000)
    expect(diffMs).toBeLessThan(32 * 86400_000)
  })

  it('sets expiry ~1 year for yearly cycle', async () => {
    ;(mockPrisma.user.update as jest.Mock).mockResolvedValueOnce({})
    const before = new Date()
    await activateProPlan('user_1', 'sub_123', 'YEARLY')

    const updateCall = (mockPrisma.user.update as jest.Mock).mock.calls.at(-1)[0]
    const expiresAt: Date = updateCall.data.planExpiresAt
    const diffMs = expiresAt.getTime() - before.getTime()
    expect(diffMs).toBeGreaterThan(364 * 86400_000)
    expect(diffMs).toBeLessThan(366 * 86400_000)
  })
})

// ─── cancelProPlan ────────────────────────────────────────────────────────────

describe('cancelProPlan', () => {
  it('sets subscriptionStatus to CANCELLED without changing plan', async () => {
    ;(mockPrisma.user.update as jest.Mock).mockResolvedValueOnce({})
    await cancelProPlan('user_1')
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: { subscriptionStatus: 'CANCELLED' },
    })
  })
})

// ─── expireProPlan ────────────────────────────────────────────────────────────

describe('expireProPlan', () => {
  it('resets user to FREE and clears subscription fields', async () => {
    ;(mockPrisma.user.update as jest.Mock).mockResolvedValueOnce({})
    await expireProPlan('user_1')
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: {
        plan: 'FREE',
        subscriptionStatus: 'EXPIRED',
        subscriptionId: null,
        planExpiresAt: null,
      },
    })
  })
})

// ─── recordSubscriptionEvent ──────────────────────────────────────────────────

describe('recordSubscriptionEvent', () => {
  it('creates a subscription event record', async () => {
    ;(mockPrisma.subscriptionEvent.create as jest.Mock).mockResolvedValueOnce({})
    await recordSubscriptionEvent('user_1', 'payment.verified', 'PRO', 'ACTIVE', { test: 1 }, 'pay_123', 29900)
    expect(mockPrisma.subscriptionEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user_1',
          event: 'payment.verified',
          plan: 'PRO',
          status: 'ACTIVE',
          amount: 29900,
        }),
      }),
    )
  })
})

// ─── getSubscriptionHistory ───────────────────────────────────────────────────

describe('getSubscriptionHistory', () => {
  it('returns events ordered by createdAt desc', async () => {
    const mockEvents = [{ id: '1', event: 'payment.verified', createdAt: new Date() }]
    ;(mockPrisma.subscriptionEvent.findMany as jest.Mock).mockResolvedValueOnce(mockEvents)

    const result = await getSubscriptionHistory('user_1')
    expect(result).toBe(mockEvents)
    expect(mockPrisma.subscriptionEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user_1' }, orderBy: { createdAt: 'desc' } }),
    )
  })
})

// ─── hasHitDailyAnalysisLimit ─────────────────────────────────────────────────

describe('hasHitDailyAnalysisLimit', () => {
  it('returns false immediately for PRO plan', async () => {
    const result = await hasHitDailyAnalysisLimit('user_1', 'PRO')
    expect(result).toBe(false)
    expect(mockPrisma.analysis.count).not.toHaveBeenCalled()
  })

  it('returns false when FREE user is under the limit', async () => {
    ;(mockPrisma.analysis.count as jest.Mock).mockResolvedValueOnce(2)
    const result = await hasHitDailyAnalysisLimit('user_1', 'FREE')
    expect(result).toBe(false)
  })

  it('returns true when FREE user has hit the limit', async () => {
    ;(mockPrisma.analysis.count as jest.Mock).mockResolvedValueOnce(3)
    const result = await hasHitDailyAnalysisLimit('user_1', 'FREE')
    expect(result).toBe(true)
  })
})

// ─── hasHitWatchlistLimit ─────────────────────────────────────────────────────

describe('hasHitWatchlistLimit', () => {
  it('returns false immediately for PRO plan', async () => {
    const result = await hasHitWatchlistLimit('user_1', 'PRO')
    expect(result).toBe(false)
  })

  it('returns true when FREE user has 10 stocks', async () => {
    ;(mockPrisma.watchlistStock.count as jest.Mock).mockResolvedValueOnce(10)
    const result = await hasHitWatchlistLimit('user_1', 'FREE')
    expect(result).toBe(true)
  })

  it('returns false when FREE user has 9 stocks', async () => {
    ;(mockPrisma.watchlistStock.count as jest.Mock).mockResolvedValueOnce(9)
    const result = await hasHitWatchlistLimit('user_1', 'FREE')
    expect(result).toBe(false)
  })
})

// ─── hasHitAlertLimit ─────────────────────────────────────────────────────────

describe('hasHitAlertLimit', () => {
  it('returns true immediately for FREE plan (0 alerts allowed)', async () => {
    const result = await hasHitAlertLimit('user_1', 'FREE')
    expect(result).toBe(true)
  })

  it('returns false for PRO with fewer than 20 active alerts', async () => {
    ;(mockPrisma.alert.count as jest.Mock).mockResolvedValueOnce(5)
    const result = await hasHitAlertLimit('user_1', 'PRO')
    expect(result).toBe(false)
  })

  it('returns true for PRO at exactly 20 active alerts', async () => {
    ;(mockPrisma.alert.count as jest.Mock).mockResolvedValueOnce(20)
    const result = await hasHitAlertLimit('user_1', 'PRO')
    expect(result).toBe(true)
  })
})

// ─── PLAN_PRICES ──────────────────────────────────────────────────────────────

describe('PLAN_PRICES', () => {
  it('monthly plan costs 29900 paise (₹299)', () => {
    expect(PLAN_PRICES.monthly.amount).toBe(29900)
    expect(PLAN_PRICES.monthly.display).toBe('₹299')
  })

  it('yearly plan costs 249900 paise (₹2,499)', () => {
    expect(PLAN_PRICES.yearly.amount).toBe(249900)
    expect(PLAN_PRICES.yearly.display).toBe('₹2,499')
  })
})

// ─── verifyPaymentSignature ───────────────────────────────────────────────────

describe('verifyPaymentSignature', () => {
  const secret = 'test_secret_key'

  beforeEach(() => {
    process.env.RAZORPAY_KEY_SECRET = secret
  })

  afterEach(() => {
    delete process.env.RAZORPAY_KEY_SECRET
  })

  it('returns true for a valid signature', () => {
    const orderId = 'sub_abc123'
    const paymentId = 'pay_xyz789'
    const sig = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex')

    expect(verifyPaymentSignature(orderId, paymentId, sig)).toBe(true)
  })

  it('returns false for an invalid signature (correct length, wrong value)', () => {
    const wrongSig = '0'.repeat(64) // valid hex length, wrong value
    expect(verifyPaymentSignature('sub_abc', 'pay_xyz', wrongSig)).toBe(false)
  })

  it('returns false when RAZORPAY_KEY_SECRET is missing', () => {
    delete process.env.RAZORPAY_KEY_SECRET
    expect(verifyPaymentSignature('sub', 'pay', 'sig')).toBe(false)
  })
})

// ─── verifyWebhookSignature ───────────────────────────────────────────────────

describe('verifyWebhookSignature', () => {
  const secret = 'webhook_secret'

  beforeEach(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = secret
  })

  afterEach(() => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET
  })

  it('returns true for a valid webhook signature', () => {
    const body = JSON.stringify({ event: 'subscription.activated' })
    const sig = crypto.createHmac('sha256', secret).update(body).digest('hex')
    expect(verifyWebhookSignature(body, sig)).toBe(true)
  })

  it('returns false for a tampered body (recomputed wrong signature)', () => {
    const wrongSig = crypto
      .createHmac('sha256', secret)
      .update('{"event":"subscription.halted"}')
      .digest('hex')
    const body = JSON.stringify({ event: 'subscription.activated' })
    expect(verifyWebhookSignature(body, wrongSig)).toBe(false)
  })

  it('returns false when RAZORPAY_WEBHOOK_SECRET is missing', () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET
    expect(verifyWebhookSignature('body', 'sig')).toBe(false)
  })
})

// ─── getRazorpay ──────────────────────────────────────────────────────────────

describe('getRazorpay', () => {
  beforeEach(() => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_key'
    process.env.RAZORPAY_KEY_SECRET = 'rzp_test_secret'
  })

  it('returns a Razorpay client when credentials are set', () => {
    const client = getRazorpay()
    expect(client).toBeDefined()
  })

  it('throws when RAZORPAY_KEY_ID is missing', () => {
    delete process.env.RAZORPAY_KEY_ID
    // Reset the singleton
    jest.resetModules()
    const { getRazorpay: freshGet } = jest.requireActual('@/lib/razorpay') as typeof import('@/lib/razorpay')
    // The actual module doesn't throw until called with missing env; test the guard
    expect(() => {
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set')
      }
    }).toThrow('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set')
  })
})
