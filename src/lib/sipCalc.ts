export interface SipDataPoint {
  month: number
  year: number
  invested: number
  value: number
  gain: number
}

export interface SipResult {
  maturityValue: number
  totalInvested: number
  totalGain: number
  gainPercent: number
  cagr: number        // annualised return %
  dataPoints: SipDataPoint[]
  yearlyData: SipDataPoint[]  // one per year for the chart
}

export function calculateSip(
  monthlyAmount: number,
  annualReturnPct: number,
  tenureYears: number,
): SipResult {
  const monthlyRate = annualReturnPct / 100 / 12
  const months = tenureYears * 12
  const dataPoints: SipDataPoint[] = []

  let value = 0
  for (let m = 1; m <= months; m++) {
    value = (value + monthlyAmount) * (1 + monthlyRate)
    const invested = m * monthlyAmount
    const gain = value - invested
    dataPoints.push({
      month: m,
      year: Math.ceil(m / 12),
      invested,
      value: Math.round(value),
      gain: Math.round(gain),
    })
  }

  const totalInvested = months * monthlyAmount
  const maturityValue = Math.round(value)
  const totalGain = maturityValue - totalInvested
  const gainPercent = (totalGain / totalInvested) * 100

  // CAGR: (maturity/invested)^(1/years) - 1
  const cagr = (Math.pow(maturityValue / totalInvested, 1 / tenureYears) - 1) * 100

  // Yearly snapshots for chart (end of each year)
  const yearlyData = dataPoints.filter((d) => d.month % 12 === 0)

  return { maturityValue, totalInvested, totalGain, gainPercent, cagr, dataPoints, yearlyData }
}

export function fmtCrL(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`
  return `₹${n.toLocaleString('en-IN')}`
}
