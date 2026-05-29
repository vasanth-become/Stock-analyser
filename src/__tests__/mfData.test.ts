/**
 * Tests for mfData.ts — mutual fund catalogue and helpers.
 *
 * Network calls (mfapi.in) are mocked; catalogue data is validated structurally.
 */

// Mock the cache module to bypass caching
jest.mock('@/lib/cache', () => ({
  cacheGetOrSet: jest.fn(async (_key: string, fetcher: () => Promise<unknown>) => fetcher()),
}))

// Mock global fetch so mfapi.in calls don't go out
global.fetch = jest.fn().mockRejectedValue(new Error('network blocked'))

import {
  getFundCatalogue,
  getFundsByCategory,
  getFundsByRisk,
  type MutualFund,
} from '@/lib/mfData'

describe('getFundCatalogue', () => {
  it('returns an array of mutual funds', async () => {
    const funds = await getFundCatalogue()
    expect(Array.isArray(funds)).toBe(true)
    expect(funds.length).toBeGreaterThan(0)
  })

  it('every fund has required fields', async () => {
    const funds = await getFundCatalogue()
    for (const fund of funds) {
      expect(typeof fund.schemeCode).toBe('string')
      expect(typeof fund.schemeName).toBe('string')
      expect(typeof fund.amc).toBe('string')
      expect(typeof fund.category).toBe('string')
      expect(typeof fund.nav).toBe('number')
      expect(typeof fund.minSipAmount).toBe('number')
      expect(typeof fund.fundUrl).toBe('string')
      expect(['Low', 'Moderate', 'High']).toContain(fund.riskLevel)
    }
  })

  it('nav values are positive', async () => {
    const funds = await getFundCatalogue()
    funds.forEach((f) => {
      expect(f.nav).toBeGreaterThan(0)
    })
  })

  it('minSipAmount is a positive number', async () => {
    const funds = await getFundCatalogue()
    funds.forEach((f) => {
      expect(f.minSipAmount).toBeGreaterThan(0)
    })
  })

  it('fundUrl starts with https://', async () => {
    const funds = await getFundCatalogue()
    funds.forEach((f) => {
      expect(f.fundUrl).toMatch(/^https:\/\//)
    })
  })

  it('scheme codes are unique', async () => {
    const funds = await getFundCatalogue()
    const codes = funds.map((f) => f.schemeCode)
    const unique = new Set(codes)
    expect(unique.size).toBe(codes.length)
  })

  it('contains funds across multiple categories', async () => {
    const funds = await getFundCatalogue()
    const categories = new Set(funds.map((f) => f.category))
    expect(categories.size).toBeGreaterThanOrEqual(3)
  })

  it('contains at least one ELSS fund', async () => {
    const funds = await getFundCatalogue()
    expect(funds.some((f) => f.category === 'ELSS')).toBe(true)
  })

  it('contains at least one Index fund', async () => {
    const funds = await getFundCatalogue()
    expect(funds.some((f) => f.category === 'Index')).toBe(true)
  })

  it('falls back to catalogue values when network is unavailable', async () => {
    // fetch is already mocked to reject — should return catalogue without throwing
    const funds = await getFundCatalogue()
    expect(funds.length).toBeGreaterThan(0)
  })
})

describe('getFundsByCategory', () => {
  let catalogue: MutualFund[]

  beforeAll(async () => {
    catalogue = await getFundCatalogue()
  })

  it('returns only funds matching the given category', () => {
    const equity = getFundsByCategory(catalogue, 'Equity')
    expect(equity.length).toBeGreaterThan(0)
    equity.forEach((f) => expect(f.category).toBe('Equity'))
  })

  it('matches by subCategory as well', () => {
    const largeCap = getFundsByCategory(catalogue, 'Large Cap')
    expect(largeCap.length).toBeGreaterThan(0)
    largeCap.forEach((f) => expect(f.subCategory).toBe('Large Cap'))
  })

  it('returns empty array for unknown category', () => {
    const result = getFundsByCategory(catalogue, 'CryptoBonds')
    expect(result).toEqual([])
  })

  it('returns ELSS funds', () => {
    const elss = getFundsByCategory(catalogue, 'ELSS')
    expect(elss.length).toBeGreaterThan(0)
  })
})

describe('getFundsByRisk', () => {
  let catalogue: MutualFund[]

  beforeAll(async () => {
    catalogue = await getFundCatalogue()
  })

  it('returns Low risk funds', () => {
    const funds = getFundsByRisk(catalogue, 'Low')
    expect(funds.length).toBeGreaterThan(0)
    funds.forEach((f) => expect(f.riskLevel).toBe('Low'))
  })

  it('returns Moderate risk funds', () => {
    const funds = getFundsByRisk(catalogue, 'Moderate')
    expect(funds.length).toBeGreaterThan(0)
    funds.forEach((f) => expect(f.riskLevel).toBe('Moderate'))
  })

  it('returns High risk funds', () => {
    const funds = getFundsByRisk(catalogue, 'High')
    expect(funds.length).toBeGreaterThan(0)
    funds.forEach((f) => expect(f.riskLevel).toBe('High'))
  })

  it('Low risk funds have lower avg expected return than High risk', () => {
    const low = getFundsByRisk(catalogue, 'Low')
    const high = getFundsByRisk(catalogue, 'High')

    const avgReturn5y = (funds: MutualFund[]) => {
      const valid = funds.filter((f) => f.return5y !== null)
      return valid.reduce((s, f) => s + f.return5y!, 0) / valid.length
    }

    const lowAvg = avgReturn5y(low)
    const highAvg = avgReturn5y(high)

    expect(highAvg).toBeGreaterThan(lowAvg)
  })
})

describe('MutualFund data integrity', () => {
  it('returns are consistent (1y <= 5y generally for equity funds)', async () => {
    // This is a soft check — not universally true but holds for our catalogue
    const funds = await getFundCatalogue()
    const equityFunds = funds.filter(
      (f) => f.category === 'Equity' && f.return1y !== null && f.return5y !== null
    )
    // At least some equity funds should have 5y > 1y (long-term compounding)
    const hasLongTermOutperformers = equityFunds.some((f) => f.return5y! > f.return1y!)
    expect(hasLongTermOutperformers).toBe(true)
  })

  it('all expense ratios are below 2.5% (SEBI direct fund cap)', async () => {
    const funds = await getFundCatalogue()
    funds
      .filter((f) => f.expenseRatio !== null)
      .forEach((f) => {
        expect(f.expenseRatio!).toBeLessThan(2.5)
      })
  })
})
