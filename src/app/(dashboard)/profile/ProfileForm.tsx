'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronRight, ChevronLeft, Loader2, Check,
  ShieldCheck, Target, LayoutGrid, IndianRupee, Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { RiskGauge } from '@/components/ui/gauge'
import { cn } from '@/lib/utils'
import type { InvestorProfile } from '@prisma/client'

// ─── Constants ───────────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Risk Profile', icon: ShieldCheck },
  { label: 'Goals',        icon: Target },
  { label: 'Sectors',      icon: LayoutGrid },
  { label: 'Budget',       icon: IndianRupee },
  { label: 'Horizon',      icon: Clock },
] as const

// Risk quiz — 10 questions, each scored 1–5 (total 10–50)
const QUIZ_QUESTIONS = [
  {
    id: 'q1',
    question: 'How would you react if your portfolio dropped 20% in one month?',
    options: [
      { label: 'Sell everything immediately', score: 1 },
      { label: 'Sell some to reduce risk', score: 2 },
      { label: 'Hold and wait for recovery', score: 3 },
      { label: 'Hold and buy a little more', score: 4 },
      { label: 'Buy aggressively — great opportunity', score: 5 },
    ],
  },
  {
    id: 'q2',
    question: 'What is your primary investment objective?',
    options: [
      { label: 'Capital preservation — protect what I have', score: 1 },
      { label: 'Modest growth with low risk', score: 2 },
      { label: 'Balanced growth and income', score: 3 },
      { label: 'High growth, accept higher risk', score: 4 },
      { label: 'Maximum returns, comfortable with large swings', score: 5 },
    ],
  },
  {
    id: 'q3',
    question: 'How much of your monthly savings can you afford to lose without financial hardship?',
    options: [
      { label: 'None — I need all my savings', score: 1 },
      { label: 'Up to 10%', score: 2 },
      { label: 'Up to 25%', score: 3 },
      { label: 'Up to 50%', score: 4 },
      { label: 'Over 50% — I have other income sources', score: 5 },
    ],
  },
  {
    id: 'q4',
    question: 'What best describes your stock market experience?',
    options: [
      { label: 'Never invested before', score: 1 },
      { label: 'Mostly mutual funds / SIPs', score: 2 },
      { label: 'Invest occasionally in blue-chip stocks', score: 3 },
      { label: 'Active investor — track markets regularly', score: 4 },
      { label: 'Trade derivatives or use leverage', score: 5 },
    ],
  },
  {
    id: 'q5',
    question: 'How long do you plan to keep your investments untouched?',
    options: [
      { label: 'Less than 1 year', score: 1 },
      { label: '1–3 years', score: 2 },
      { label: '3–5 years', score: 3 },
      { label: '5–10 years', score: 4 },
      { label: 'More than 10 years', score: 5 },
    ],
  },
  {
    id: 'q6',
    question: 'If you had ₹1 lakh to invest, which option would you choose?',
    options: [
      { label: 'Fixed deposit — guaranteed returns', score: 1 },
      { label: 'Debt mutual fund — stable, low return', score: 2 },
      { label: 'Balanced fund — mix of equity & debt', score: 3 },
      { label: 'Large-cap equity fund', score: 4 },
      { label: 'Small/mid-cap or sectoral fund — high potential', score: 5 },
    ],
  },
  {
    id: 'q7',
    question: 'How do you feel about market volatility during election seasons?',
    options: [
      { label: 'Very anxious — I avoid the market entirely', score: 1 },
      { label: 'Nervous, but I stay the course', score: 2 },
      { label: 'Neutral — part of investing', score: 3 },
      { label: 'Excited about potential opportunities', score: 4 },
      { label: 'Actively trade the volatility for gains', score: 5 },
    ],
  },
  {
    id: 'q8',
    question: 'What is your current financial situation?',
    options: [
      { label: 'Heavy debt, living paycheck to paycheck', score: 1 },
      { label: 'Some debt, but manageable', score: 2 },
      { label: 'Debt-free, modest savings', score: 3 },
      { label: 'Good savings, no major liabilities', score: 4 },
      { label: 'Strong savings, passive income sources', score: 5 },
    ],
  },
  {
    id: 'q9',
    question: 'How do you typically make investment decisions?',
    options: [
      { label: 'Follow advice from bank RM / family', score: 1 },
      { label: 'Research top mutual funds', score: 2 },
      { label: 'Mix of own research and advisor guidance', score: 3 },
      { label: 'Own fundamental/technical analysis', score: 4 },
      { label: 'Quantitative models or advanced strategies', score: 5 },
    ],
  },
  {
    id: 'q10',
    question: 'A stock in your portfolio doubles in 3 months. What do you do?',
    options: [
      { label: 'Sell immediately — lock in profits', score: 1 },
      { label: 'Sell half — secure gains, keep some upside', score: 2 },
      { label: 'Review fundamentals, then decide', score: 3 },
      { label: 'Hold — the story is still playing out', score: 4 },
      { label: 'Buy more — momentum is strong', score: 5 },
    ],
  },
]

