import {
  buildAnalysisPrompt,
  RecommendationSchema,
  AriaOutputSchema,
  ARIA_SYSTEM_PROMPT,
  type MarketContext,
} from '@/lib/analysisEngine'
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

const mockCtx: Partial<MarketContext> = {
  date: '2025-06-01',
  marketMood: 'Bullish',
  fiiActivity: 'Buying',
  rbiStance: 'Neutral',
  usdInr: 83.5,
  indices: [
    { symbol: '^NSEI', name: 'NIFTY 50', value: 24500, change: 196, changePercent: 0.8 },
    { symbol: '^BSESN', name: 'SENSEX', value: 80200, change: 600, changePercent: 0.75 },
  ],
}

// ─── ARIA_SYSTEM_PROMPT ───────────────────────────────────────────────────────

describe('ARIA_SYSTEM_PROMPT', () => {
  it('is a non-empty string', () => {
    expect(typeof ARIA_SYSTEM_PROMPT).toBe('string')
    expect(ARIA_SYSTEM_PROMPT.length).toBeGreaterThan(500)
  })

  it('mentions ARIA by name', () => {
    expect(ARIA_SYSTEM_PROMPT).toContain('ARIA')
  })

  it('references NSE and BSE', () => {
    expect(ARIA_SYSTEM_PROMPT).toContain('NSE')
    expect(ARIA_SYSTEM_PROMPT).toContain('BSE')
  })

  it('includes SEBI compliance reference', () => {
    expect(ARIA_SYSTEM_PROMPT).toContain('SEBI')
  })

  it('instructs strict JSON-only output with no markdown', () => {
    expect(ARIA_SYSTEM_PROMPT.toLowerCase()).toContain('json')
    expect(ARIA_SYSTEM_PROMPT).toContain('No markdown')
  })

  it('defines the 6-step analysis framework', () => {
    expect(ARIA_SYSTEM_PROMPT).toContain('Step 1')
    expect(ARIA_SYSTEM_PROMPT).toContain('Step 6')
  })

  it('specifies confidence score bounds (60–95)', () => {
    expect(ARIA_SYSTEM_PROMPT).toContain('60')
    expect(ARIA_SYSTEM_PROMPT).toContain('95')
  })

  it('includes quality rules for ELSS on tax-saving goal', () => {
    expect(ARIA_SYSTEM_PROMPT).toContain('ELSS')
  })

  it('prescribes Bearish market behaviour', () => {
    expect(ARIA_SYSTEM_PROMPT).toContain('Bearish')
  })
})

// ─── buildAnalysisPrompt ──────────────────────────────────────────────────────

