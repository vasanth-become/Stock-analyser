'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  TrendingUp, ChevronRight, ChevronLeft, Loader2,
  User, IndianRupee, BarChart2, Target, Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// --- Types ---
type Experience = 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT'
type Acknowledged = boolean
type RiskTolerance = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE'

interface OnboardingData {
  displayName: string
  age: string
  monthlyIncome: string
  experience: Experience | ''
  riskTolerance: RiskTolerance
  investmentGoals: string[]
  acknowledged: Acknowledged
}

// --- Step definitions ---
const STEPS = ['Before You Start', 'About You', 'Finances', 'Experience', 'Goals'] as const

const EXPERIENCE_OPTIONS: { value: Experience; label: string; desc: string; icon: string }[] = [
  { value: 'BEGINNER', label: 'Beginner', desc: 'New to investing, learning the basics', icon: '🌱' },
  { value: 'INTERMEDIATE', label: 'Intermediate', desc: 'Some experience, comfortable with stocks', icon: '📈' },
  { value: 'EXPERT', label: 'Expert', desc: 'Seasoned investor with deep market knowledge', icon: '🎯' },
]

const RISK_OPTIONS: { value: RiskTolerance; label: string; desc: string; color: string }[] = [
  { value: 'CONSERVATIVE', label: 'Conservative', desc: 'Prefer safety over high returns', color: 'blue' },
  { value: 'MODERATE', label: 'Moderate', desc: 'Balance between risk and return', color: 'green' },
  { value: 'AGGRESSIVE', label: 'Aggressive', desc: 'Comfortable with high risk for high reward', color: 'orange' },
]

const GOAL_OPTIONS = [
  { value: 'wealth_creation', label: 'Wealth Creation', icon: '💰' },
  { value: 'retirement', label: 'Retirement Planning', icon: '🏖️' },
  { value: 'passive_income', label: 'Passive Income', icon: '💵' },
  { value: 'short_term', label: 'Short-term Gains', icon: '⚡' },
  { value: 'tax_saving', label: 'Tax Saving (ELSS)', icon: '📋' },
  { value: 'education', label: 'Education Fund', icon: '🎓' },
]

// --- Step components ---
function StepAcknowledge({ data, onChange }: { data: OnboardingData; onChange: (d: Partial<OnboardingData>) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Before we build your research profile</h2>
        <p className="text-gray-500 mt-1">
          ARIA Research uses your answers to personalise the research insights you see. This is not
          financial planning or investment advice — it is a research customisation tool. You are
          always in control of your investment decisions.
        </p>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-amber-900">Important</p>
        <ul className="text-sm text-amber-800 space-y-1.5">
          <li>• ARIA Research is <strong>not</strong> a SEBI-registered Investment Adviser or Research Analyst</li>
          <li>• All research outputs are AI-generated and for informational purposes only</li>
          <li>• You are solely responsible for your investment decisions</li>
          <li>• Always consult a SEBI-registered adviser before investing</li>
        </ul>
      </div>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={data.acknowledged}
          onChange={(e) => onChange({ acknowledged: e.target.checked })}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700">
          I understand that ARIA Research is an AI research tool and not a SEBI-registered investment adviser. I will use research outputs as one input for my own decisions.
        </span>
      </label>
    </div>
  )
}

function StepAbout({ data, onChange }: { data: OnboardingData; onChange: (d: Partial<OnboardingData>) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Tell us about yourself</h2>
        <p className="text-gray-500 mt-1">This helps us personalise your experience</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">What should we call you?</label>
          <Input
            placeholder="e.g. Rahul"
            value={data.displayName}
            onChange={(e) => onChange({ displayName: e.target.value })}
            className="h-11"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Your age</label>
          <Input
            type="number"
            placeholder="e.g. 28"
            min={18}
            max={100}
            value={data.age}
            onChange={(e) => onChange({ age: e.target.value })}
            className="h-11"
          />
          <p className="text-xs text-gray-400">Must be 18 or above to use ARIA Research</p>
        </div>
      </div>
    </div>
  )
}

function StepFinances({ data, onChange }: { data: OnboardingData; onChange: (d: Partial<OnboardingData>) => void }) {
  const brackets = [
    { label: 'Up to ₹25,000', value: '25000' },
    { label: '₹25,001 – ₹50,000', value: '50000' },
    { label: '₹50,001 – ₹1,00,000', value: '100000' },
    { label: '₹1,00,001 – ₹2,00,000', value: '200000' },
    { label: '₹2,00,000+', value: '300000' },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Your monthly income</h2>
        <p className="text-gray-500 mt-1">Used to suggest appropriate investment amounts</p>
      </div>
      <div className="space-y-3">
        {brackets.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange({ monthlyIncome: value })}
            className={cn(
              'w-full flex items-center justify-between rounded-xl border-2 px-4 py-3.5 text-sm font-medium transition-all',
              data.monthlyIncome === value
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
            )}
          >
            <span className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4" />
              {label}
            </span>
            {data.monthlyIncome === value && <Check className="h-4 w-4" />}
          </button>
        ))}
      </div>
    </div>
  )
}

