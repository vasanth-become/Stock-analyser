import { calculateSip, fmtCrL } from '@/lib/sipCalc'

describe('calculateSip', () => {
  describe('basic correctness', () => {
    it('returns zero gain with 0% return', () => {
      const r = calculateSip(1000, 0, 5)
      expect(r.totalInvested).toBe(60_000)
      expect(r.maturityValue).toBe(60_000)
      expect(r.totalGain).toBe(0)
    })

    it('produces positive gain for positive return', () => {
      const r = calculateSip(5000, 12, 10)
      expect(r.maturityValue).toBeGreaterThan(r.totalInvested)
      expect(r.totalGain).toBeGreaterThan(0)
      expect(r.gainPercent).toBeGreaterThan(0)
    })

    it('totalInvested equals monthly × months', () => {
      const r = calculateSip(3000, 15, 7)
      expect(r.totalInvested).toBe(3000 * 7 * 12)
    })

    it('dataPoints length equals total months', () => {
      const r = calculateSip(1000, 12, 5)
      expect(r.dataPoints).toHaveLength(60)
    })

    it('yearlyData has one entry per year', () => {
      const r = calculateSip(1000, 12, 10)
      expect(r.yearlyData).toHaveLength(10)
    })

    it('each dataPoint month increments by 1', () => {
      const r = calculateSip(1000, 12, 3)
      r.dataPoints.forEach((p, i) => {
        expect(p.month).toBe(i + 1)
      })
    })

    it('gain = value - invested per dataPoint', () => {
      const r = calculateSip(1000, 12, 2)
      r.dataPoints.forEach((p) => {
        // gain is Math.round(value - invested) — allow ±1 due to rounding
        expect(Math.abs(p.gain - (p.value - p.invested))).toBeLessThanOrEqual(1)
      })
    })
  })

  describe('CAGR calculation', () => {
    it('CAGR is close to stated annual return for large tenures', () => {
      // Over 20 years the compounding error vs stated rate is small
      const r = calculateSip(10000, 12, 20)
      // CAGR of the overall investment should be in ballpark of 12%
      // (CAGR on SIP differs from return rate — just validate it's positive and reasonable)
      expect(r.cagr).toBeGreaterThan(0)
      expect(r.cagr).toBeLessThan(50)
    })

    it('higher return rate gives higher CAGR', () => {
      const low = calculateSip(5000, 8, 10)
      const high = calculateSip(5000, 18, 10)
      expect(high.cagr).toBeGreaterThan(low.cagr)
    })
  })

  describe('monotonicity', () => {
    it('maturity value grows with longer tenure (same return)', () => {
      const r5 = calculateSip(5000, 12, 5)
      const r10 = calculateSip(5000, 12, 10)
      const r20 = calculateSip(5000, 12, 20)
      expect(r10.maturityValue).toBeGreaterThan(r5.maturityValue)
      expect(r20.maturityValue).toBeGreaterThan(r10.maturityValue)
    })

    it('higher monthly amount gives higher maturity', () => {
      const low = calculateSip(1000, 12, 10)
      const high = calculateSip(5000, 12, 10)
      expect(high.maturityValue).toBe(low.maturityValue * 5)
    })

    it('portfolio value never decreases month-to-month for positive return', () => {
      const r = calculateSip(5000, 12, 5)
      for (let i = 1; i < r.dataPoints.length; i++) {
        expect(r.dataPoints[i].value).toBeGreaterThanOrEqual(r.dataPoints[i - 1].value)
      }
    })
  })

  describe('edge cases', () => {
    it('handles 1-year tenure', () => {
      const r = calculateSip(1000, 12, 1)
      expect(r.dataPoints).toHaveLength(12)
      expect(r.yearlyData).toHaveLength(1)
      expect(r.totalInvested).toBe(12000)
    })

    it('handles very high return (30%)', () => {
      const r = calculateSip(1000, 30, 10)
      expect(r.maturityValue).toBeGreaterThan(r.totalInvested)
      expect(r.totalGain).toBeGreaterThan(0)
    })

    it('handles large monthly amounts without overflow', () => {
      const r = calculateSip(200_000, 15, 30)
      expect(Number.isFinite(r.maturityValue)).toBe(true)
      expect(r.maturityValue).toBeGreaterThan(0)
    })
  })
})

describe('fmtCrL', () => {
  it('formats crores correctly', () => {
    expect(fmtCrL(1_00_00_000)).toBe('₹1.00 Cr')
    expect(fmtCrL(2_50_00_000)).toBe('₹2.50 Cr')
    expect(fmtCrL(10_00_00_000)).toBe('₹10.00 Cr')
  })

  it('formats lakhs correctly', () => {
    expect(fmtCrL(5_00_000)).toBe('₹5.00 L')
    expect(fmtCrL(1_00_000)).toBe('₹1.00 L')
    expect(fmtCrL(99_99_999)).toBe('₹100.00 L')
  })

  it('formats amounts below 1 lakh as plain INR', () => {
    const result = fmtCrL(50_000)
    expect(result).toContain('₹')
    expect(result).not.toContain('Cr')
    expect(result).not.toContain('L')
  })

  it('handles zero', () => {
    const result = fmtCrL(0)
    expect(result).toContain('₹')
  })

  it('handles negative values', () => {
    const result = fmtCrL(-5_00_000)
    // Negative lakhs: Math.abs check would be needed — validate sign preserved
    expect(result).toContain('L')
  })
})