const GOAL_OPTIONS = [
  { value: 'wealth_creation',  label: 'Wealth Creation',    icon: '💰', desc: 'Long-term capital growth' },
  { value: 'retirement',       label: 'Retirement',         icon: '🏖️', desc: 'Financial freedom post-60' },
  { value: 'child_education',  label: 'Child Education',    icon: '🎓', desc: 'Fund higher education' },
  { value: 'tax_saving',       label: 'Tax Saving (ELSS)',  icon: '📋', desc: 'Save under 80C' },
  { value: 'regular_income',   label: 'Regular Income',     icon: '💵', desc: 'Dividends & passive income' },
  { value: 'short_term',       label: 'Short-term Gains',   icon: '⚡', desc: 'Trade for quick profits' },
]

const SECTOR_OPTIONS = [
  { value: 'IT',             label: 'Information Technology', icon: '💻', color: 'blue' },
  { value: 'Banking',        label: 'Banking & Finance',      icon: '🏦', color: 'indigo' },
  { value: 'Pharma',         label: 'Pharmaceuticals',        icon: '💊', color: 'green' },
  { value: 'FMCG',           label: 'FMCG & Consumer',        icon: '🛒', color: 'orange' },
  { value: 'Auto',           label: 'Automobiles',            icon: '🚗', color: 'yellow' },
  { value: 'Energy',         label: 'Energy & Power',         icon: '⚡', color: 'red' },
  { value: 'Infrastructure', label: 'Infrastructure',         icon: '🏗️', color: 'slate' },
  { value: 'Metals',         label: 'Metals & Mining',        icon: '🔩', color: 'gray' },
  { value: 'Realty',         label: 'Real Estate',            icon: '🏢', color: 'purple' },
  { value: 'Telecom',        label: 'Telecom',                icon: '📡', color: 'cyan' },
]