function StepExperience({ data, onChange }: { data: OnboardingData; onChange: (d: Partial<OnboardingData>) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Investment experience</h2>
        <p className="text-gray-500 mt-1">We&apos;ll tailor analysis complexity to your level</p>
      </div>
      <div className="space-y-3">
        {EXPERIENCE_OPTIONS.map(({ value, label, desc, icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange({ experience: value })}
            className={cn(
              'w-full flex items-start gap-4 rounded-xl border-2 px-4 py-4 text-left transition-all',
              data.experience === value
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
            )}
          >
            <span className="text-2xl mt-0.5">{icon}</span>
            <div className="flex-1">
              <p className={cn('font-semibold', data.experience === value ? 'text-blue-700' : 'text-gray-900')}>
                {label}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
            </div>
            {data.experience === value && <Check className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Risk tolerance</p>
        <div className="grid grid-cols-3 gap-2">
          {RISK_OPTIONS.map(({ value, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ riskTolerance: value })}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-center transition-all',
                data.riskTolerance === value
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              )}
            >
              <span className="text-sm font-semibold">{label}</span>
              <span className="text-xs text-gray-400 leading-tight">{desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function StepGoals({ data, onChange }: { data: OnboardingData; onChange: (d: Partial<OnboardingData>) => void }) {
  function toggle(value: string) {
    const next = data.investmentGoals.includes(value)
      ? data.investmentGoals.filter((g) => g !== value)
      : [...data.investmentGoals, value]
    onChange({ investmentGoals: next })
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Your investment goals</h2>
        <p className="text-gray-500 mt-1">Select all that apply — pick at least one</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {GOAL_OPTIONS.map(({ value, label, icon }) => {
          const selected = data.investmentGoals.includes(value)
          return (
            <button
              key={value}
              type="button"
              onClick={() => toggle(value)}
              className={cn(
                'flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all',
                selected
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              <span className="text-xl">{icon}</span>
              <span className={cn('text-sm font-medium', selected ? 'text-blue-700' : 'text-gray-700')}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// --- Main page ---
export default function OnboardingPage() {
  const router = useRouter()
  const { update: updateSession } = useSession()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<OnboardingData>({
    displayName: '',
    age: '',
    monthlyIncome: '',
    experience: '',
    riskTolerance: 'MODERATE',
    investmentGoals: [],
    acknowledged: false,
  })

  function update(partial: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...partial }))
  }

  function canProceed() {
    if (step === 0) return data.acknowledged
    if (step === 1) return data.displayName.trim().length >= 2 && Number(data.age) >= 18
    if (step === 2) return !!data.monthlyIncome
    if (step === 3) return !!data.experience
    if (step === 4) return data.investmentGoals.length >= 1
    return false
  }

  async function handleFinish() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          age: Number(data.age),
          monthlyIncome: Number(data.monthlyIncome),
        }),
      })

      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Failed to save profile')
        return
      }

      // Refresh JWT so middleware sees onboarded = true
      await updateSession({ onboarded: true })
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const stepComponents = [
    <StepAcknowledge key="acknowledge" data={data} onChange={update} />,
    <StepAbout key="about" data={data} onChange={update} />,
    <StepFinances key="finances" data={data} onChange={update} />,
    <StepExperience key="experience" data={data} onChange={update} />,
    <StepGoals key="goals" data={data} onChange={update} />,
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">ARIA Research</span>
        </div>

        {/* Progress steps */}
        <div className="flex items-center justify-between mb-8 px-2">
          {STEPS.map((label, i) => {
            const icons = [Check, User, IndianRupee, BarChart2, Target]
            const Icon = icons[i]
            const done = i < step
            const active = i === step
            return (
              <div key={label} className="flex flex-col items-center gap-1.5 flex-1">
                <div className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all',
                  done ? 'bg-blue-600 border-blue-600 text-white' :
                  active ? 'border-blue-600 bg-white text-blue-600' :
                  'border-gray-200 bg-white text-gray-400'
                )}>
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={cn(
                  'text-xs font-medium',
                  active ? 'text-blue-700' : done ? 'text-gray-600' : 'text-gray-400'
                )}>
                  {label}
                </span>
                {/* connector */}
                {i < STEPS.length - 1 && (
                  <div className={cn(
                    'absolute h-0.5 w-[calc(25%-2.5rem)] mt-4 left-0 transition-all',
                  )} />
                )}
              </div>
            )
          })}
        </div>

        {/* Step progress bar */}
        <div className="h-1.5 bg-gray-200 rounded-full mb-6">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="p-8">
            {stepComponents[step]}

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

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

              {step === 0 ? (
                <Button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canProceed()}
                  className="gap-1 px-6"
                >
                  I understand — build my research profile
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : step < STEPS.length - 1 ? (
                <Button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canProceed()}
                  className="gap-1 px-6"
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleFinish}
                  disabled={!canProceed() || saving}
                  className="gap-1 px-6"
                >
                  {saving ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-1" />Saving...</>
                  ) : (
                    <>Go to my research dashboard <ChevronRight className="h-4 w-4" /></>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-4">
          Step {step + 1} of {STEPS.length} · You can update this later in Settings
        </p>
      </div>
    </div>
  )
}