describe('buildAnalysisPrompt', () => {
  let parsed: { userProfile: Record<string, unknown>; marketContext: Record<string, unknown> }

  beforeAll(() => {
    const raw = buildAnalysisPrompt(mockProfile, mockSectors, mockGainers, mockLosers, mockCtx)
    parsed = JSON.parse(raw)
  })

  it('produces valid JSON', () => {
    expect(parsed).toBeDefined()
    expect(typeof parsed).toBe('object')
  })

  it('includes both userProfile and marketContext keys', () => {
    expect(parsed).toHaveProperty('userProfile')
    expect(parsed).toHaveProperty('marketContext')
  })

  describe('userProfile section', () => {
    it('maps riskScore 32 to "Moderate"', () => {
      expect(parsed.userProfile.riskProfile).toBe('Moderate')
    })

    it('maps MEDIUM_TERM horizon to "medium"', () => {
      expect(parsed.userProfile.horizon).toBe('medium')
    })

    it('includes sector preferences', () => {
      expect(parsed.userProfile.sectors).toEqual(expect.arrayContaining(['IT', 'Banking']))
    })

    it('sets monthlyBudget from sipBudget', () => {
      expect(parsed.userProfile.monthlyBudget).toBe(10_000)
    })

    it('sets lumpSumAvailable when hasLumpSum is true', () => {
      expect(parsed.userProfile.lumpSumAvailable).toBe(200_000)
    })

    it('sets lumpSumAvailable to 0 when hasLumpSum is false', () => {
      const raw = buildAnalysisPrompt(
        { ...mockProfile, hasLumpSum: false },
        mockSectors, mockGainers, mockLosers,
      )
      const p = JSON.parse(raw)
      expect(p.userProfile.lumpSumAvailable).toBe(0)
    })

    it('maps SHORT_TERM horizon to "short"', () => {
      const raw = buildAnalysisPrompt(
        { ...mockProfile, investmentHorizon: 'SHORT_TERM' },
        mockSectors, mockGainers, mockLosers,
      )
      expect(JSON.parse(raw).userProfile.horizon).toBe('short')
    })

    it('maps LONG_TERM horizon to "long"', () => {
      const raw = buildAnalysisPrompt(
        { ...mockProfile, investmentHorizon: 'LONG_TERM' },
        mockSectors, mockGainers, mockLosers,
      )
      expect(JSON.parse(raw).userProfile.horizon).toBe('long')
    })

    it('maps low riskScore (≤24) to "Conservative"', () => {
      const raw = buildAnalysisPrompt(
        { ...mockProfile, riskScore: 20 },
        mockSectors, mockGainers, mockLosers,
      )
      expect(JSON.parse(raw).userProfile.riskProfile).toBe('Conservative')
    })

    it('maps high riskScore (>37) to "Aggressive"', () => {
      const raw = buildAnalysisPrompt(
        { ...mockProfile, riskScore: 45 },
        mockSectors, mockGainers, mockLosers,
      )
      expect(JSON.parse(raw).userProfile.riskProfile).toBe('Aggressive')
    })

    it('defaults to "Moderate" when riskScore is null', () => {
      const raw = buildAnalysisPrompt(
        { ...mockProfile, riskScore: null },
        mockSectors, mockGainers, mockLosers,
      )
      expect(JSON.parse(raw).userProfile.riskProfile).toBe('Moderate')
    })

    it('sets age from profile', () => {
      expect(parsed.userProfile.age).toBe(30)
    })
  })

  describe('marketContext section', () => {
    it('uses the provided date', () => {
      expect(parsed.marketContext.date).toBe('2025-06-01')
    })

    it('uses the provided marketMood', () => {
      expect(parsed.marketContext.marketMood).toBe('Bullish')
    })

    it('includes sectorPerformance as a key-value map', () => {
      const sp = parsed.marketContext.sectorPerformance as Record<string, number>
      expect(sp['IT']).toBeCloseTo(0.53)
      expect(sp['Banking']).toBeCloseTo(-0.57)
    })

    it('includes topGainers with ticker and change fields', () => {
      const gainers = parsed.marketContext.topGainers as Array<{ ticker: string; change: number }>
      expect(gainers.some((g) => g.ticker === 'WIPRO')).toBe(true)
      expect(gainers.some((g) => g.ticker === 'INFY')).toBe(true)
    })

    it('includes topLosers', () => {
      const losers = parsed.marketContext.topLosers as Array<{ ticker: string }>
      expect(losers.some((l) => l.ticker === 'HDFCBANK')).toBe(true)
    })

    it('includes fiiActivity', () => {
      expect(parsed.marketContext.fiiActivity).toBe('Buying')
    })

    it('includes rbiStance', () => {
      expect(parsed.marketContext.rbiStance).toBe('Neutral')
    })

    it('includes usdInr', () => {
      expect(parsed.marketContext.usdInr).toBe(83.5)
    })

    it('derives marketMood from sector average when no ctx provided', () => {
      const raw = buildAnalysisPrompt(mockProfile, mockSectors, mockGainers, mockLosers)
      const p = JSON.parse(raw)
      expect(['Bullish', 'Neutral', 'Bearish']).toContain(p.marketContext.marketMood)
    })

    it('caps topGainers at 5 entries', () => {
      const manyGainers: MarketMover[] = Array.from({ length: 10 }, (_, i) => ({
        symbol: `STOCK${i}`, companyName: `Co ${i}`, price: 100, change: 2, changePercent: 2, volume: 1000, marketCap: null,
      }))
      const raw = buildAnalysisPrompt(mockProfile, mockSectors, manyGainers, mockLosers)
      const p = JSON.parse(raw)
      expect((p.marketContext.topGainers as unknown[]).length).toBeLessThanOrEqual(5)
    })
  })
})

// ─── RecommendationSchema ─────────────────────────────────────────────────────

