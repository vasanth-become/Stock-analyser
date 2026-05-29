import { buildAnalysisPrompt, RecommendationSchema, AnalysisResultSchema } from '@/lib/analysisEngine'
import type { InvestorProfile } from '@prisma/client'
import type { SectorPerformance, MarketMover } from '@/lib/marketData'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockProfile: InvestorProfile = {
  id: 'prof_1',
  userId: 'user_1',
  displayName: 'Test Investor',
  age: 30,
  monthlyIncome: 100_000,
  experience: 'INTERMEDIATE',
  riskScore: 32,
  riskTolerance: 'MODERATE',
  investmentGoals: ['Wealth creation', 'Tax saving'],
  sectorPreferences: ['IT', 'Banking'],
  sipBudget: 10_000,
  hasLumpSum: true,
  lumpSumAmount: 200_000,
  investmentHorizon: 'MEDIUM_TERM',
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockSectors: SectorPerformance[] = [
  { sector: 'IT', index: 'NIFTY IT', value: 38000, change: 200, changePercent: 0.53, color: 'green' },
  { sector: 'Banking', index: 'NIFTY BANK', value: 52000, change: -300, changePercent: -0.57, color: 'red' },
  { sector: 'Pharma', index: 'NIFTY PHARMA', value: 19000, change: 50, changePercent: 0.26, color: 'green' },
]

const mockGainers: MarketMover[] = [
  { symbol: 'WIPRO', companyName: 'Wipro', price: 500, change: 15, changePercent: 3.1, volume: 2_000_000, marketCap: null },
  { symbol: 'INFY', companyName: 'Infosys', price: 1800, change: 40, changePercent: 2.3, volume: 1_500_000, marketCap: null },
]

const mockLosers: MarketMover[] = [
  { symbol: 'HDFCBANK', companyName: 'HDFC Bank', price: 1550, change: -20, changePercent: -1.3, volume: 3_000_000, marketCap: null },
]

// ─── buildAnalysisPrompt ──────────────────────────────────────────────────────

describe('buildAnalysisPrompt', () => {
  let prompt: string

  beforeAll(() => {
    prompt = buildAnalysisPrompt(mockProfile, mockSectors, mockGainers, mockLosers)
  })

  it('includes investor risk label', () => {
    // riskScore 32 → Moderate
    expect(prompt).toContain('Moderate')
  })

  it('includes investment goals', () => {
    expect(prompt).toContain('Wealth creation')
    expect(prompt).toContain('Tax saving')
  })

  it('includes sector preferences', () => {
    expect(prompt).toContain('IT')
    expect(prompt).toContain('Banking')
  })

  it('includes SIP budget formatted in INR', () => {
    expect(prompt).toContain('10,000')
  })

  it('includes experience level', () => {
    expect(prompt).toContain('INTERMEDIATE')
  })

  it('includes monthly income', () => {
    expect(prompt).toContain('1,00,000')
  })

  it('includes horizon label', () => {
    expect(prompt).toContain('Medium-term')
  })

  it('includes top sector performance data', () => {
    expect(prompt).toContain('IT')
    expect(prompt).toContain('Banking')
  })

  it('includes top gainers', () => {
    expect(prompt).toContain('WIPRO')
    expect(prompt).toContain('INFY')
  })

  it('includes top losers', () => {
    expect(prompt).toContain('HDFCBANK')
  })

  it('requests JSON output with required fields', () => {
    expect(prompt).toContain('"recommendations"')
    expect(prompt).toContain('"ticker"')
    expect(prompt).toContain('"confidenceScore"')
    expect(prompt).toContain('"buyZone"')
    expect(prompt).toContain('"stopLoss"')
    expect(prompt).toContain('"targetPrice"')
  })

  it('does not ask for markdown', () => {
    expect(prompt.toLowerCase()).toContain('no markdown')
  })

  describe('with Conservative profile', () => {
    it('labels risk as Conservative for low score', () => {
      const conservativeProfile = { ...mockProfile, riskScore: 20 }
      const p = buildAnalysisPrompt(conservativeProfile, mockSectors, mockGainers, mockLosers)
      expect(p).toContain('Conservative')
    })
  })

  describe('with Aggressive profile', () => {
    it('labels risk as Aggressive for high score', () => {
      const aggressiveProfile = { ...mockProfile, riskScore: 45 }
      const p = buildAnalysisPrompt(aggressiveProfile, mockSectors, mockGainers, mockLosers)
      expect(p).toContain('Aggressive')
    })
  })

  describe('with null riskScore', () => {
    it('falls back to Moderate when riskScore is null', () => {
      const p = buildAnalysisPrompt({ ...mockProfile, riskScore: null }, mockSectors, mockGainers, mockLosers)
      expect(p).toContain('Moderate')
    })
  })

  describe('investment horizon variants', () => {
    it('shows short-term label', () => {
      const p = buildAnalysisPrompt({ ...mockProfile, investmentHorizon: 'SHORT_TERM' }, mockSectors, mockGainers, mockLosers)
      expect(p).toContain('Short-term')
    })

    it('shows long-term label', () => {
      const p = buildAnalysisPrompt({ ...mockProfile, investmentHorizon: 'LONG_TERM' }, mockSectors, mockGainers, mockLosers)
      expect(p).toContain('Long-term')
    })

    it('defaults to medium-term when horizon is null', () => {
      const p = buildAnalysisPrompt({ ...mockProfile, investmentHorizon: null }, mockSectors, mockGainers, mockLosers)
      expect(p).toContain('Medium-term')
    })
  })
})

// ─── Zod schemas ──────────────────────────────────────────────────────────────

describe('RecommendationSchema', () => {
  const validRec = {
    name: 'Reliance Industries',
    ticker: 'RELIANCE',
    type: 'Stock',
    sector: 'Energy',
    riskLevel: 'Moderate',
    expectedReturn: '14–18% p.a.',
    suggestedAmount: 15000,
    pe: 28.5,
    marketCap: 'Large Cap',
    confidenceScore: 78,
    reasoning: 'Strong fundamentals with diversified revenue streams across telecom and retail segments.',
    buyZone: { low: 2800, high: 2950 },
    stopLoss: 2600,
    targetPrice: 3200,
    tags: ['Blue Chip', 'Dividend'],
  }

  it('accepts a valid recommendation', () => {
    expect(() => RecommendationSchema.parse(validRec)).not.toThrow()
  })

  it('rejects confidenceScore above 100', () => {
    const bad = { ...validRec, confidenceScore: 101 }
    expect(() => RecommendationSchema.parse(bad)).toThrow()
  })

  it('rejects confidenceScore below 0', () => {
    const bad = { ...validRec, confidenceScore: -1 }
    expect(() => RecommendationSchema.parse(bad)).toThrow()
  })

  it('rejects invalid type enum', () => {
    const bad = { ...validRec, type: 'Bond' }
    expect(() => RecommendationSchema.parse(bad)).toThrow()
  })

  it('rejects invalid riskLevel', () => {
    const bad = { ...validRec, riskLevel: 'Ultra' }
    expect(() => RecommendationSchema.parse(bad)).toThrow()
  })

  it('allows null pe', () => {
    const rec = { ...validRec, pe: null }
    expect(() => RecommendationSchema.parse(rec)).not.toThrow()
  })

  it('allows all valid types', () => {
    for (const type of ['Stock', 'SIP', 'ETF', 'ELSS']) {
      expect(() => RecommendationSchema.parse({ ...validRec, type })).not.toThrow()
    }
  })
})

describe('AnalysisResultSchema', () => {
  const makeRec = (ticker: string) => ({
    name: `${ticker} Fund`,
    ticker,
    type: 'Stock' as const,
    sector: 'IT',
    riskLevel: 'Moderate' as const,
    expectedReturn: '15% p.a.',
    suggestedAmount: 10000,
    pe: 25,
    marketCap: 'Large Cap',
    confidenceScore: 75,
    reasoning: 'Strong sector tailwinds.',
    buyZone: { low: 1000, high: 1100 },
    stopLoss: 900,
    targetPrice: 1300,
    tags: ['Growth'],
  })

  it('accepts 5 recommendations', () => {
    const result = {
      recommendations: Array.from({ length: 5 }, (_, i) => makeRec(`STOCK${i}`)),
      summary: 'Balanced portfolio strategy.',
      marketOutlook: 'Markets look positive.',
    }
    expect(() => AnalysisResultSchema.parse(result)).not.toThrow()
  })

  it('rejects fewer than 5 recommendations', () => {
    const result = {
      recommendations: [makeRec('A'), makeRec('B'), makeRec('C'), makeRec('D')],
      summary: 'Too few.',
      marketOutlook: 'ok',
    }
    expect(() => AnalysisResultSchema.parse(result)).toThrow()
  })

  it('rejects more than 8 recommendations', () => {
    const result = {
      recommendations: Array.from({ length: 9 }, (_, i) => makeRec(`S${i}`)),
      summary: 'Too many.',
      marketOutlook: 'ok',
    }
    expect(() => AnalysisResultSchema.parse(result)).toThrow()
  })

  it('rejects missing summary', () => {
    const result = {
      recommendations: Array.from({ length: 5 }, (_, i) => makeRec(`S${i}`)),
      marketOutlook: 'ok',
    }
    expect(() => AnalysisResultSchema.parse(result)).toThrow()
  })
})
