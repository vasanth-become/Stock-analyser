import { xirr, xirrToPercent, type CashFlow } from '@/lib/xirr'

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function yearsAgo(y: number): Date {
  const d = new Date()
  d.setFullYear(d.getFullYear() - y)
  return d
}

describe('xirr', () => {
  describe('basic convergence', () => {
    it('returns null for a single cashflow (insufficient data)', () => {
      const cfs: CashFlow[] = [{ amount: -10000, date: yearsAgo(1) }]
      expect(xirr(cfs)).toBeNull()
    })

    it('returns null for empty cashflows', () => {
      expect(xirr([])).toBeNull()
    })

    it('converges for a simple 1-year investment', () => {
      // Invest 10000, get back 11200 after 1 year → ~12% return
      const cfs: CashFlow[] = [
        { amount: -10000, date: yearsAgo(1) },
        { amount: 11200, date: new Date() },
      ]
      const rate = xirr(cfs)
      expect(rate).not.toBeNull()
      expect(rate!).toBeCloseTo(0.12, 1)
    })

    it('returns positive rate when current value exceeds cost', () => {
      const cfs: CashFlow[] = [
        { amount: -100000, date: yearsAgo(2) },
        { amount: 130000, date: new Date() },
      ]
      const rate = xirr(cfs)
      expect(rate).not.toBeNull()
      expect(rate!).toBeGreaterThan(0)
    })

    it('returns negative rate when investment has lost value', () => {
      const cfs: CashFlow[] = [
        { amount: -100000, date: yearsAgo(1) },
        { amount: 85000, date: new Date() },
      ]
      const rate = xirr(cfs)
      expect(rate).not.toBeNull()
      expect(rate!).toBeLessThan(0)
    })
  })

  describe('SIP-style cashflows', () => {
    it('computes positive return for a profitable SIP portfolio', () => {
      // 12 monthly investments of ₹5000, current value ₹70000
      const cfs: CashFlow[] = []
      for (let m = 12; m >= 1; m--) {
        cfs.push({ amount: -5000, date: daysAgo(m * 30) })
      }
      cfs.push({ amount: 70000, date: new Date() })

      const rate = xirr(cfs)
      expect(rate).not.toBeNull()
      expect(rate!).toBeGreaterThan(0)
    })

    it('is symmetric — doubling amounts gives same rate', () => {
      const base: CashFlow[] = [
        { amount: -50000, date: yearsAgo(2) },
        { amount: -50000, date: yearsAgo(1) },
        { amount: 130000, date: new Date() },
      ]
      const doubled: CashFlow[] = base.map((c) => ({ ...c, amount: c.amount * 2 }))

      const r1 = xirr(base)
      const r2 = xirr(doubled)

      expect(r1).not.toBeNull()
      expect(r2).not.toBeNull()
      expect(r1!).toBeCloseTo(r2!, 5)
    })
  })

  describe('edge cases', () => {
    it('handles very short investment period (days)', () => {
      const cfs: CashFlow[] = [
        { amount: -10000, date: daysAgo(30) },
        { amount: 10100, date: new Date() },
      ]
      const rate = xirr(cfs)
      // Should converge — annualised rate will be high for a 1% monthly gain
      expect(rate).not.toBeNull()
    })

    it('handles break-even (same in and out after 1 year)', () => {
      const cfs: CashFlow[] = [
        { amount: -10000, date: yearsAgo(1) },
        { amount: 10000, date: new Date() },
      ]
      const rate = xirr(cfs)
      expect(rate).not.toBeNull()
      expect(rate!).toBeCloseTo(0, 2)
    })
  })
})

describe('xirrToPercent', () => {
  it('formats positive rate as percentage with 2dp', () => {
    expect(xirrToPercent(0.1234)).toBe('12.34%')
  })

  it('formats negative rate correctly', () => {
    expect(xirrToPercent(-0.05)).toBe('-5.00%')
  })

  it('returns N/A for null', () => {
    expect(xirrToPercent(null)).toBe('N/A')
  })

  it('formats zero correctly', () => {
    expect(xirrToPercent(0)).toBe('0.00%')
  })

  it('formats large return correctly', () => {
    expect(xirrToPercent(0.4567)).toBe('45.67%')
  })
})