const HORIZON_OPTIONS = [
  {
    value: 'SHORT_TERM',
    label: '< 1 Year',
    desc: 'Short-term trading & quick gains',
    icon: '⚡',
    suitable: 'Aggressive investors',
  },
  {
    value: 'MEDIUM_TERM',
    label: '1 – 5 Years',
    desc: 'Balanced growth with some liquidity',
    icon: '📅',
    suitable: 'Moderate investors',
  },
  {
    value: 'LONG_TERM',
    label: '5+ Years',
    desc: 'Long-term compounding & wealth creation',
    icon: '🌳',
    suitable: 'All investor types',
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreToRisk(score: number): 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' {
  if (score <= 24) return 'CONSERVATIVE'
  if (score <= 37) return 'MODERATE'
  return 'AGGRESSIVE'
}

function scoreToPercent(score: number): number {
  // Map 10–50 to 0–100
  return Math.round(((score - 10) / 40) * 100)
}

// ─── Step components ─────────────────────────────────────────────────────────

function StepRiskQuiz({
  answers,
  onChange,
}: {
  answers: Record<string, number>
  onChange: (id: string, score: number) => void
}) {
  const answered = Object.keys(answers).length
  const total = QUIZ_QUESTIONS.length
  const rawScore = Object.values(answers).reduce((a, b) => a + b, 0)
  const gaugeValue = answered > 0 ? scoreToPercent(rawScore) : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Risk Profile Assessment</h2>
        <p className="text-gray-500 text-sm mt-1">
          Answer {total} questions — we&apos;ll calculate your risk tolerance automatically
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full">
            <div
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${(answered / total) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 shrink-0">{answered}/{total} answered</span>
        </div>
      </div>

      {/* Live gauge — only show once some questions answered */}
      {answered >= 3 && (
        <div className="flex justify-center py-2">
          <RiskGauge value={gaugeValue} size={180} />
        </div>
      )}

      <div className="space-y-6">
        {QUIZ_QUESTIONS.map((q, qi) => (
          <div key={q.id} className="space-y-2">
            <p className="text-sm font-semibold text-gray-800">
              <span className="text-blue-600 mr-1">{qi + 1}.</span> {q.question}
            </p>
            <div className="space-y-1.5">
              {q.options.map((opt) => {
                const selected = answers[q.id] === opt.score
                return (
                  <button
                    key={opt.score}
                    type="button"
                    onClick={() => onChange(q.id, opt.score)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm text-left transition-all',
                      selected
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                        selected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                      )}
                    >
                      {selected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StepGoals({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (v: string[]) => void
}) {
  function toggle(value: string) {
    onChange(
      selected.includes(value) ? selected.filter((g) => g !== value) : [...selected, value]
    )
  }
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Investment Goals</h2>
        <p className="text-gray-500 text-sm mt-1">What are you investing for? Select all that apply.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {GOAL_OPTIONS.map(({ value, label, icon, desc }) => {
          const active = selected.includes(value)
          return (
            <button
              key={value}
              type="button"
              onClick={() => toggle(value)}
              className={cn(
                'flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all',
                active
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              <span className="text-2xl shrink-0">{icon}</span>
              <div className="min-w-0">
                <p className={cn('font-semibold text-sm', active ? 'text-blue-700' : 'text-gray-900')}>
                  {label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
              {active && <Check className="h-4 w-4 text-blue-600 shrink-0 mt-0.5 ml-auto" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StepSectors({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (v: string[]) => void
}) {
  function toggle(value: string) {
    onChange(
      selected.includes(value) ? selected.filter((s) => s !== value) : [...selected, value]
    )
  }
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Sector Preferences</h2>
        <p className="text-gray-500 text-sm mt-1">
          Which sectors interest you most? We&apos;ll prioritise these in our AI analysis.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {SECTOR_OPTIONS.map(({ value, label, icon }) => {
          const active = selected.includes(value)
          return (
            <button
              key={value}
              type="button"
              onClick={() => toggle(value)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all',
                active
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              <span className="text-2xl">{icon}</span>
              <span className={cn('text-xs font-semibold leading-tight', active ? 'text-blue-700' : 'text-gray-700')}>
                {label}
              </span>
              {active && (
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600">
                  <Check className="h-2.5 w-2.5 text-white" />
                </div>
              )}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-gray-400">{selected.length} sector{selected.length !== 1 ? 's' : ''} selected</p>
    </div>
  )
}

function StepBudget({
  sipBudget,
  hasLumpSum,
  lumpSumAmount,
  onChange,
}: {
  sipBudget: string
  hasLumpSum: boolean
  lumpSumAmount: string
  onChange: (partial: { sipBudget?: string; hasLumpSum?: boolean; lumpSumAmount?: string }) => void
}) {
  const SIP_PRESETS = ['500', '1000', '2000', '5000', '10000', '25000']
  const LUMP_PRESETS = ['10000', '25000', '50000', '100000', '500000']

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Monthly SIP Budget</h2>
        <p className="text-gray-500 text-sm mt-1">
          How much can you invest every month via SIP?
        </p>
      </div>

      {/* SIP */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {SIP_PRESETS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange({ sipBudget: v })}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm font-medium transition-all',
                sipBudget === v
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
              )}
            >
              ₹{Number(v).toLocaleString('en-IN')}
            </button>
          ))}
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₹</span>
          <Input
            type="number"
            placeholder="Enter custom amount"
            value={sipBudget}
            onChange={(e) => onChange({ sipBudget: e.target.value })}
            className="h-11 pl-7"
            min={0}
          />
        </div>
        {sipBudget && Number(sipBudget) > 0 && (
          <p className="text-sm text-blue-700 font-medium">
            ₹{Number(sipBudget).toLocaleString('en-IN')} / month
            <span className="text-gray-500 font-normal ml-1">
              = ₹{(Number(sipBudget) * 12).toLocaleString('en-IN')} / year
            </span>
          </p>
        )}
      </div>

      {/* Lump sum toggle */}
      <div className="rounded-xl border-2 border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">Lump Sum Available?</p>
            <p className="text-sm text-gray-500 mt-0.5">Do you have a one-time amount ready to invest?</p>
          </div>
          <button
            type="button"
            onClick={() => onChange({ hasLumpSum: !hasLumpSum })}
            className={cn(
              'relative h-6 w-11 rounded-full transition-colors focus:outline-none',
              hasLumpSum ? 'bg-blue-600' : 'bg-gray-200'
            )}
          >
            <div
              className={cn(
                'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                hasLumpSum ? 'translate-x-5' : 'translate-x-0.5'
              )}
            />
          </button>
        </div>

        {hasLumpSum && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {LUMP_PRESETS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onChange({ lumpSumAmount: v })}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                    lumpSumAmount === v
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-200 text-gray-700 hover:border-blue-300'
                  )}
                >
                  ₹{Number(v).toLocaleString('en-IN')}
                </button>
              ))}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₹</span>
              <Input
                type="number"
                placeholder="Enter lump sum amount"
                value={lumpSumAmount}
                onChange={(e) => onChange({ lumpSumAmount: e.target.value })}
                className="h-11 pl-7"
                min={1}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StepHorizon({
  selected,
  onChange,
}: {
  selected: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Investment Horizon</h2>
        <p className="text-gray-500 text-sm mt-1">
          How long do you plan to stay invested before withdrawing?
        </p>
      </div>
      <div className="space-y-3">
        {HORIZON_OPTIONS.map(({ value, label, desc, icon, suitable }) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className={cn(
              'w-full flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all',
              selected === value
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
            )}
          >
            <span className="text-3xl shrink-0">{icon}</span>
            <div className="flex-1 min-w-0">
              <p className={cn('font-semibold', selected === value ? 'text-blue-700' : 'text-gray-900')}>
                {label}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
              <p className="text-xs text-gray-400 mt-1">Best for: {suitable}</p>
            </div>
            {selected === value && <Check className="h-5 w-5 text-blue-600 shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  quizAnswers: Record<string, number>
  goals: string[]
  sectors: string[]
  sipBudget: string
  hasLumpSum: boolean
  lumpSumAmount: string
  horizon: string
}

function initState(profile: InvestorProfile | null): FormState {
  return {
    quizAnswers: {},
    goals: profile?.investmentGoals ?? [],
    sectors: profile?.sectorPreferences ?? [],
    sipBudget: profile?.sipBudget?.toString() ?? '',
    hasLumpSum: profile?.hasLumpSum ?? false,
    lumpSumAmount: profile?.lumpSumAmount?.toString() ?? '',
    horizon: profile?.investmentHorizon ?? '',
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProfileForm({ profile }: { profile: InvestorProfile | null }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [state, setState] = useState<FormState>(() => initState(profile))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update(partial: Partial<FormState>) {
    setState((prev) => ({ ...prev, ...partial }))
  }

  // Derived quiz values
  const rawScore =
    Object.values(state.quizAnswers).reduce((a, b) => a + b, 0) || profile?.riskScore || 10
  const gaugePercent = scoreToPercent(rawScore)
  const riskTolerance = scoreToRisk(rawScore)

  function canProceed(): boolean {
    switch (step) {
      case 0:
        return Object.keys(state.quizAnswers).length === QUIZ_QUESTIONS.length
      case 1:
        return state.goals.length >= 1
      case 2:
        return state.sectors.length >= 1
      case 3:
        return true // optional — skip is fine
      case 4:
        return !!state.horizon
      default:
        return false
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riskScore: rawScore,
          riskTolerance,
          investmentGoals: state.goals,
          sectorPreferences: state.sectors,
          sipBudget: state.sipBudget ? Number(state.sipBudget) : undefined,
          hasLumpSum: state.hasLumpSum,
          lumpSumAmount:
            state.hasLumpSum && state.lumpSumAmount ? Number(state.lumpSumAmount) : undefined,
          investmentHorizon: state.horizon,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Failed to save')
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step progress */}
      <div className="flex items-start gap-0 mb-8">
        {STEPS.map(({ label, icon: Icon }, i) => {
          const done = i < step
          const active = i === step
          return (
            <div key={label} className="flex-1 flex flex-col items-center gap-1.5 relative">
              {/* connector line */}
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'absolute top-4 left-[calc(50%+1.25rem)] right-[-50%] h-0.5 z-0',
                    done ? 'bg-blue-600' : 'bg-gray-200'
                  )}
                />
              )}
              <div
                className={cn(
                  'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all',
                  done
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : active
                    ? 'border-blue-600 bg-white text-blue-600'
                    : 'border-gray-200 bg-white text-gray-400'
                )}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium text-center leading-tight',
                  active ? 'text-blue-700' : done ? 'text-gray-600' : 'text-gray-400'
                )}
              >
                {label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200 rounded-full mb-6">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-300"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-6 sm:p-8">
          {/* Step content */}
          {step === 0 && (
            <StepRiskQuiz
              answers={state.quizAnswers}
              onChange={(id, score) =>
                update({ quizAnswers: { ...state.quizAnswers, [id]: score } })
              }
            />
          )}
          {step === 1 && (
            <StepGoals selected={state.goals} onChange={(goals) => update({ goals })} />
          )}
          {step === 2 && (
            <StepSectors selected={state.sectors} onChange={(sectors) => update({ sectors })} />
          )}
          {step === 3 && (
            <StepBudget
              sipBudget={state.sipBudget}
              hasLumpSum={state.hasLumpSum}
              lumpSumAmount={state.lumpSumAmount}
              onChange={(partial) =>
                update({
                  sipBudget: partial.sipBudget ?? state.sipBudget,
                  hasLumpSum: partial.hasLumpSum ?? state.hasLumpSum,
                  lumpSumAmount: partial.lumpSumAmount ?? state.lumpSumAmount,
                })
              }
            />
          )}
          {step === 4 && (
            <StepHorizon selected={state.horizon} onChange={(horizon) => update({ horizon })} />
          )}

          {/* After quiz step: show live gauge result */}
          {step === 0 && Object.keys(state.quizAnswers).length === QUIZ_QUESTIONS.length && (
            <div className="mt-6 rounded-xl bg-gray-50 border border-gray-200 p-5 flex flex-col items-center gap-3">
              <p className="text-sm font-semibold text-gray-700">Your Risk Profile Result</p>
              <RiskGauge value={gaugePercent} size={160} />
              <p className="text-xs text-gray-500 text-center max-w-xs">
                Based on your answers, your risk profile is{' '}
                <strong className="text-gray-700">{riskTolerance.toLowerCase()}</strong>. You can
                retake this later from your profile page.
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>

            {step < STEPS.length - 1 ? (
              <div className="flex items-center gap-3">
                {step === 3 && (
                  <Button variant="ghost" onClick={() => setStep((s) => s + 1)}>
                    Skip
                  </Button>
                )}
                <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()} className="gap-1">
                  Continue <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button onClick={handleSave} disabled={!canProceed() || saving} className="gap-1 px-6">
                {saving ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-1" />Saving...</>
                ) : (
                  <>Save Profile <Check className="h-4 w-4" /></>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-gray-400 mt-4">
        Step {step + 1} of {STEPS.length}
      </p>
    </div>
  )
}
