'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Loader2, Target } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GoalRing } from '@/components/goals/GoalRing'
import { calculateGoalProjection } from '@/lib/goalClock/goalCalculator'
import type { FinancialGoal } from '@prisma/client'
import { cn } from '@/lib/utils'

// ─── Goal type options ────────────────────────────────────────────────────────

const GOAL_TYPES = [
  { id: 'education',  emoji: '🎓', label: 'Education',   hint: "Child's or your own education fund" },
  { id: 'home',       emoji: '🏠', label: 'Home',         hint: 'Down payment or full purchase' },
  { id: 'wedding',    emoji: '💍', label: 'Wedding',      hint: 'Your wedding or child\'s wedding' },
  { id: 'travel',     emoji: '✈️', label: 'Travel',       hint: 'Dream vacation or world tour' },
  { id: 'retirement', emoji: '🏖️', label: 'Retirement',  hint: 'Your retirement corpus' },
  { id: 'emergency',  emoji: '🛡️', label: 'Emergency',   hint: '6 months emergency fund' },
  { id: 'vehicle',    emoji: '🚗', label: 'Vehicle',      hint: 'Car, bike, or EV purchase' },
  { id: 'custom',     emoji: '💰', label: 'Custom',       hint: 'Any other financial goal' },
]

const EMOJIS = ['🎓', '🏠', '💍', '✈️', '👶', '🏖️', '💰', '🚗', '🛡️', '💎', '🏋️', '🎸', '📚', '🌴', '🏥', '🐕']

function fmtINR(n: number) {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)} L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

interface FormData {
  goalType: string
  name: string
  emoji: string
  targetAmount: string
  targetDate: string
  currentCorpus: string
  monthlySIP: string
}

const STEPS = ['Goal Type', 'Personalise', 'Your Position', 'Preview']

