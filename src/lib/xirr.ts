// Newton-Raphson XIRR (Extended Internal Rate of Return)
// cashflows: array of { amount, date } where negative = invested, positive = current value

export interface CashFlow {
  amount: number
  date: Date
}

function npv(rate: number, cashflows: CashFlow[]): number {
  const t0 = cashflows[0].date.getTime()
  return cashflows.reduce((sum, cf) => {
    const years = (cf.date.getTime() - t0) / (365.25 * 24 * 3600 * 1000)
    return sum + cf.amount / Math.pow(1 + rate, years)
  }, 0)
}

function npvDerivative(rate: number, cashflows: CashFlow[]): number {
  const t0 = cashflows[0].date.getTime()
  return cashflows.reduce((sum, cf) => {
    const years = (cf.date.getTime() - t0) / (365.25 * 24 * 3600 * 1000)
    if (years === 0) return sum
    return sum - years * cf.amount / Math.pow(1 + rate, years + 1)
  }, 0)
}

export function xirr(cashflows: CashFlow[], guess = 0.1): number | null {
  if (cashflows.length < 2) return null

  let rate = guess
  for (let i = 0; i < 100; i++) {
    const nv = npv(rate, cashflows)
    const dv = npvDerivative(rate, cashflows)
    if (Math.abs(dv) < 1e-10) break
    const next = rate - nv / dv
    if (Math.abs(next - rate) < 1e-7) return next
    rate = next
    // Guard against runaway
    if (rate < -0.999 || rate > 100) return null
  }
  return null
}

export function xirrToPercent(rate: number | null): string {
  if (rate === null) return 'N/A'
  return `${(rate * 100).toFixed(2)}%`
}
