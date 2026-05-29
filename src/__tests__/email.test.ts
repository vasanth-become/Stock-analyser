/**
 * Tests for email.ts — HTML generation and send behaviour.
 *
 * The Resend SDK is mocked; tests verify template content and error handling.
 */

// Mock Resend before importing email module
const mockSend = jest.fn()
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}))

import { sendAlertEmail, sendDigestEmail, type AlertEmailData, type DigestEmailData } from '@/lib/email'

const ALERT_DATA: AlertEmailData = {
  to: 'investor@example.com',
  name: 'Priya',
  symbol: 'RELIANCE',
  exchange: 'NSE',
  alertType: 'PRICE_ABOVE',
  threshold: 3000,
  currentPrice: 3150,
  currentChange: 2.3,
}

const DIGEST_DATA: DigestEmailData = {
  to: 'investor@example.com',
  name: 'Priya',
  weekRange: '26 May – 1 Jun 2025',
  indexSummary: [
    { name: 'NIFTY 50', changePercent: 1.2 },
    { name: 'SENSEX', changePercent: 1.1 },
  ],
  watchlistItems: [
    { symbol: 'TCS', companyName: 'Tata Consultancy Services', changePercent: 2.4 },
    { symbol: 'HDFCBANK', companyName: 'HDFC Bank', changePercent: -0.8 },
  ],
  aiRecommendation: 'IT sector continues to look attractive given strong order book guidance.',
}

describe('sendAlertEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.RESEND_API_KEY = 're_test_key'
    mockSend.mockResolvedValue({ data: { id: 'email_1' }, error: null })
  })

  afterEach(() => {
    delete process.env.RESEND_API_KEY
  })

  it('calls resend.emails.send with correct recipient', async () => {
    await sendAlertEmail(ALERT_DATA)
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'investor@example.com' })
    )
  })

  it('includes stock symbol in subject for PRICE_ABOVE', async () => {
    await sendAlertEmail(ALERT_DATA)
    const call = mockSend.mock.calls[0][0]
    expect(call.subject).toContain('RELIANCE')
    expect(call.subject).toContain('3,000')
  })

  it('generates different subject for PRICE_BELOW', async () => {
    const data = { ...ALERT_DATA, alertType: 'PRICE_BELOW', threshold: 2000, currentPrice: 1900 }
    await sendAlertEmail(data)
    const call = mockSend.mock.calls[0][0]
    expect(call.subject.toLowerCase()).toContain('below')
  })

  it('generates PERCENT_CHANGE subject', async () => {
    const data = { ...ALERT_DATA, alertType: 'PERCENT_CHANGE', threshold: 3 }
    await sendAlertEmail(data)
    const call = mockSend.mock.calls[0][0]
    expect(call.subject).toContain('RELIANCE')
  })

  it('HTML contains the investor name', async () => {
    await sendAlertEmail(ALERT_DATA)
    const call = mockSend.mock.calls[0][0]
    expect(call.html).toContain('Priya')
  })

  it('HTML contains current price', async () => {
    await sendAlertEmail(ALERT_DATA)
    const call = mockSend.mock.calls[0][0]
    expect(call.html).toContain('3,150')
  })

  it('HTML contains the symbol', async () => {
    await sendAlertEmail(ALERT_DATA)
    const call = mockSend.mock.calls[0][0]
    expect(call.html).toContain('RELIANCE')
  })

  it('returns true on success', async () => {
    const result = await sendAlertEmail(ALERT_DATA)
    expect(result).toBe(true)
  })

  it('returns false when Resend returns an error object', async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: 'invalid api key' } })
    const result = await sendAlertEmail(ALERT_DATA)
    expect(result).toBe(false)
  })

  it('returns false and does not throw when Resend throws', async () => {
    mockSend.mockRejectedValue(new Error('network error'))
    await expect(sendAlertEmail(ALERT_DATA)).resolves.toBe(false)
  })

  it('returns false and skips send when RESEND_API_KEY is not set', async () => {
    delete process.env.RESEND_API_KEY
    const result = await sendAlertEmail(ALERT_DATA)
    expect(result).toBe(false)
    expect(mockSend).not.toHaveBeenCalled()
  })
})

describe('sendDigestEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.RESEND_API_KEY = 're_test_key'
    mockSend.mockResolvedValue({ data: { id: 'email_2' }, error: null })
  })

  afterEach(() => {
    delete process.env.RESEND_API_KEY
  })

  it('sends to the correct recipient', async () => {
    await sendDigestEmail(DIGEST_DATA)
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'investor@example.com' })
    )
  })

  it('includes week range in subject', async () => {
    await sendDigestEmail(DIGEST_DATA)
    const call = mockSend.mock.calls[0][0]
    expect(call.subject).toContain('26 May – 1 Jun 2025')
  })

  it('HTML contains the investor name', async () => {
    await sendDigestEmail(DIGEST_DATA)
    const { html } = mockSend.mock.calls[0][0]
    expect(html).toContain('Priya')
  })

  it('HTML contains index names', async () => {
    await sendDigestEmail(DIGEST_DATA)
    const { html } = mockSend.mock.calls[0][0]
    expect(html).toContain('NIFTY 50')
    expect(html).toContain('SENSEX')
  })

  it('HTML contains watchlist symbols', async () => {
    await sendDigestEmail(DIGEST_DATA)
    const { html } = mockSend.mock.calls[0][0]
    expect(html).toContain('TCS')
    expect(html).toContain('HDFCBANK')
  })

  it('HTML contains AI recommendation text', async () => {
    await sendDigestEmail(DIGEST_DATA)
    const { html } = mockSend.mock.calls[0][0]
    expect(html).toContain('IT sector continues to look attractive')
  })

  it('HTML contains disclaimer', async () => {
    await sendDigestEmail(DIGEST_DATA)
    const { html } = mockSend.mock.calls[0][0]
    expect(html.toLowerCase()).toContain('sebi')
  })

  it('shows positive index change with ▲', async () => {
    await sendDigestEmail(DIGEST_DATA)
    const { html } = mockSend.mock.calls[0][0]
    expect(html).toContain('▲')
  })

  it('shows negative watchlist change with ▼', async () => {
    await sendDigestEmail(DIGEST_DATA)
    const { html } = mockSend.mock.calls[0][0]
    expect(html).toContain('▼')
  })

  it('returns false without RESEND_API_KEY', async () => {
    delete process.env.RESEND_API_KEY
    const result = await sendDigestEmail(DIGEST_DATA)
    expect(result).toBe(false)
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('handles empty watchlist gracefully', async () => {
    const data = { ...DIGEST_DATA, watchlistItems: [] }
    await expect(sendDigestEmail(data)).resolves.not.toThrow()
    const { html } = mockSend.mock.calls[0][0]
    expect(html).toContain('No watchlist')
  })
})