export default function NewGoalPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<FormData>({
    goalType: '', name: '', emoji: '💰',
    targetAmount: '', targetDate: '',
    currentCorpus: '0', monthlySIP: '0',
  })

  function set(k: keyof FormData, v: string) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function canNext() {
    if (step === 0) return !!form.goalType
    if (step === 1) return !!form.name && !!form.targetAmount && !!form.targetDate
    return true
  }

  // Build a mock FinancialGoal for live preview
  const mockGoal: FinancialGoal = {
    id: 'preview', userId: '', name: form.name || 'My Goal', emoji: form.emoji,
    goalType: form.goalType || 'custom',
    targetAmount: parseFloat(form.targetAmount) || 5000000,
    targetDate: form.targetDate ? new Date(form.targetDate) : new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
    currentCorpus: parseFloat(form.currentCorpus) || 0,
    monthlySIP: parseFloat(form.monthlySIP) || 0,
    expectedReturn: 12, isActive: true, isPrimary: false,
    linkedFunds: [], createdAt: new Date(), updatedAt: new Date(),
  }
  const projection = calculateGoalProjection(mockGoal)

  async function handleCreate() {
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, emoji: form.emoji, goalType: form.goalType,
          targetAmount: parseFloat(form.targetAmount),
          targetDate: form.targetDate,
          currentCorpus: parseFloat(form.currentCorpus) || 0,
          monthlySIP: parseFloat(form.monthlySIP) || 0,
          isPrimary: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create goal'); return }
      router.push(`/goals/${data.id}`)
    } catch { setError('Something went wrong') }
    finally { setSaving(false) }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Target className="h-6 w-6 text-blue-600" />
          Create New Goal
        </h1>
        {/* Step indicator */}
        <div className="flex items-center gap-2 mt-4">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                'h-7 w-7 rounded-full text-xs font-bold flex items-center justify-center',
                i < step ? 'bg-blue-600 text-white' : i === step ? 'bg-blue-100 text-blue-700 border-2 border-blue-600' : 'bg-gray-100 text-gray-400',
              )}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={cn('text-xs hidden sm:block', i === step ? 'text-blue-700 font-semibold' : 'text-gray-400')}>{s}</span>
              {i < STEPS.length - 1 && <div className={cn('h-px w-6 sm:w-12', i < step ? 'bg-blue-400' : 'bg-gray-200')} />}
            </div>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          {/* Step 0 — Goal type */}
          {step === 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-4">What are you saving for?</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {GOAL_TYPES.map((gt) => (
                  <button
                    key={gt.id}
                    onClick={() => { set('goalType', gt.id); set('emoji', gt.emoji) }}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
                      form.goalType === gt.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/40',
                    )}
                  >
                    <span className="text-3xl">{gt.emoji}</span>
                    <span className="text-sm font-semibold text-gray-800">{gt.label}</span>
                    <span className="text-[10px] text-gray-500 leading-tight">{gt.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1 — Personalise */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Goal name</label>
                <Input placeholder="e.g. Priya's College Fund" value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={100} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Pick an emoji</label>
                <div className="flex flex-wrap gap-2">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => set('emoji', e)}
                      className={cn('text-2xl p-2 rounded-lg border-2 transition-all', form.emoji === e ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300')}
                    >{e}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Target amount (₹)</label>
                  <Input type="number" placeholder="50,00,000" value={form.targetAmount} onChange={(e) => set('targetAmount', e.target.value)} min={1000} />
                  {form.targetAmount && <p className="text-xs text-gray-400 mt-1">{fmtINR(parseFloat(form.targetAmount) || 0)}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Target date</label>
                  <Input type="month" value={form.targetDate ? form.targetDate.slice(0, 7) : ''} onChange={(e) => set('targetDate', e.target.value + '-01')} min={new Date().toISOString().slice(0, 7)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Current position */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Current savings for this goal (₹)</label>
                <Input type="number" placeholder="0" value={form.currentCorpus} onChange={(e) => set('currentCorpus', e.target.value)} min={0} />
                <p className="text-xs text-gray-400 mt-1">How much you already have saved toward this specific goal</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Monthly SIP for this goal (₹)</label>
                <Input type="number" placeholder="3000" value={form.monthlySIP} onChange={(e) => set('monthlySIP', e.target.value)} min={0} />
                <p className="text-xs text-gray-400 mt-1">How much you invest monthly toward this goal</p>
              </div>
            </div>
          )}

          {/* Step 3 — Live preview */}
          {step === 3 && (
            <div className="space-y-5">
              <p className="text-sm font-semibold text-gray-700">Your Goal Clock preview</p>
              <div className="flex justify-center">
                <GoalRing
                  percent={projection.percentComplete}
                  emoji={form.emoji}
                  name={form.name}
                  currentCorpus={parseFloat(form.currentCorpus) || 0}
                  targetAmount={parseFloat(form.targetAmount) || 0}
                  onTrack={projection.onTrack}
                  monthsRemaining={projection.monthsRemaining}
                  size="lg"
                />
              </div>

              {/* Scenarios */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b">
                      <th className="text-left py-2">Scenario</th>
                      <th className="text-right py-2">Rate</th>
                      <th className="text-right py-2">Projected</th>
                      <th className="text-right py-2">vs Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: '🟡 Conservative', ...projection.scenarios.conservative },
                      { label: '🔵 Moderate',     ...projection.scenarios.moderate },
                      { label: '🟢 Optimistic',   ...projection.scenarios.optimistic },
                    ].map((s) => {
                      const target = parseFloat(form.targetAmount) || 0
                      const diff = s.projectedCorpus - target
                      return (
                        <tr key={s.label} className="border-b border-gray-50">
                          <td className="py-2 text-gray-700">{s.label}</td>
                          <td className="py-2 text-right text-gray-500">{s.rate}%</td>
                          <td className="py-2 text-right font-semibold text-gray-900">{fmtINR(s.projectedCorpus)}</td>
                          <td className={cn('py-2 text-right font-semibold', diff >= 0 ? 'text-green-600' : 'text-red-500')}>
                            {diff >= 0 ? '+' : ''}{fmtINR(diff)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {projection.sipGap > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                  ⚠️ You need <strong>{fmtINR(projection.sipGap)}/month more</strong> to stay on track at 12% p.a.
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => step > 0 ? setStep(step - 1) : router.back()} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        {step < 3 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="gap-2">
            Continue
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleCreate} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            🎯 Create this goal
          </Button>
        )}
      </div>
    </div>
  )
}
