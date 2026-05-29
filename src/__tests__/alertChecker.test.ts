/**
 * Tests for alertChecker.ts — alert evaluation logic.
 *
 * Prisma and marketData are fully mocked so no DB or network is needed.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockFindMany = jest.fn()
const mockUpdateMany = jest.fn()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    alert: {
      findMany: mockFindMany,
      updateMany: mockUpdateMany,
    },
  },
}))

const mockGetStockQuote = jest.fn()
jest.mock('@/lib/marketData', () => ({
  getStockQuote: mockGetStockQuote,
  getIndexQuotes: jest.fn().mockResolvedValue([]),
}))

const mockSendAlertEmail = jest.fn()
jest.mock('@/lib/email', () => ({
  sendAlertEmail: mockSendAlertEmail,
  sendDigestEmail: jest.fn().mockResolvedValue(true),
}))

import { checkAlerts } from '@/lib/alertChecker'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeAlert(overrides: Partial<{
  id: string
  symbol: string
  exchange: string
  type: string
  value: number
  email: string
  name: string
}> = {}) {
  return {
    id: overrides.id ?? 'alert_1',
    symbol: overrides.symbol ?? 'RELIANCE',
    exchange: overrides.exchange ?? 'NSE',
    type: overrides.type ?? 'PRICE_ABOVE',
    value: overrides.value ?? 3000,
    active: true,
    triggered: false,
    user: {
      email: overrides.email ?? 'test@example.com',
      name: overrides.name ?? 'Test User',
    },
  }
}

function makeQuote(price: number, changePercent = 0) {
  return { price, changePercent, companyName: 'Test Co' }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('checkAlerts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdateMany.mockResolvedValue({ count: 0 })
  })

  describe('when no active alerts exist', () => {
    it('does nothing and makes no API calls', async () => {
      mockFindMany.mockResolvedValue([])
      await checkAlerts()
      expect(mockGetStockQuote).not.toHaveBeenCalled()
      expect(mockUpdateMany).not.toHaveBeenCalled()
      expect(mockSendAlertEmail).not.toHaveBeenCalled()
    })
  })

  describe('PRICE_ABOVE alert type', () => {
    it('triggers when price >= threshold', async () => {
      const alert = makeAlert({ type: 'PRICE_ABOVE', value: 3000 })
      mockFindMany.mockResolvedValue([alert])
      mockGetStockQuote.mockResolvedValue(makeQuote(3100))

      await checkAlerts()

      expect(mockSendAlertEmail).toHaveBeenCalledTimes(1)
      expect(mockSendAlertEmail).toHaveBeenCalledWith(expect.objectContaining({
        alertType: 'PRICE_ABOVE',
        currentPrice: 3100,
        threshold: 3000,
      }))
      expect(mockUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ triggered: true }),
      }))
    })

    it('triggers at exactly the threshold', async () => {
      const alert = makeAlert({ type: 'PRICE_ABOVE', value: 2500 })
      mockFindMany.mockResolvedValue([alert])
      mockGetStockQuote.mockResolvedValue(makeQuote(2500))

      await checkAlerts()

      expect(mockSendAlertEmail).toHaveBeenCalledTimes(1)
    })

    it('does NOT trigger when price is below threshold', async () => {
      const alert = makeAlert({ type: 'PRICE_ABOVE', value: 3000 })
      mockFindMany.mockResolvedValue([alert])
      mockGetStockQuote.mockResolvedValue(makeQuote(2900))

      await checkAlerts()

      expect(mockSendAlertEmail).not.toHaveBeenCalled()
      expect(mockUpdateMany).not.toHaveBeenCalled()
    })
  })

  describe('PRICE_BELOW alert type', () => {
    it('triggers when price <= threshold', async () => {
      const alert = makeAlert({ type: 'PRICE_BELOW', value: 1500 })
      mockFindMany.mockResolvedValue([alert])
      mockGetStockQuote.mockResolvedValue(makeQuote(1400))

      await checkAlerts()

      expect(mockSendAlertEmail).toHaveBeenCalledTimes(1)
      expect(mockSendAlertEmail).toHaveBeenCalledWith(expect.objectContaining({
        alertType: 'PRICE_BELOW',
        threshold: 1500,
      }))
    })

    it('triggers at exactly the threshold', async () => {
      const alert = makeAlert({ type: 'PRICE_BELOW', value: 1500 })
      mockFindMany.mockResolvedValue([alert])
      mockGetStockQuote.mockResolvedValue(makeQuote(1500))

      await checkAlerts()

      expect(mockSendAlertEmail).toHaveBeenCalledTimes(1)
    })

    it('does NOT trigger when price is above threshold', async () => {
      const alert = makeAlert({ type: 'PRICE_BELOW', value: 1500 })
      mockFindMany.mockResolvedValue([alert])
      mockGetStockQuote.mockResolvedValue(makeQuote(1600))

      await checkAlerts()

      expect(mockSendAlertEmail).not.toHaveBeenCalled()
    })
  })

  describe('PERCENT_CHANGE alert type', () => {
    it('triggers when positive change exceeds threshold', async () => {
      const alert = makeAlert({ type: 'PERCENT_CHANGE', value: 3 })
      mockFindMany.mockResolvedValue([alert])
      mockGetStockQuote.mockResolvedValue(makeQuote(1000, 4.5))

      await checkAlerts()

      expect(mockSendAlertEmail).toHaveBeenCalledTimes(1)
    })

    it('triggers when negative change exceeds threshold (absolute)', async () => {
      const alert = makeAlert({ type: 'PERCENT_CHANGE', value: 3 })
      mockFindMany.mockResolvedValue([alert])
      mockGetStockQuote.mockResolvedValue(makeQuote(1000, -4.5))

      await checkAlerts()

      expect(mockSendAlertEmail).toHaveBeenCalledTimes(1)
    })

    it('does NOT trigger when change is below threshold', async () => {
      const alert = makeAlert({ type: 'PERCENT_CHANGE', value: 5 })
      mockFindMany.mockResolvedValue([alert])
      mockGetStockQuote.mockResolvedValue(makeQuote(1000, 2.1))

      await checkAlerts()

      expect(mockSendAlertEmail).not.toHaveBeenCalled()
    })
  })

  describe('ticker deduplication', () => {
    it('fetches each ticker only once even with multiple alerts', async () => {
      const alerts = [
        makeAlert({ id: 'a1', symbol: 'RELIANCE', type: 'PRICE_ABOVE', value: 3000 }),
        makeAlert({ id: 'a2', symbol: 'RELIANCE', type: 'PRICE_BELOW', value: 2000 }),
        makeAlert({ id: 'a3', symbol: 'TCS', type: 'PRICE_ABOVE', value: 4000 }),
      ]
      mockFindMany.mockResolvedValue(alerts)
      mockGetStockQuote.mockResolvedValue(makeQuote(2900))

      await checkAlerts()

      // RELIANCE + TCS = 2 unique tickers
      expect(mockGetStockQuote).toHaveBeenCalledTimes(2)
    })
  })

  describe('multiple alerts trigger in one run', () => {
    it('marks all triggered alerts in a single batch update', async () => {
      const alerts = [
        makeAlert({ id: 'a1', symbol: 'RELIANCE', type: 'PRICE_ABOVE', value: 2000 }),
        makeAlert({ id: 'a2', symbol: 'TCS', type: 'PRICE_ABOVE', value: 3000 }),
      ]
      mockFindMany.mockResolvedValue(alerts)
      mockGetStockQuote.mockResolvedValue(makeQuote(5000)) // above all thresholds

      await checkAlerts()

      expect(mockUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: { in: expect.arrayContaining(['a1', 'a2']) } },
        data: expect.objectContaining({ triggered: true }),
      }))
      expect(mockSendAlertEmail).toHaveBeenCalledTimes(2)
    })
  })

  describe('error resilience', () => {
    it('continues checking other tickers when one quote fetch fails', async () => {
      const alerts = [
        makeAlert({ id: 'a1', symbol: 'BROKEN', type: 'PRICE_ABOVE', value: 100 }),
        makeAlert({ id: 'a2', symbol: 'TCS', type: 'PRICE_ABOVE', value: 3000 }),
      ]
      mockFindMany.mockResolvedValue(alerts)
      mockGetStockQuote
        .mockRejectedValueOnce(new Error('quota exceeded'))  // BROKEN fails
        .mockResolvedValueOnce(makeQuote(5000))              // TCS succeeds

      await expect(checkAlerts()).resolves.not.toThrow()
      // TCS alert should still fire
      expect(mockSendAlertEmail).toHaveBeenCalledTimes(1)
    })

    it('does not throw when email send fails', async () => {
      const alert = makeAlert({ type: 'PRICE_ABOVE', value: 100 })
      mockFindMany.mockResolvedValue([alert])
      mockGetStockQuote.mockResolvedValue(makeQuote(200))
      mockSendAlertEmail.mockRejectedValue(new Error('SMTP error'))

      await expect(checkAlerts()).resolves.not.toThrow()
    })

    it('skips email for alert with no user email', async () => {
      const alert = { ...makeAlert({ type: 'PRICE_ABOVE', value: 100 }), user: { email: null, name: 'User' } }
      mockFindMany.mockResolvedValue([alert])
      mockGetStockQuote.mockResolvedValue(makeQuote(200))

      await checkAlerts()

      expect(mockSendAlertEmail).not.toHaveBeenCalled()
      // Should still mark triggered
      expect(mockUpdateMany).toHaveBeenCalled()
    })
  })
})
