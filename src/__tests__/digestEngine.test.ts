/**
 * Tests for digestEngine.ts — MERCURY system prompt, prompt builder,
 * Zod schema validation, and runDigestAnalysis Claude integration.
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

import {
  MERCURY_SYSTEM_PROMPT,
  buildDigestPrompt,
  MercuryOutputSchema,
  runDigestAnalysis,
  type DigestInput,
  type WeeklyMarketData,
  type UserPortfolioData,
} from '@/lib/digestEngine'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockMarketData: WeeklyMarketData = {
  weekRange: '26 May – 30 May 2025',
  nifty50: { openMonday: 24200, closeFriday: 24580, weeklyChange: 1.57, high: 24700, low: 24050 },
  sensex: { closeFriday: 80800, weeklyChange: 1.45 },
  sectorPerformance: { IT: 3.2, Banking: 0.8, Pharma: -1.1, FMCG: 0.3, Auto: 2.7, Energy: -2.1 },
  topGainer: { name: 'Tata Motors', ticker: 'TATAMOTORS', change: 7.8 },
  topLoser: { name: 'ONGC', ticker: 'ONGC', change: -5.2 },
  fiiActivity: { netFlow: '+₹4,200 Cr', stance: 'Buying' },
  diiActivity: { netFlow: '+₹1,800 Cr', stance: 'Buying' },
  keyEvents: ['RBI kept repo rate unchanged at 6.5%', 'India Q4 GDP came in at 7.8%'],
}

const mockPortfolio: UserPortfolioData = {
  watchlist: [
    { ticker: 'INFY', weeklyChange: 2.1, currentPrice: 1520 },
    { ticker: 'HDFCBANK', weeklyChange: -0.8, currentPrice: 1640 },
    { ticker: 'TATAMOTORS', weeklyChange: 7.8, currentPrice: 980 },
  ],
  holdings: [
    { ticker: 'RELIANCE', buyPrice: 2800, currentPrice: 2950, qty: 5 },
    { ticker: 'INFY', buyPrice: 1400, currentPrice: 1520, qty: 10 },
  ],
  activeSIPs: [{ fundName: 'Mirae Asset Large Cap Fund', monthlySIP: 3000 }],
}

const mockInput: DigestInput = {
  user: { firstName: 'Arjun', riskProfile: 'Moderate', goal: 'Wealth creation', experience: 'beginner' },
  weeklyMarketData: mockMarketData,
  userPortfolioData: mockPortfolio,
  lastWeekRecommendation: { ticker: 'TATAMOTORS', recommendedAt: 920, currentPrice: 980, change: 6.5 },
}

// ─── Minimal valid MERCURY output for reuse ───────────────────────────────────

const validOutput = {
  generatedAt: new Date().toISOString(),
  emailMetadata: {
    subject: 'Your week in markets — Nifty +1.6% | Tata Motors surges',
    previewText: 'FIIs bought ₹4,200 Cr this week.',
    weekRange: '26 May – 30 May 2025',
  },
  sections: {
    weeklyPulse: {
      headline: 'Markets end strong — IT leads, Energy drags',
      body: 'Nifty gained +1.57% this week on strong FII inflows and positive GDP data.',
      sectorSummary: [
        { sector: 'IT', change: '+3.2%', reason: 'US tech rally lifted sentiment' },
        { sector: 'Auto', change: '+2.7%', reason: 'Strong sales data' },
        { sector: 'Energy', change: '-2.1%', reason: 'Crude demand concerns' },
      ],
      keyMacroEvent: {
        event: 'India Q4 GDP at 7.8%',
        implication: 'Strong growth supports continued equity inflows.',
      },
    },
    yourPortfolioThisWeek: {
      headline: 'Your watchlist this week',
      watchlistMovers: [
        { ticker: 'TATAMOTORS', change: '+7.8%', note: 'Biggest winner — strong Q4 deliveries' },
        { ticker: 'INFY', change: '+2.1%', note: 'IT sector rally' },
      ],
      holdingsPnL: { weeklyPnLChange: '+₹3,100', note: 'Holdings gained overall, led by INFY' },
      sipNote: 'Your Mirae Asset SIP of ₹3,000 ran this week.',
    },
    lastPickReview: {
      headline: 'Last week\'s pick — Tata Motors update',
      ticker: 'TATAMOTORS',
      recommendedPrice: 920,
      currentPrice: 980,
      change: '+6.5%',
      thesisUpdate: 'EV momentum continues. Strong Q4 delivery data confirms thesis.',
      action: 'Hold',
    },
    weeklySpotlight: {
      headline: 'This week\'s pick — Infosys',
      ticker: 'INFY',
      type: 'Stock',
      currentPrice: 1520,
      entryRange: '₹1,480 – ₹1,540',
      reasoning: 'IT sector momentum is strong. Q1 results due Thursday could catalyse a move.',
      watchOut: 'Guidance commentary — any revenue downgrade would be negative.',
      suggestedAmount: '₹5,000 lumpsum',
    },
    onYourRadar: [
      { item: 'Infosys Q1 results — Thursday', why: 'Guidance sets IT sector tone' },
      { item: 'US CPI data — Wednesday', why: 'Lower print triggers FII buying' },
      { item: 'Crude oil prices', why: 'Brent below $80 positive for India' },
    ],
    learnThisWeek: {
      concept: 'What is FII buying?',
      explanation: 'FII stands for Foreign Institutional Investor. When FIIs buy Indian stocks, it means more money is flowing into Indian markets from abroad, which generally pushes prices higher.',
      showFor: 'beginner' as const,
    },
  },
  footer: {
    disclaimer: 'This digest is AI-generated for educational purposes only. Not SEBI-registered investment advice.',
    unsubscribeNote: "You're receiving this because you enabled weekly digest.",
  },
}

// ─── MERCURY_SYSTEM_PROMPT ────────────────────────────────────────────────────

describe('MERCURY_SYSTEM_PROMPT', () => {
  it('is a non-empty string longer than 1000 chars', () => {
    expect(typeof MERCURY_SYSTEM_PROMPT).toBe('string')
    expect(MERCURY_SYSTEM_PROMPT.length).toBeGreaterThan(1000)
  })

  it('identifies MERCURY by name', () => {
    expect(MERCURY_SYSTEM_PROMPT).toContain('MERCURY')
  })

  it('specifies 6 content sections', () => {
    expect(MERCURY_SYSTEM_PROMPT).toContain('Section 1')
    expect(MERCURY_SYSTEM_PROMPT).toContain('Section 6')
  })

  it('includes the beginner-only learn section rule', () => {
    expect(MERCURY_SYSTEM_PROMPT).toContain('beginner')
  })

  it('requires strict JSON output', () => {
    expect(MERCURY_SYSTEM_PROMPT).toContain('No markdown')
  })

  it('prohibits panic-inducing vocabulary', () => {
    expect(MERCURY_SYSTEM_PROMPT).toContain('volatile')   // mentioned as word to avoid
    expect(MERCURY_SYSTEM_PROMPT).toContain('bloodbath')  // mentioned as word to avoid
    expect(MERCURY_SYSTEM_PROMPT).toContain('crash')      // mentioned as word to avoid
  })

  it('mandates probability language not absolutes', () => {
    expect(MERCURY_SYSTEM_PROMPT).toContain('probability language')
  })

  it('limits total email to 500 words', () => {
    expect(MERCURY_SYSTEM_PROMPT).toContain('500 words')
  })

  it('requires Indian number formatting', () => {
    expect(MERCURY_SYSTEM_PROMPT).toContain('Indian style')
  })

  it('specifies email subject field in output', () => {
    expect(MERCURY_SYSTEM_PROMPT).toContain('subject')
    expect(MERCURY_SYSTEM_PROMPT).toContain('previewText')
  })
})

// ─── buildDigestPrompt ────────────────────────────────────────────────────────

describe('buildDigestPrompt', () => {
  let parsed: DigestInput

  beforeAll(() => {
    const raw = buildDigestPrompt(mockInput)
    parsed = JSON.parse(raw)
  })

  it('produces valid JSON', () => {
    expect(parsed).toBeDefined()
    expect(typeof parsed).toBe('object')
  })

  it('preserves user firstName', () => {
    expect(parsed.user.firstName).toBe('Arjun')
  })

  it('preserves user riskProfile', () => {
    expect(parsed.user.riskProfile).toBe('Moderate')
  })

  it('preserves user experience level', () => {
    expect(parsed.user.experience).toBe('beginner')
  })

  it('preserves weekRange', () => {
    expect(parsed.weeklyMarketData.weekRange).toBe('26 May – 30 May 2025')
  })

  it('preserves Nifty weekly change', () => {
    expect(parsed.weeklyMarketData.nifty50.weeklyChange).toBe(1.57)
  })

  it('preserves sector performance map', () => {
    expect(parsed.weeklyMarketData.sectorPerformance.IT).toBe(3.2)
    expect(parsed.weeklyMarketData.sectorPerformance.Energy).toBe(-2.1)
  })

  it('preserves watchlist items', () => {
    const tickers = parsed.userPortfolioData.watchlist.map((w) => w.ticker)
    expect(tickers).toContain('INFY')
    expect(tickers).toContain('TATAMOTORS')
  })

  it('preserves holdings', () => {
    expect(parsed.userPortfolioData.holdings).toHaveLength(2)
    expect(parsed.userPortfolioData.holdings[0].ticker).toBe('RELIANCE')
  })

  it('preserves active SIPs', () => {
    expect(parsed.userPortfolioData.activeSIPs[0].fundName).toBe('Mirae Asset Large Cap Fund')
  })

  it('preserves lastWeekRecommendation', () => {
    expect(parsed.lastWeekRecommendation?.ticker).toBe('TATAMOTORS')
    expect(parsed.lastWeekRecommendation?.recommendedAt).toBe(920)
  })

  it('handles null lastWeekRecommendation', () => {
    const raw = buildDigestPrompt({ ...mockInput, lastWeekRecommendation: null })
    const p = JSON.parse(raw)
    expect(p.lastWeekRecommendation).toBeNull()
  })

  it('preserves key events array', () => {
    expect(parsed.weeklyMarketData.keyEvents).toContain('RBI kept repo rate unchanged at 6.5%')
  })
})

// ─── MercuryOutputSchema ──────────────────────────────────────────────────────

describe('MercuryOutputSchema', () => {
  it('accepts the complete valid output fixture', () => {
    expect(() => MercuryOutputSchema.parse(validOutput)).not.toThrow()
  })

  describe('emailMetadata', () => {
    it('requires subject, previewText, weekRange', () => {
      const bad = { ...validOutput, emailMetadata: { subject: 'ok' } }
      expect(() => MercuryOutputSchema.parse(bad)).toThrow()
    })
  })

  describe('sections.weeklyPulse', () => {
    it('requires at least one sectorSummary entry', () => {
      const bad = {
        ...validOutput,
        sections: {
          ...validOutput.sections,
          weeklyPulse: { ...validOutput.sections.weeklyPulse, sectorSummary: [] },
        },
      }
      expect(() => MercuryOutputSchema.parse(bad)).toThrow()
    })

    it('requires keyMacroEvent with event and implication', () => {
      const bad = {
        ...validOutput,
        sections: {
          ...validOutput.sections,
          weeklyPulse: {
            ...validOutput.sections.weeklyPulse,
            keyMacroEvent: { event: 'ok' }, // missing implication
          },
        },
      }
      expect(() => MercuryOutputSchema.parse(bad)).toThrow()
    })
  })

  describe('sections.lastPickReview', () => {
    it('allows null lastPickReview', () => {
      const noLastPick = {
        ...validOutput,
        sections: { ...validOutput.sections, lastPickReview: null },
      }
      expect(() => MercuryOutputSchema.parse(noLastPick)).not.toThrow()
    })

    it('restricts action to Hold | Book partial profits | Reassess', () => {
      const bad = {
        ...validOutput,
        sections: {
          ...validOutput.sections,
          lastPickReview: { ...validOutput.sections.lastPickReview!, action: 'Sell everything' },
        },
      }
      expect(() => MercuryOutputSchema.parse(bad)).toThrow()
    })

    it('accepts all three valid action values', () => {
      for (const action of ['Hold', 'Book partial profits', 'Reassess'] as const) {
        const v = {
          ...validOutput,
          sections: {
            ...validOutput.sections,
            lastPickReview: { ...validOutput.sections.lastPickReview!, action },
          },
        }
        expect(() => MercuryOutputSchema.parse(v)).not.toThrow()
      }
    })
  })

  describe('sections.weeklySpotlight', () => {
    it('restricts type to Stock | SIP | ETF', () => {
      const bad = {
        ...validOutput,
        sections: {
          ...validOutput.sections,
          weeklySpotlight: { ...validOutput.sections.weeklySpotlight, type: 'Bond' },
        },
      }
      expect(() => MercuryOutputSchema.parse(bad)).toThrow()
    })

    it('accepts all three valid spotlight types', () => {
      for (const type of ['Stock', 'SIP', 'ETF'] as const) {
        const v = {
          ...validOutput,
          sections: {
            ...validOutput.sections,
            weeklySpotlight: { ...validOutput.sections.weeklySpotlight, type },
          },
        }
        expect(() => MercuryOutputSchema.parse(v)).not.toThrow()
      }
    })

    it('requires currentPrice to be a number', () => {
      const bad = {
        ...validOutput,
        sections: {
          ...validOutput.sections,
          weeklySpotlight: { ...validOutput.sections.weeklySpotlight, currentPrice: '1520' },
        },
      }
      expect(() => MercuryOutputSchema.parse(bad)).toThrow()
    })
  })

  describe('sections.onYourRadar', () => {
    it('requires at least 1 radar item', () => {
      const bad = {
        ...validOutput,
        sections: { ...validOutput.sections, onYourRadar: [] },
      }
      expect(() => MercuryOutputSchema.parse(bad)).toThrow()
    })

    it('accepts up to 5 radar items', () => {
      const five = Array.from({ length: 5 }, (_, i) => ({
        item: `Event ${i}`,
        why: `Because of reason ${i}`,
      }))
      const v = { ...validOutput, sections: { ...validOutput.sections, onYourRadar: five } }
      expect(() => MercuryOutputSchema.parse(v)).not.toThrow()
    })

    it('rejects more than 5 radar items', () => {
      const six = Array.from({ length: 6 }, (_, i) => ({ item: `E${i}`, why: `W${i}` }))
      const bad = { ...validOutput, sections: { ...validOutput.sections, onYourRadar: six } }
      expect(() => MercuryOutputSchema.parse(bad)).toThrow()
    })
  })

  describe('sections.learnThisWeek', () => {
    it('allows null learnThisWeek (intermediate/expert users)', () => {
      const v = { ...validOutput, sections: { ...validOutput.sections, learnThisWeek: null } }
      expect(() => MercuryOutputSchema.parse(v)).not.toThrow()
    })

    it('requires showFor to be "beginner" exactly', () => {
      const bad = {
        ...validOutput,
        sections: {
          ...validOutput.sections,
          learnThisWeek: {
            ...validOutput.sections.learnThisWeek!,
            showFor: 'intermediate',
          },
        },
      }
      expect(() => MercuryOutputSchema.parse(bad)).toThrow()
    })
  })

  describe('sections.yourPortfolioThisWeek', () => {
    it('allows null holdingsPnL', () => {
      const v = {
        ...validOutput,
        sections: {
          ...validOutput.sections,
          yourPortfolioThisWeek: {
            ...validOutput.sections.yourPortfolioThisWeek,
            holdingsPnL: null,
          },
        },
      }
      expect(() => MercuryOutputSchema.parse(v)).not.toThrow()
    })

    it('allows null sipNote', () => {
      const v = {
        ...validOutput,
        sections: {
          ...validOutput.sections,
          yourPortfolioThisWeek: {
            ...validOutput.sections.yourPortfolioThisWeek,
            sipNote: null,
          },
        },
      }
      expect(() => MercuryOutputSchema.parse(v)).not.toThrow()
    })

    it('allows empty watchlistMovers array', () => {
      const v = {
        ...validOutput,
        sections: {
          ...validOutput.sections,
          yourPortfolioThisWeek: {
            ...validOutput.sections.yourPortfolioThisWeek,
            watchlistMovers: [],
          },
        },
      }
      expect(() => MercuryOutputSchema.parse(v)).not.toThrow()
    })
  })

  it('requires footer.disclaimer', () => {
    const bad = { ...validOutput, footer: { unsubscribeNote: 'ok' } }
    expect(() => MercuryOutputSchema.parse(bad)).toThrow()
  })

  it('requires generatedAt timestamp', () => {
    const { generatedAt: _, ...noTs } = validOutput
    expect(() => MercuryOutputSchema.parse(noTs)).toThrow()
  })
})

// ─── runDigestAnalysis (mocked) ───────────────────────────────────────────────

describe('runDigestAnalysis', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(validOutput) }],
    })
  })

  it('calls Claude with MERCURY as the system prompt', async () => {
    await runDigestAnalysis(mockInput)
    const args = mockCreate.mock.calls[0][0]
    expect(args.system).toContain('MERCURY')
  })

  it('uses claude-sonnet-4-6 model', async () => {
    await runDigestAnalysis(mockInput)
    expect(mockCreate.mock.calls[0][0].model).toBe('claude-sonnet-4-6')
  })

  it('sends the digest input as the user message', async () => {
    await runDigestAnalysis(mockInput)
    const userMsg = mockCreate.mock.calls[0][0].messages[0].content
    const parsed = JSON.parse(userMsg)
    expect(parsed.user.firstName).toBe('Arjun')
    expect(parsed.weeklyMarketData.weekRange).toBe('26 May – 30 May 2025')
  })

  it('returns a validated MercuryOutput on success', async () => {
    const result = await runDigestAnalysis(mockInput)
    expect(result.emailMetadata.weekRange).toBe('26 May – 30 May 2025')
    expect(result.sections.weeklyPulse.headline).toBeTruthy()
    expect(result.sections.weeklySpotlight.ticker).toBe('INFY')
  })

  it('throws when Claude returns non-JSON', async () => {
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'Here is your digest...' }] })
    await expect(runDigestAnalysis(mockInput)).rejects.toThrow('non-JSON')
  })

  it('throws when response fails schema validation', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ wrong: 'shape' }) }],
    })
    await expect(runDigestAnalysis(mockInput)).rejects.toThrow('Invalid MERCURY')
  })

  it('strips markdown code fences before parsing', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '```json\n' + JSON.stringify(validOutput) + '\n```' }],
    })
    const result = await runDigestAnalysis(mockInput)
    expect(result.emailMetadata.subject).toBeTruthy()
  })

  it('propagates SDK errors without swallowing them', async () => {
    mockCreate.mockRejectedValue(new Error('network error'))
    await expect(runDigestAnalysis(mockInput)).rejects.toThrow('network error')
  })

  it('works when lastWeekRecommendation is null', async () => {
    const noLastPick = { ...mockInput, lastWeekRecommendation: null }
    const outputWithNullLastPick = {
      ...validOutput,
      sections: { ...validOutput.sections, lastPickReview: null },
    }
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(outputWithNullLastPick) }],
    })
    const result = await runDigestAnalysis(noLastPick)
    expect(result.sections.lastPickReview).toBeNull()
  })
})
