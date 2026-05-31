// Pure math — NO server-only imports. Safe to import in client components.
import type { FinancialGoal } from '@prisma/client'

// ─── SIP future value formula ─────────────────────────────────────────────────
// FV = P × ((1 + r)^n – 1) / r × (1 + r) + corpus × (1 + r)^n
// where r = monthly rate, n = months, P = monthly SIP

function sipFutureValue(monthlySIP: number, monthlyRate: number, months: number, currentCorpus: number): number {
  if (months <= 0) return currentCorpus
  if (monthlyRate === 0) return monthlySIP * months + currentCorpus

  const growth = Math.pow(1 + monthlyRate, months)
  const sipFV = monthlySIP * ((growth - 1) / monthlyRate) * (1 + monthlyRate)
  const corpusFV = currentCorpus * growth
  return sipFV + corpusFV
}

// Required SIP to reach target given existing corpus
function requiredSIP(target: number, monthlyRate: number, months: number, currentCorpus: number): number {
  if (months <= 0) return 0
  if (monthlyRate === 0) return Math.max(0, (target - currentCorpus) / months)

  const corpusFV = currentCorpus * Math.pow(1 + monthlyRate, months)
  const remaining = target - corpusFV
  if (remaining <= 0) return 0

  const growth = Math.pow(1 + monthlyRate, months)
  const annuityFactor = ((growth - 1) / monthlyRate) * (1 + monthlyRate)
  return remaining / annuityFactor
}

// Step-up SIP FV (10% annual increase)
function stepUpSipFV(initialSIP: number, annualStepUpPct: number, monthlyRate: number, months: number, corpus: number): number {
  let total = corpus * Math.pow(1 + monthlyRate, months)
  let sip = initialSIP
  for (let m = 0; m < months; m++) {
    if (m > 0 && m % 12 === 0) sip *= 1 + annualStepUpPct / 100
    total += sip * Math.pow(1 + monthlyRate, months - m)
  }
  return total
}

export interface GoalProjection {
  targetAmount: number
  currentCorpus: number
  percentComplete: number
  monthsRemaining: number
  projectedCorpus: number
  onTrack: boolean
  monthsAheadOrBehind: number
  requiredMonthlySIP: number
  sipGap: number
  projectedShortfall: number
  scenarios: {
    conservative: { rate: number; projectedCorpus: number }
    moderate: { rate: number; projectedCorpus: number }
    optimistic: { rate: number; projectedCorpus: number }
  }
  stepUpImpact: {
    projectedCorpus: number
    monthsSaved: number
    extraCorpus: number
  }
  nextMilestone: {
    percent: number
    estimatedDate: Date | null
    amountNeeded: number
  } | null
  chartData: Array<{ month: number; date: string; conservative: number; moderate: number; optimistic: number; target: number }>
}

export function calculateGoalProjection(goal: FinancialGoal): GoalProjection {
  const now = new Date()
  const targetDate = new Date(goal.targetDate)
  const monthsRemaining = Math.max(0, Math.round((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44)))

  const r = goal.expectedReturn / 100 / 12
  const projectedCorpus = sipFutureValue(goal.monthlySIP, r, monthsRemaining, goal.currentCorpus)
  const percentComplete = goal.targetAmount > 0 ? Math.min(100, (goal.currentCorpus / goal.targetAmount) * 100) : 0

  const rRequired = requiredSIP(goal.targetAmount, r, monthsRemaining, goal.currentCorpus)
  const sipGap = Math.max(0, rRequired - goal.monthlySIP)
  const projectedShortfall = Math.max(0, goal.targetAmount - projectedCorpus)
  const onTrack = projectedCorpus >= goal.targetAmount * 0.95

  // How many months ahead/behind: find months needed at current SIP to hit target
  let monthsAheadOrBehind = 0
  if (goal.monthlySIP > 0) {
    let lo = 0, hi = monthsRemaining + 120, mid = 0
    while (lo < hi) {
      mid = Math.floor((lo + hi) / 2)
      if (sipFutureValue(goal.monthlySIP, r, mid, goal.currentCorpus) >= goal.targetAmount) hi = mid
      else lo = mid + 1
    }
    const monthsNeeded = lo
    monthsAheadOrBehind = monthsRemaining - monthsNeeded // positive = ahead
  }

  // Scenarios
  const scenarios = {
    conservative: { rate: 8,  projectedCorpus: sipFutureValue(goal.monthlySIP, 0.08 / 12, monthsRemaining, goal.currentCorpus) },
    moderate:     { rate: 12, projectedCorpus: sipFutureValue(goal.monthlySIP, 0.12 / 12, monthsRemaining, goal.currentCorpus) },
    optimistic:   { rate: 15, projectedCorpus: sipFutureValue(goal.monthlySIP, 0.15 / 12, monthsRemaining, goal.currentCorpus) },
  }

  // Step-up impact
  const stepUpProjected = stepUpSipFV(goal.monthlySIP, 10, r, monthsRemaining, goal.currentCorpus)
  let monthsSaved = 0
  if (goal.monthlySIP > 0) {
    for (let m = monthsRemaining; m >= 0; m--) {
      if (stepUpSipFV(goal.monthlySIP, 10, r, m, goal.currentCorpus) >= goal.targetAmount) {
        monthsSaved = monthsRemaining - m
      } else break
    }
  }

  // Next milestone
  const milestonePercents = [25, 50, 75, 100]
  const currentPct = percentComplete
  const nextPct = milestonePercents.find((p) => p > currentPct) ?? null
  let nextMilestone: GoalProjection['nextMilestone'] = null
  if (nextPct !== null) {
    const nextTarget = goal.targetAmount * (nextPct / 100)
    const amountNeeded = Math.max(0, nextTarget - goal.currentCorpus)
    let estimatedDate: Date | null = null
    if (goal.monthlySIP > 0) {
      for (let m = 0; m <= monthsRemaining + 120; m++) {
        if (sipFutureValue(goal.monthlySIP, r, m, goal.currentCorpus) >= nextTarget) {
          estimatedDate = new Date(now.getTime() + m * 30.44 * 24 * 60 * 60 * 1000)
          break
        }
      }
    }
    nextMilestone = { percent: nextPct, estimatedDate, amountNeeded }
  }

  // Chart data — monthly projection points
  const chartData: GoalProjection['chartData'] = []
  const step = Math.max(1, Math.floor(monthsRemaining / 24))
  for (let m = 0; m <= monthsRemaining; m += step) {
    const d = new Date(now.getTime() + m * 30.44 * 24 * 60 * 60 * 1000)
    chartData.push({
      month: m,
      date: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      conservative: Math.round(sipFutureValue(goal.monthlySIP, 0.08 / 12, m, goal.currentCorpus)),
      moderate:     Math.round(sipFutureValue(goal.monthlySIP, 0.12 / 12, m, goal.currentCorpus)),
      optimistic:   Math.round(sipFutureValue(goal.monthlySIP, 0.15 / 12, m, goal.currentCorpus)),
      target: goal.targetAmount,
    })
  }

  return {
    targetAmount: goal.targetAmount,
    currentCorpus: goal.currentCorpus,
    percentComplete,
    monthsRemaining,
    projectedCorpus,
    onTrack,
    monthsAheadOrBehind,
    requiredMonthlySIP: rRequired,
    sipGap,
    projectedShortfall,
    scenarios,
    stepUpImpact: { projectedCorpus: stepUpProjected, monthsSaved, extraCorpus: stepUpProjected - projectedCorpus },
    nextMilestone,
    chartData,
  }
}
