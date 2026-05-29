/**
 * Tests for sipEngine.ts — PRIYA system prompt, prompt builder,
 * step-up SIP calculator, and Zod schema validation.
 *
 * The Anthropic SDK is mocked so no real API calls are made.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockCreate = jest.fn()
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}))

jest.mock('@/lib/cache', () => ({
  cacheGetOrSet: jest.fn(async (_k: string, f: () => Promise<unknown>) => f()),
}))

import {
  PRIYA_SYSTEM_PROMPT,
  buildSipPrompt,
  calculateStepUpSip,
  FundRecommendationSchema,
  PriyaOutputSchema,
  SipProjectionsSchema,
  runSipAnalysis,
  type SipCalculatorInput,
} from '@/lib/sipEngine'
import type { InvestorProfile } from '@prisma/client'
import type { MutualFund } from '@/lib/mfData'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockProfile: InvestorProfile = {
  id: 'prof_1',
  userId: 'user_1',
  displayName: 'Priya Test',
  age: 32,
  monthlyIncome: 100_000,
  experience: 'INTERMEDIATE',
  riskScore: 32,
  riskTolerance: 'MODERATE',
  investmentGoals: ['Wealth creation', 'Tax saving'],
  sectorPreferences: [],
  sipBudget: 10_000,
  hasLumpSum: false,
  lumpSumAmount: null,
  investmentHorizon: 'MEDIUM_TERM',
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockCalcInput: SipCalculatorInput = {
  monthlyAmount: 5000,
  tenure: 10,
  stepUpPercent: 10,
}

const mockFunds: MutualFund[] = [
  {
    schemeCode: '120503',
    schemeName: 'SBI Bluechip Fund - Direct Growth',
    amc: 'SBI Mutual Fund',
    category: 'Equity',
    subCategory: 'Large Cap',
    nav: 87.42,
    navDate: '2025-05-28',
    return1y: 18.4,
    return3y: 16.2,
    return5y: 19.8,
    expenseRatio: 0.82,
    minSipAmount: 500,
    fundUrl: 'https://www.sbimf.com',
    riskLevel: 'Moderate',
    aum: 42850,
  },
  {
    schemeCode: '100016',
    schemeName: 'HDFC Top 100 Fund - Direct Growth',
    amc: 'HDFC Mutual Fund',
    category: 'Equity',
    subCategory: 'Large Cap',
    nav: 1024.78,
    navDate: '2025-05-28',
    return1y: 19.1,
    return3y: 15.8,
    return5y: 18.2,
    expenseRatio: 0.65,
    minSipAmount: 500,
    fundUrl: 'https://www.hdfcfund.com',
    riskLevel: 'Moderate',
    aum: 35200,
  },
  {
    schemeCode: '125494',
    schemeName: 'Parag Parikh Flexi Cap Fund - Direct Growth',
    amc: 'Parag Parikh',
    category: 'Equity',
    subCategory: 'Flexi Cap',
    nav: 72.31,
    navDate: '2025-05-28',
    return1y: 22.1,
    return3y: 18.4,
    return5y: 21.0,
    expenseRatio: 0.61,
    minSipAmount: 1000,
    fundUrl: 'https://www.ppfas.com',
    riskLevel: 'Moderate',
    aum: 58000,
  },
]

// ─── PRIYA_SYSTEM_PROMPT ──────────────────────────────────────────────────────

describe('PRIYA_SYSTEM_PROMPT', () => {
  it('is a non-empty string', () => {
    expect(typeof PRIYA_SYSTEM_PROMPT).toBe('string')
    expect(PRIYA_SYSTEM_PROMPT.length).toBeGreaterThan(500)
  })

  it('mentions PRIYA by name', () => {
    expect(PRIYA_SYSTEM_PROMPT).toContain('PRIYA')
  })

  it('references AMFI and SEBI', () => {
    expect(PRIYA_SYSTEM_PROMPT).toContain('AMFI')
    expect(PRIYA_SYSTEM_PROMPT).toContain('SEBI')
  })

  it('requires Direct Growth plans', () => {
    expect(PRIYA_SYSTEM_PROMPT).toContain('Direct Growth')
  })

  it('defines the 4-step analysis framework', () => {
    expect(PRIYA_SYSTEM_PROMPT).toContain('Step 1')
    expect(PRIYA_SYSTEM_PROMPT).toContain('Step 4')
  })

  it('lists the three SIP projection scenarios', () => {
    expect(PRIYA_SYSTEM_PROMPT).toContain('Conservative')
    expect(PRIYA_SYSTEM_PROMPT).toContain('Moderate')
    expect(PRIYA_SYSTEM_PROMPT).toContain('Optimistic')
  })

  it('mentions ELSS for tax saving goals', () => {
    expect(PRIYA_SYSTEM_PROMPT).toContain('ELSS')
    expect(PRIYA_SYSTEM_PROMPT).toContain('80C')
  })

  it('instructs strict JSON-only output', () => {
    expect(PRIYA_SYSTEM_PROMPT).toContain('No markdown')
  })

  it('mentions platform links for Direct plans', () => {
    expect(PRIYA_SYSTEM_PROMPT).toContain('Groww')
    expect(PRIYA_SYSTEM_PROMPT).toContain('Kuvera')
    expect(PRIYA_SYSTEM_PROMPT).toContain('Zerodha Coin')
  })

  it('covers all fund categories', () => {
    for (const cat of ['Large Cap', 'Mid Cap', 'Small Cap', 'Flexi Cap', 'Index Funds', 'Debt Funds']) {
      expect(PRIYA_SYSTEM_PROMPT).toContain(cat)
    }
  })
})

// ─── calculateStepUpSip ───────────────────────────────────────────────────────

describe('calculateStepUpSip', () => {
  it('returns higher maturity than flat SIP at same rate', () => {
    const { calculateSip } = require('@/lib/sipCalc')
    const flat = calculateSip(5000, 12, 10)
    const stepUp = calculateStepUpSip(5000, 12, 10, 10)
    expect(stepUp.maturityValue).toBeGreaterThan(flat.maturityValue)
  })

  it('totalInvested is greater than flat SIP invested (due to annual increases)', () => {
    const flat = 5000 * 10 * 12 // 600_000
    const { totalInvested } = calculateStepUpSip(5000, 12, 10, 10)
    expect(totalInvested).toBeGreaterThan(flat)
  })

  it('zero step-up matches flat SIP closely', () => {
    const { calculateSip } = require('@/lib/sipCalc')
    const flat = calculateSip(5000, 12, 5)
    const stepUp = calculateStepUpSip(5000, 12, 5, 0)
    // Allow small rounding difference
    expect(Math.abs(stepUp.maturityValue - flat.maturityValue)).toBeLessThan(100)
  })

  it('higher step-up gives higher maturity', () => {
    const low = calculateStepUpSip(5000, 12, 10, 5)
    const high = calculateStepUpSip(5000, 12, 10, 15)
    expect(high.maturityValue).toBeGreaterThan(low.maturityValue)
  })

  it('returns positive values for typical inputs', () => {
    const result = calculateStepUpSip(3000, 15, 15, 10)
    expect(result.maturityValue).toBeGreaterThan(0)
    expect(result.totalInvested).toBeGreaterThan(0)
  })
})

// ─── buildSipPrompt ───────────────────────────────────────────────────────────

describe('buildSipPrompt', () => {
  let parsed: {
    userProfile: Record<string, unknown>
    calculatorInput: Record<string, unknown>
    serverProjections: Record<string, unknown>
    availableFunds: unknown[]
  }

  beforeAll(() => {
    const raw = buildSipPrompt(mockProfile, mockCalcInput, mockFunds)
    parsed = JSON.parse(raw)
  })

  it('produces valid JSON', () => {
    expect(parsed).toBeDefined()
    expect(typeof parsed).toBe('object')
  })

  it('includes all four top-level keys', () => {
    expect(parsed).toHaveProperty('userProfile')
    expect(parsed).toHaveProperty('calculatorInput')
    expect(parsed).toHaveProperty('serverProjections')
    expect(parsed).toHaveProperty('availableFunds')
  })

  describe('userProfile section', () => {
    it('maps riskScore 32 to Moderate', () => {
      expect(parsed.userProfile.riskProfile).toBe('Moderate')
    })

    it('maps MEDIUM_TERM to "medium" horizon', () => {
      expect(parsed.userProfile.horizon).toBe('medium')
    })

    it('sets monthlyBudget from sipBudget', () => {
      expect(parsed.userProfile.monthlyBudget).toBe(10_000)
    })

    it('sets age correctly', () => {
      expect(parsed.userProfile.age).toBe(32)
    })

    it('maps annual income ₹12L to 30% tax bracket', () => {
      expect(parsed.userProfile.taxBracket).toBe('30%')
    })

    it('maps annual income ₹5L or below to 5% tax bracket', () => {
      const raw = buildSipPrompt(
        { ...mockProfile, monthlyIncome: 40_000 },
        mockCalcInput, mockFunds,
      )
      const p = JSON.parse(raw)
      expect(p.userProfile.taxBracket).toBe('5%')
    })

    it('maps annual income 6–10L to 20% bracket', () => {
      const raw = buildSipPrompt(
        { ...mockProfile, monthlyIncome: 60_000 },
        mockCalcInput, mockFunds,
      )
      const p = JSON.parse(raw)
      expect(p.userProfile.taxBracket).toBe('20%')
    })

    it('maps Conservative riskScore to Conservative', () => {
      const raw = buildSipPrompt(
        { ...mockProfile, riskScore: 18 },
        mockCalcInput, mockFunds,
      )
      expect(JSON.parse(raw).userProfile.riskProfile).toBe('Conservative')
    })

    it('maps Aggressive riskScore to Aggressive', () => {
      const raw = buildSipPrompt(
        { ...mockProfile, riskScore: 45 },
        mockCalcInput, mockFunds,
      )
      expect(JSON.parse(raw).userProfile.riskProfile).toBe('Aggressive')
    })

    it('falls back to riskTolerance when riskScore is null', () => {
      const raw = buildSipPrompt(
        { ...mockProfile, riskScore: null, riskTolerance: 'AGGRESSIVE' },
        mockCalcInput, mockFunds,
      )
      expect(JSON.parse(raw).userProfile.riskProfile).toBe('AGGRESSIVE')
    })
  })

  describe('calculatorInput section', () => {
    it('includes monthlyAmount', () => {
      expect(parsed.calculatorInput.monthlyAmount).toBe(5000)
    })

    it('includes tenure', () => {
      expect(parsed.calculatorInput.tenure).toBe(10)
    })

    it('includes stepUpPercent when provided', () => {
      expect(parsed.calculatorInput.stepUpPercent).toBe(10)
    })

    it('omits stepUpPercent when not provided', () => {
      const raw = buildSipPrompt(mockProfile, { monthlyAmount: 5000, tenure: 10 }, mockFunds)
      const p = JSON.parse(raw)
      expect(p.calculatorInput.stepUpPercent).toBeUndefined()
    })
  })

  describe('serverProjections section', () => {
    it('includes conservative, moderate, optimistic projections', () => {
      expect(parsed.serverProjections).toHaveProperty('conservative')
      expect(parsed.serverProjections).toHaveProperty('moderate')
      expect(parsed.serverProjections).toHaveProperty('optimistic')
    })

    it('includes stepUp projection when stepUpPercent is provided', () => {
      expect(parsed.serverProjections).toHaveProperty('stepUp')
    })

    it('omits stepUp projection when no stepUpPercent', () => {
      const raw = buildSipPrompt(mockProfile, { monthlyAmount: 5000, tenure: 10 }, mockFunds)
      const p = JSON.parse(raw)
      expect(p.serverProjections.stepUp).toBeUndefined()
    })

    it('conservative maturity < moderate maturity < optimistic maturity', () => {
      const { conservative, moderate, optimistic } = parsed.serverProjections as Record<string, { maturityValue: number }>
      expect(conservative.maturityValue).toBeLessThan(moderate.maturityValue)
      expect(moderate.maturityValue).toBeLessThan(optimistic.maturityValue)
    })
  })

  describe('availableFunds section', () => {
    it('includes all funds from the catalogue', () => {
      expect((parsed.availableFunds as unknown[]).length).toBe(mockFunds.length)
    })

    it('each fund entry has name, code, amc, category fields', () => {
      const first = parsed.availableFunds[0] as Record<string, unknown>
      expect(first).toHaveProperty('name')
      expect(first).toHaveProperty('code')
      expect(first).toHaveProperty('amc')
      expect(first).toHaveProperty('category')
    })
  })
})

// ─── FundRecommendationSchema ─────────────────────────────────────────────────

describe('FundRecommendationSchema', () => {
  const validRec = {
    rank: 1,
    isCore: true,
    fundName: 'Parag Parikh Flexi Cap Fund - Direct Growth',
    amc: 'Parag Parikh',
    category: 'Flexi Cap',
    riskLevel: 'Moderate',
    suggestedSIP: 5000,
    minSIP: 1000,
    expenseRatio: '0.61%',
    aum: '₹58,000 Cr',
    returns: { oneYear: '22.1%', threeYear: '18.4%', fiveYear: '21.0%' },
    benchmarkAlpha: '+3.1% over Nifty 500 TRI (3yr)',
    fundManager: 'Rajeev Thakkar',
    whyThisFund: 'Consistent outperformer with global diversification.',
    keyRisk: 'Currency risk on international holdings.',
    taxNote: 'LTCG at 10% above ₹1L after 1 year.',
    platformLinks: ['Groww', 'Kuvera', 'Zerodha Coin', 'MF Central'],
  }

  it('accepts a valid recommendation', () => {
    expect(() => FundRecommendationSchema.parse(validRec)).not.toThrow()
  })

  it('rejects negative suggestedSIP', () => {
    expect(() => FundRecommendationSchema.parse({ ...validRec, suggestedSIP: -500 })).toThrow()
  })

  it('rejects invalid riskLevel', () => {
    expect(() => FundRecommendationSchema.parse({ ...validRec, riskLevel: 'Very High' })).toThrow()
  })

  it('accepts all valid riskLevels: Low, Moderate, High', () => {
    for (const riskLevel of ['Low', 'Moderate', 'High']) {
      expect(() => FundRecommendationSchema.parse({ ...validRec, riskLevel })).not.toThrow()
    }
  })

  it('requires isCore to be boolean', () => {
    expect(() => FundRecommendationSchema.parse({ ...validRec, isCore: 'yes' })).toThrow()
  })

  it('requires rank to be a positive integer', () => {
    expect(() => FundRecommendationSchema.parse({ ...validRec, rank: 0 })).toThrow()
    expect(() => FundRecommendationSchema.parse({ ...validRec, rank: -1 })).toThrow()
  })

  it('requires returns to have oneYear, threeYear, fiveYear', () => {
    const bad = { ...validRec, returns: { oneYear: '10%' } }
    expect(() => FundRecommendationSchema.parse(bad)).toThrow()
  })

  it('requires platformLinks to be an array', () => {
    expect(() => FundRecommendationSchema.parse({ ...validRec, platformLinks: 'Groww' })).toThrow()
  })
})

// ─── SipProjectionsSchema ─────────────────────────────────────────────────────

describe('SipProjectionsSchema', () => {
  const validProjections = {
    monthlyAmount: 5000,
    tenure: 10,
    totalInvested: 600_000,
    scenarios: {
      conservative: { rate: 8, maturityValue: 900_000, totalGain: 300_000 },
      moderate: { rate: 12, maturityValue: 1_150_000, totalGain: 550_000 },
      optimistic: { rate: 15, maturityValue: 1_380_000, totalGain: 780_000 },
    },
    stepUpScenario: {
      stepUpPercent: 10,
      maturityValue: 1_600_000,
      totalInvested: 950_000,
      note: 'Step-up vs flat SIP adds approx ₹4.5L',
    },
  }

  it('accepts valid projections with step-up', () => {
    expect(() => SipProjectionsSchema.parse(validProjections)).not.toThrow()
  })

  it('accepts projections without stepUpScenario', () => {
    const { stepUpScenario: _, ...noStepUp } = validProjections
    expect(() => SipProjectionsSchema.parse(noStepUp)).not.toThrow()
  })

  it('accepts null stepUpScenario', () => {
    expect(() => SipProjectionsSchema.parse({ ...validProjections, stepUpScenario: null })).not.toThrow()
  })

  it('requires all three scenario rate fields', () => {
    const bad = {
      ...validProjections,
      scenarios: { conservative: { rate: 8, maturityValue: 900_000, totalGain: 300_000 } },
    }
    expect(() => SipProjectionsSchema.parse(bad)).toThrow()
  })
})

// ─── PriyaOutputSchema ────────────────────────────────────────────────────────

describe('PriyaOutputSchema', () => {
  const makeRec = (rank: number, isCore = false) => ({
    rank,
    isCore,
    fundName: `Test Fund ${rank} - Direct Growth`,
    amc: 'Test AMC',
    category: 'Large Cap',
    riskLevel: 'Moderate' as const,
    suggestedSIP: 3000,
    minSIP: 500,
    expenseRatio: '0.80%',
    aum: '₹10,000 Cr',
    returns: { oneYear: '15%', threeYear: '13%', fiveYear: '14%' },
    benchmarkAlpha: '+1.5% over Nifty 50 TRI',
    fundManager: 'Test Manager',
    whyThisFund: 'Good consistent track record.',
    keyRisk: 'Market volatility.',
    taxNote: 'LTCG at 10% above ₹1L.',
    platformLinks: ['Groww', 'Kuvera'],
  })

  const validOutput = {
    generatedAt: new Date().toISOString(),
    strategyTitle: 'Moderate Growth SIP Portfolio',
    strategyRationale: 'Balanced approach across large cap and flexi cap funds.',
    sipProjections: {
      monthlyAmount: 5000,
      tenure: 10,
      totalInvested: 600_000,
      scenarios: {
        conservative: { rate: 8, maturityValue: 900_000, totalGain: 300_000 },
        moderate: { rate: 12, maturityValue: 1_150_000, totalGain: 550_000 },
        optimistic: { rate: 15, maturityValue: 1_380_000, totalGain: 780_000 },
      },
    },
    recommendations: [makeRec(1, true), makeRec(2), makeRec(3)],
    budgetBreakdown: {
      totalMonthly: 10000,
      allocations: [
        { fundName: 'Fund 1', amount: 5000, percent: 50 },
        { fundName: 'Fund 2', amount: 3000, percent: 30 },
        { fundName: 'Fund 3', amount: 2000, percent: 20 },
      ],
    },
    goalProjection: null,
    proTips: ['Increase SIP by 10% every year.', 'Never stop SIP during a crash.'],
    disclaimer: 'Mutual fund investments are subject to market risks.',
  }

  it('accepts a fully valid PRIYA output', () => {
    expect(() => PriyaOutputSchema.parse(validOutput)).not.toThrow()
  })

  it('rejects more than 3 recommendations', () => {
    const bad = { ...validOutput, recommendations: [makeRec(1), makeRec(2), makeRec(3), makeRec(4)] }
    expect(() => PriyaOutputSchema.parse(bad)).toThrow()
  })

  it('accepts exactly 1 recommendation', () => {
    const one = { ...validOutput, recommendations: [makeRec(1, true)] }
    expect(() => PriyaOutputSchema.parse(one)).not.toThrow()
  })

  it('requires at least 1 proTip', () => {
    const bad = { ...validOutput, proTips: [] }
    expect(() => PriyaOutputSchema.parse(bad)).toThrow()
  })

  it('requires a disclaimer', () => {
    const { disclaimer: _, ...noDisclaimer } = validOutput
    expect(() => PriyaOutputSchema.parse(noDisclaimer)).toThrow()
  })

  it('requires a strategyTitle', () => {
    const { strategyTitle: _, ...noTitle } = validOutput
    expect(() => PriyaOutputSchema.parse(noTitle)).toThrow()
  })

  it('allows null goalProjection', () => {
    expect(() => PriyaOutputSchema.parse({ ...validOutput, goalProjection: null })).not.toThrow()
  })

  it('accepts a non-null goalProjection', () => {
    const withGoal = {
      ...validOutput,
      goalProjection: {
        goal: 'Child education',
        targetCorpus: 5_000_000,
        targetYear: 2040,
        requiredMonthlySIP: 8500,
        note: 'Based on 12% p.a. over 15 years',
      },
    }
    expect(() => PriyaOutputSchema.parse(withGoal)).not.toThrow()
  })

  it('requires budgetBreakdown allocations to have at most 3 entries', () => {
    const bad = {
      ...validOutput,
      budgetBreakdown: {
        totalMonthly: 10000,
        allocations: [
          { fundName: 'A', amount: 3000, percent: 30 },
          { fundName: 'B', amount: 3000, percent: 30 },
          { fundName: 'C', amount: 2000, percent: 20 },
          { fundName: 'D', amount: 2000, percent: 20 },
        ],
      },
    }
    expect(() => PriyaOutputSchema.parse(bad)).toThrow()
  })
})

// ─── runSipAnalysis (mocked) ──────────────────────────────────────────────────

describe('runSipAnalysis', () => {
  const validPriyaResponse = {
    generatedAt: new Date().toISOString(),
    strategyTitle: 'Moderate Growth SIP Portfolio',
    strategyRationale: 'Balanced SIP across categories.',
    sipProjections: {
      monthlyAmount: 5000,
      tenure: 10,
      totalInvested: 600_000,
      scenarios: {
        conservative: { rate: 8, maturityValue: 900_000, totalGain: 300_000 },
        moderate: { rate: 12, maturityValue: 1_150_000, totalGain: 550_000 },
        optimistic: { rate: 15, maturityValue: 1_380_000, totalGain: 780_000 },
      },
    },
    recommendations: [
      {
        rank: 1, isCore: true,
        fundName: 'SBI Bluechip Fund - Direct Growth', amc: 'SBI Mutual Fund',
        category: 'Large Cap', riskLevel: 'Moderate',
        suggestedSIP: 5000, minSIP: 500, expenseRatio: '0.82%', aum: '₹42,000 Cr',
        returns: { oneYear: '18%', threeYear: '16%', fiveYear: '20%' },
        benchmarkAlpha: '+2% over Nifty 50 TRI',
        fundManager: 'Sohini Andani',
        whyThisFund: 'Consistent outperformer.',
        keyRisk: 'Large cap concentration risk.',
        taxNote: 'LTCG at 10% after 1 year.',
        platformLinks: ['Groww', 'Kuvera', 'Zerodha Coin', 'MF Central'],
      },
    ],
    budgetBreakdown: {
      totalMonthly: 10000,
      allocations: [{ fundName: 'SBI Bluechip Fund - Direct Growth', amount: 10000, percent: 100 }],
    },
    goalProjection: null,
    proTips: ['Increase SIP by 10% annually.'],
    disclaimer: 'Subject to market risks.',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(validPriyaResponse) }],
    })
  })

  it('calls Claude with PRIYA as the system prompt', async () => {
    await runSipAnalysis(mockProfile, mockCalcInput, mockFunds)
    const args = mockCreate.mock.calls[0][0]
    expect(args.system).toContain('PRIYA')
  })

  it('uses claude-sonnet-4-6 model', async () => {
    await runSipAnalysis(mockProfile, mockCalcInput, mockFunds)
    expect(mockCreate.mock.calls[0][0].model).toBe('claude-sonnet-4-6')
  })

  it('returns a validated PriyaOutput on success', async () => {
    const result = await runSipAnalysis(mockProfile, mockCalcInput, mockFunds)
    expect(result.strategyTitle).toBe('Moderate Growth SIP Portfolio')
    expect(result.recommendations).toHaveLength(1)
    expect(result.disclaimer).toBeTruthy()
  })

  it('throws when Claude returns non-JSON', async () => {
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'Here is your analysis...' }] })
    await expect(runSipAnalysis(mockProfile, mockCalcInput, mockFunds)).rejects.toThrow('non-JSON')
  })

  it('throws when response fails schema validation', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ wrong: 'shape' }) }],
    })
    await expect(runSipAnalysis(mockProfile, mockCalcInput, mockFunds)).rejects.toThrow('Invalid PRIYA')
  })

  it('strips markdown code fences before parsing', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '```json\n' + JSON.stringify(validPriyaResponse) + '\n```' }],
    })
    const result = await runSipAnalysis(mockProfile, mockCalcInput, mockFunds)
    expect(result.strategyTitle).toBeDefined()
  })

  it('propagates SDK errors without swallowing them', async () => {
    mockCreate.mockRejectedValue(new Error('rate limit'))
    await expect(runSipAnalysis(mockProfile, mockCalcInput, mockFunds)).rejects.toThrow('rate limit')
  })
})