describe('RecommendationSchema', () => {
  const validRec = {
    rank: 1,
    isFeatured: true,
    name: 'Reliance Industries',
    ticker: 'RELIANCE',
    type: 'Stock',
    sector: 'Energy',
    marketCap: 'Large Cap',
    riskLevel: 'Medium',
    currentPrice: 2950,
    buyZone: { low: 2800, high: 2960 },
    stopLoss: 2600,
    targetPrice12m: 3400,
    expectedReturn: '14–18% p.a.',
    suggestedAmount: '₹3,000/month SIP',
    confidenceScore: 78,
    pe: '22.4',
    dividendYield: '1.8%',
    tags: ['Blue Chip', 'Dividend'],
    reasoning: {
      whyNow: 'Strong support near 200-DMA, FII buying picking up.',
      whyYou: 'Fits moderate profile with 3–5 year horizon.',
      keyRisk: 'Global oil price volatility can compress refining margins.',
    },
  }

  it('accepts a fully valid recommendation', () => {
    expect(() => RecommendationSchema.parse(validRec)).not.toThrow()
  })

  it('rejects confidenceScore above 95', () => {
    expect(() => RecommendationSchema.parse({ ...validRec, confidenceScore: 96 })).toThrow()
  })

  it('rejects confidenceScore below 60', () => {
    expect(() => RecommendationSchema.parse({ ...validRec, confidenceScore: 59 })).toThrow()
  })

  it('accepts boundary confidenceScores 60 and 95', () => {
    expect(() => RecommendationSchema.parse({ ...validRec, confidenceScore: 60 })).not.toThrow()
    expect(() => RecommendationSchema.parse({ ...validRec, confidenceScore: 95 })).not.toThrow()
  })

  it('rejects invalid type enum', () => {
    expect(() => RecommendationSchema.parse({ ...validRec, type: 'Bond' })).toThrow()
  })

  it('rejects invalid riskLevel (old "Moderate" value)', () => {
    expect(() => RecommendationSchema.parse({ ...validRec, riskLevel: 'Moderate' })).toThrow()
  })

  it('accepts all valid types: Stock, SIP, ETF, ELSS', () => {
    for (const type of ['Stock', 'SIP', 'ETF', 'ELSS']) {
      expect(() => RecommendationSchema.parse({ ...validRec, type })).not.toThrow()
    }
  })

  it('accepts all valid riskLevels: Low, Medium, High', () => {
    for (const riskLevel of ['Low', 'Medium', 'High']) {
      expect(() => RecommendationSchema.parse({ ...validRec, riskLevel })).not.toThrow()
    }
  })

  it('allows optional currentPrice to be absent', () => {
    const { currentPrice: _, ...withoutPrice } = validRec
    expect(() => RecommendationSchema.parse(withoutPrice)).not.toThrow()
  })

  it('allows null pe and null dividendYield', () => {
    expect(() => RecommendationSchema.parse({ ...validRec, pe: null, dividendYield: null })).not.toThrow()
  })

  it('requires reasoning to be an object (not a plain string)', () => {
    expect(() => RecommendationSchema.parse({ ...validRec, reasoning: 'plain text' })).toThrow()
  })

  it('requires reasoning.whyNow, whyYou, keyRisk all present', () => {
    const bad = { ...validRec, reasoning: { whyNow: 'ok', whyYou: 'ok' } } // missing keyRisk
    expect(() => RecommendationSchema.parse(bad)).toThrow()
  })

  it('requires isFeatured to be a boolean', () => {
    expect(() => RecommendationSchema.parse({ ...validRec, isFeatured: 'yes' })).toThrow()
  })

  it('requires rank to be a positive integer', () => {
    expect(() => RecommendationSchema.parse({ ...validRec, rank: 0 })).toThrow()
    expect(() => RecommendationSchema.parse({ ...validRec, rank: -1 })).toThrow()
  })
})

// ─── AriaOutputSchema ─────────────────────────────────────────────────────────

