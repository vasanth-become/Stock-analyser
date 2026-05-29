/**
 * Tests for marketData.ts
 *
 * Yahoo Finance and the in-memory cache are isolated via Jest mocks so tests
 * are fast and fully deterministic regardless of network availability.
 */

// Mock the cache module so every test gets a clean slate without redis
jest.mock('@/lib/cache', () => ({
  cacheGetOrSet: jest.fn(async (_key: string, fetcher: () => Promise<unknown>) => fetcher()),
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheSet: jest.fn().mockResolvedValue(undefined),
  cacheInvalidate: jest.fn(),
}))

// Mock yahoo-finance2 so no real HTTP calls are made
jest.mock('yahoo-finance2', () => {
  const mockQuote = {
    regularMarketPrice: 2500,
    shortName: 'Reliance Industries',
    regularMarketChange: 30,
    regularMarketChangePercent: 1.2,
    regularMarketOpen: 2470,
    regularMarketDayHigh: 2520,
    regularMarketDayLow: 2460,
    regularMarketPreviousClose: 2470,
    regularMarketVolume: 5_000_000,
    averageDailyVolume3Month: 4_500_000,
    fiftyTwoWeekHigh: 2800,
    fiftyTwoWeekLow: 1900,
    marketCap: 1_700_000_000_000,
    trailingPE: 28.5,
    epsTrailingTwelveMonths: 87.7,
    dividendYield: 0.004,
    bookValue: 650,
    priceToBook: 3.8,
    beta: 1.1,
    returnOnEquity: 0.15,
    sector: 'Energy',
    regularMarketTime: new Date(),
  }

  return {
    default: jest.fn().mockImplementation(() => ({
      quote: jest.fn().mockResolvedValue(mockQuote),
      search: jest.fn().mockResolvedValue({
        quotes: [
          { symbol: 'RELIANCE.NS', shortname: 'Reliance Industries', exchDisp: 'NSE', typeDisp: 'Equity' },
        ],
      }),
    })),
  }
})

import { getStockQuote, getStockFundamentals, isMarketOpen, searchStocks } from '@/lib/marketData'

describe('isMarketOpen', () => {
  const setIST = (day: number, hour: number, minute = 0) => {
    // IST = UTC+5:30
    const d = new Date()
    // Set to a specific UTC time that maps to the given IST hour
    const istOffsetMs = 5.5 * 60 * 60 * 1000
    d.setUTCFullYear(2025, 0, 6 + day) // Jan 6 2025 is Monday (day 0)
    d.setUTCHours(hour - 5, minute - 30, 0, 0)
    // Adjust for negative minutes
    if (minute < 30) {
      d.setUTCHours(hour - 6, minute + 30, 0, 0)
    }
    jest.setSystemTime(d)
  }

  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('returns false on Saturday', () => {
    // Jan 11 2025 is Saturday
    const saturday = new Date('2025-01-11T06:00:00Z') // 11:30 IST Saturday
    jest.setSystemTime(saturday)
    expect(isMarketOpen()).toBe(false)
  })

  it('returns false on Sunday', () => {
    const sunday = new Date('2025-01-12T06:00:00Z') // 11:30 IST Sunday
    jest.setSystemTime(sunday)
    expect(isMarketOpen()).toBe(false)
  })

  it('returns false before 9:15 AM IST on a weekday', () => {
    // Monday at 3:30 UTC = 9:00 IST (before 9:15)
    const early = new Date('2025-01-13T03:30:00Z')
    jest.setSystemTime(early)
    expect(isMarketOpen()).toBe(false)
  })

  it('returns true at 9:15 AM IST on a weekday', () => {
    // Monday at 3:45 UTC = 9:15 IST exactly
    const open = new Date('2025-01-13T03:45:00Z')
    jest.setSystemTime(open)
    expect(isMarketOpen()).toBe(true)
  })

  it('returns true at noon IST on a weekday', () => {
    // Monday at 6:30 UTC = 12:00 IST
    const midday = new Date('2025-01-13T06:30:00Z')
    jest.setSystemTime(midday)
    expect(isMarketOpen()).toBe(true)
  })

  it('returns true at 3:29 PM IST (one minute before close)', () => {
    // Monday at 9:59 UTC = 15:29 IST
    const almostClose = new Date('2025-01-13T09:59:00Z')
    jest.setSystemTime(almostClose)
    expect(isMarketOpen()).toBe(true)
  })

  it('returns false at 3:31 PM IST (after close)', () => {
    // Monday at 10:01 UTC = 15:31 IST
    const afterClose = new Date('2025-01-13T10:01:00Z')
    jest.setSystemTime(afterClose)
    expect(isMarketOpen()).toBe(false)
  })
})

describe('getStockQuote', () => {
  it('returns a StockQuote with expected shape', async () => {
    const q = await getStockQuote('RELIANCE', 'NSE')
    expect(q).toMatchObject({
      symbol: 'RELIANCE',
      exchange: 'NSE',
      price: expect.any(Number),
      change: expect.any(Number),
      changePercent: expect.any(Number),
      companyName: expect.any(String),
      volume: expect.any(Number),
    })
  })

  it('returns price > 0', async () => {
    const q = await getStockQuote('TCS', 'NSE')
    expect(q.price).toBeGreaterThan(0)
  })

  it('falls back to mock data when Yahoo Finance throws', async () => {
    // Re-mock yahoo-finance2 to throw
    const yf2 = require('yahoo-finance2')
    yf2.default.mockImplementationOnce(() => ({
      quote: jest.fn().mockRejectedValue(new Error('network error')),
    }))

    // Should not throw — fallback kicks in
    const q = await getStockQuote('RELIANCE', 'NSE')
    expect(q.price).toBeGreaterThan(0)
    expect(q.symbol).toBe('RELIANCE')
  })

  it('BSE exchange sets exchange field correctly', async () => {
    const q = await getStockQuote('RELIANCE', 'BSE')
    expect(q.exchange).toBe('BSE')
  })
})

describe('getStockFundamentals', () => {
  it('returns fundamentals with pe and sector fields', async () => {
    const f = await getStockFundamentals('RELIANCE', 'NSE')
    expect(f).toMatchObject({
      symbol: 'RELIANCE',
      pe: expect.any(Number),
      sector: expect.any(String),
    })
  })

  it('returns null fields gracefully when Yahoo returns nothing', async () => {
    const yf2 = require('yahoo-finance2')
    yf2.default.mockImplementationOnce(() => ({
      quote: jest.fn().mockResolvedValue({}),
    }))
    const f = await getStockFundamentals('UNKNOWN', 'NSE')
    expect(f.symbol).toBe('UNKNOWN')
    // pe and others may be null — should not throw
    expect(f).toHaveProperty('pe')
  })
})

describe('searchStocks', () => {
  it('returns search results array', async () => {
    const results = await searchStocks('reliance')
    expect(Array.isArray(results)).toBe(true)
  })

  it('returns results with symbol and name', async () => {
    const results = await searchStocks('reliance')
    if (results.length > 0) {
      expect(results[0]).toHaveProperty('symbol')
      expect(results[0]).toHaveProperty('name')
    }
  })

  it('returns empty array for empty query', async () => {
    const results = await searchStocks('')
    expect(results).toEqual([])
  })
})