describe('AriaOutputSchema', () => {
  const makeRec = (rank: number, isFeatured = false) => ({
    rank,
    isFeatured,
    name: `Stock ${rank}`,
    ticker: `STOCK${rank}`,
    type: 'Stock' as const,
    sector: 'IT',
    marketCap: 'Large Cap',
    riskLevel: 'Medium' as const,
    buyZone: { low: 1000, high: 1100 },
    stopLoss: 900,
    targetPrice12m: 1300,
    expectedReturn: '15% p.a.',
    suggestedAmount: '₹2,000/month',
    confidenceScore: 75,
    pe: '25',
    dividendYield: 'N/A',
    tags: ['Growth'],
    reasoning: { whyNow: 'Good entry', whyYou: 'Fits profile', keyRisk: 'Sector slowdown' },
  })

  const validOutput = {
    generatedAt: new Date().toISOString(),
    marketSummary: {
      mood: 'Bullish' as const,
      oneLiner: 'Markets are at all-time highs.',
      insight: 'FII inflows and strong GDP data are driving sentiment.',
      cautionFlag: null,
    },
    profileSummary: {
      strategy: 'Moderate SIP-led wealth building',
      rationale: 'A balanced mix of large cap SIPs and selective midcap stocks suits this profile.',
    },
    budgetAllocation: {
      totalMonthly: 10000,
      sips: 6000,
      stocks: 4000,
      lumpSumPlan: 'Deploy in 3 tranches over 6 weeks.',
    },
    recommendations: [
      { ...makeRec(1, true) },
      makeRec(2), makeRec(3), makeRec(4), makeRec(5),
    ],
    disclaimer: 'This is not SEBI-registered advice.',
  }

  it('accepts a complete valid ARIA output', () => {
    expect(() => AriaOutputSchema.parse(validOutput)).not.toThrow()
  })

  it('rejects fewer than 5 recommendations', () => {
    const bad = { ...validOutput, recommendations: [makeRec(1), makeRec(2), makeRec(3), makeRec(4)] }
    expect(() => AriaOutputSchema.parse(bad)).toThrow()
  })

  it('rejects more than 8 recommendations', () => {
    const bad = {
      ...validOutput,
      recommendations: Array.from({ length: 9 }, (_, i) => makeRec(i + 1)),
    }
    expect(() => AriaOutputSchema.parse(bad)).toThrow()
  })

  it('accepts exactly 8 recommendations', () => {
    const eight = {
      ...validOutput,
      recommendations: Array.from({ length: 8 }, (_, i) => makeRec(i + 1)),
    }
    expect(() => AriaOutputSchema.parse(eight)).not.toThrow()
  })

  it('rejects invalid marketSummary.mood', () => {
    const bad = { ...validOutput, marketSummary: { ...validOutput.marketSummary, mood: 'Positive' } }
    expect(() => AriaOutputSchema.parse(bad)).toThrow()
  })

  it('accepts all valid mood values', () => {
    for (const mood of ['Bullish', 'Neutral', 'Bearish'] as const) {
      const v = { ...validOutput, marketSummary: { ...validOutput.marketSummary, mood } }
      expect(() => AriaOutputSchema.parse(v)).not.toThrow()
    }
  })

  it('allows null cautionFlag', () => {
    expect(() => AriaOutputSchema.parse(validOutput)).not.toThrow()
  })

  it('allows a string cautionFlag', () => {
    const withFlag = {
      ...validOutput,
      marketSummary: { ...validOutput.marketSummary, cautionFlag: 'Watch US Fed rate decision' },
    }
    expect(() => AriaOutputSchema.parse(withFlag)).not.toThrow()
  })

  it('allows null lumpSumPlan', () => {
    const withNull = {
      ...validOutput,
      budgetAllocation: { ...validOutput.budgetAllocation, lumpSumPlan: null },
    }
    expect(() => AriaOutputSchema.parse(withNull)).not.toThrow()
  })

  it('requires a disclaimer field', () => {
    const { disclaimer: _, ...noDisclaimer } = validOutput
    expect(() => AriaOutputSchema.parse(noDisclaimer)).toThrow()
  })

  it('requires a generatedAt timestamp', () => {
    const { generatedAt: _, ...noTs } = validOutput
    expect(() => AriaOutputSchema.parse(noTs)).toThrow()
  })

  it('requires profileSummary with strategy and rationale', () => {
    const bad = { ...validOutput, profileSummary: { strategy: 'ok' } } // missing rationale
    expect(() => AriaOutputSchema.parse(bad)).toThrow()
  })

  it('requires budgetAllocation with numeric sips and stocks', () => {
    const bad = { ...validOutput, budgetAllocation: { totalMonthly: 10000, sips: 'a lot', stocks: 4000, lumpSumPlan: null } }
    expect(() => AriaOutputSchema.parse(bad)).toThrow()
  })
})
