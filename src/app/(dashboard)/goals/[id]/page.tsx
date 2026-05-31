'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Loader2, ArrowLeft, Pencil, Trash2, TrendingUp,
  CheckCircle2, Clock, AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { GoalRing } from '@/components/goals/GoalRing'
import { cn } from '@/lib/utils'
import type { GoalProjection } from '@/lib/goalClock/goalCalculator'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Milestone { id: string; percent: number; reachedAt: string | null; celebrated: boolean }

interface GoalDetail {
  id: string; name: string; emoji: string; goalType: string
  targetAmount: number; targetDate: string; currentCorpus: number
  monthlySIP: number; expectedReturn: number; isPrimary: boolean
  milestones: Milestone[]
  projection: GoalProjection
  insight: string
}

interface CelebrationData { percent: number; message: string }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtINR(n: number) {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)}L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Confetti ─────────────────────────────────────────────────────────────────

function CelebrationOverlay({ data, goalEmoji, goalName, onClose }: { data: CelebrationData; goalEmoji: string; goalName: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let confetti: ((opts: object) => void) | null = null
    import('canvas-confetti').then((mod) => {
      confetti = mod.default
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } })
    }).catch(() => {})
    return () => { confetti = null }
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl relative z-10" onClick={(e) => e.stopPropagation()}>
        <div className="text-6xl mb-4">{goalEmoji}</div>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
          {data.percent === 100 ? '🎉 Goal Reached!' : `🎉 ${data.percent}% Milestone!`}
        </h2>
        <p className="text-lg font-semibold text-blue-700 mb-3">{goalName}</p>
        <p className="text-gray-600 text-sm leading-relaxed mb-6">{data.message}</p>
        <Button onClick={onClose} className="w-full">Continue →</Button>
      </div>
    </div>
  )
}

// ─── Corpus update modal ──────────────────────────────────────────────────────

function CorpusModal({ current, onSave, onClose }: { current: number; onSave: (v: number) => void; onClose: () => void }) {
  const [val, setVal] = useState(String(current))
  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Update corpus</h3>
        <Input type="number" value={val} onChange={(e) => setVal(e.target.value)} placeholder="Current total savings" className="mb-3" autoFocus />
        <p className="text-xs text-gray-400 mb-4">Enter the total amount saved toward this goal today.</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={() => { onSave(parseFloat(val) || 0); onClose() }} className="flex-1">Save</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [goal, setGoal] = useState<GoalDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCorpusModal, setShowCorpusModal] = useState(false)
  const [celebrations, setCelebrations] = useState<CelebrationData[]>([])
  const [currentCelebIdx, setCurrentCelebIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/goals/${id}`)
    if (res.ok) setGoal(await res.json())
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function updateCorpus(corpus: number) {
    const res = await fetch(`/api/goals/${id}/corpus-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ corpus }),
    })
    if (res.ok) {
      const data = await res.json()
      setGoal((g) => g ? { ...g, currentCorpus: corpus, projection: data.projection, milestones: data.milestones ?? g.milestones } : g)
      if (data.crossedMilestones?.length) {
        setCelebrations(data.crossedMilestones)
        setCurrentCelebIdx(0)
      }
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this goal?')) return
    setDeleting(true)
    await fetch(`/api/goals/${id}`, { method: 'DELETE' })
    router.push('/goals')
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
  if (!goal) return <div className="text-center py-20 text-gray-500">Goal not found</div>

  const p = goal.projection
  const celebData = celebrations[currentCelebIdx]

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Celebrations */}
      {celebData && (
        <CelebrationOverlay
          data={celebData}
          goalEmoji={goal.emoji}
          goalName={goal.name}
          onClose={() => {
            if (currentCelebIdx < celebrations.length - 1) setCurrentCelebIdx((i) => i + 1)
            else setCelebrations([])
          }}
        />
      )}

      {showCorpusModal && (
        <CorpusModal current={goal.currentCorpus} onSave={updateCorpus} onClose={() => setShowCorpusModal(false)} />
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/goals')} className="text-gray-400 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold text-gray-900">{goal.emoji} {goal.name}</h1>
          <p className="text-gray-500 text-sm capitalize">{goal.goalType} · Target {fmtDate(goal.targetDate)}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowCorpusModal(true)} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" /> Update corpus
          </Button>
          <Button size="sm" variant="outline" onClick={handleDelete} disabled={deleting} className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Main clock + insight */}
      <Card>
        <CardContent className="p-6 bg-gradient-to-br from-blue-50/60 to-white">
          <div className="flex flex-col lg:flex-row gap-8 items-center">
            <GoalRing
              percent={p.percentComplete}
              emoji={goal.emoji}
              name={goal.name}
              currentCorpus={goal.currentCorpus}
              targetAmount={goal.targetAmount}
              onTrack={p.onTrack}
              monthsRemaining={p.monthsRemaining}
              size="lg"
            />
            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Target', value: fmtINR(p.targetAmount) },
                  { label: 'Corpus today', value: fmtINR(p.currentCorpus) },
                  { label: 'Projected corpus', value: fmtINR(p.projectedCorpus) },
                  { label: 'Monthly SIP', value: fmtINR(goal.monthlySIP) },
                  { label: 'SIP gap', value: p.sipGap > 0 ? fmtINR(p.sipGap) + '/mo' : '—' },
                  { label: 'Shortfall', value: p.projectedShortfall > 0 ? fmtINR(p.projectedShortfall) : '✅ Surplus!' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white rounded-xl border border-gray-100 p-3">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {goal.insight && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-600 mb-1">💡 ARIA Insight</p>
                  <p className="text-sm text-blue-900 leading-relaxed">{goal.insight}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Growth chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" /> Projection Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={p.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colCons" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colMod" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colOpt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => fmtINR(v)} tick={{ fontSize: 10 }} width={70} />
              <Tooltip formatter={(v) => fmtINR(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine y={goal.targetAmount} stroke="#dc2626" strokeDasharray="4 4" label={{ value: 'Target', position: 'right', fontSize: 11, fill: '#dc2626' }} />
              <Area type="monotone" dataKey="conservative" stroke="#f59e0b" fill="url(#colCons)" name="8% (conservative)" strokeWidth={1.5} dot={false} />
              <Area type="monotone" dataKey="moderate" stroke="#3b82f6" fill="url(#colMod)" name="12% (moderate)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="optimistic" stroke="#16a34a" fill="url(#colOpt)" name="15% (optimistic)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Milestones */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Milestone Tracker</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {goal.milestones.map((m) => {
              const reached = !!m.reachedAt
              const isCurrent = !reached && p.nextMilestone?.percent === m.percent
              return (
                <div key={m.id} className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border',
                  reached ? 'bg-green-50 border-green-200' : isCurrent ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200',
                )}>
                  <div className={cn('h-10 w-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0', reached ? 'bg-green-200 text-green-800' : isCurrent ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-500')}>
                    {reached ? '✅' : m.percent === 100 ? '🏆' : `${m.percent}%`}
                  </div>
                  <div className="flex-1">
                    <p className={cn('text-sm font-semibold', reached ? 'text-green-800' : isCurrent ? 'text-blue-800' : 'text-gray-500')}>
                      {m.percent}% — {fmtINR(goal.targetAmount * m.percent / 100)}
                    </p>
                    {reached && <p className="text-xs text-green-600">Reached {fmtDate(m.reachedAt!)}</p>}
                    {isCurrent && p.nextMilestone?.estimatedDate && (
                      <p className="text-xs text-blue-600">Est. {fmtDate(p.nextMilestone.estimatedDate.toISOString())}</p>
                    )}
                    {!reached && !isCurrent && (
                      <p className="text-xs text-gray-400">Need {fmtINR(goal.targetAmount * m.percent / 100 - goal.currentCorpus)} more</p>
                    )}
                  </div>
                  {reached && <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />}
                  {isCurrent && <Clock className="h-5 w-5 text-blue-500 shrink-0" />}
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Scenarios + Step-up */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Scenario Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b">
                      <th className="text-left py-2">Scenario</th>
                      <th className="text-right py-2">Projected</th>
                      <th className="text-right py-2">Gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: '🟡 8% (conservative)', ...p.scenarios.conservative },
                      { label: '🔵 12% (moderate)',     ...p.scenarios.moderate },
                      { label: '🟢 15% (optimistic)',   ...p.scenarios.optimistic },
                    ].map((s) => {
                      const diff = s.projectedCorpus - goal.targetAmount
                      return (
                        <tr key={s.label} className="border-b border-gray-50">
                          <td className="py-2">{s.label}</td>
                          <td className="py-2 text-right font-semibold">{fmtINR(s.projectedCorpus)}</td>
                          <td className={cn('py-2 text-right font-semibold', diff >= 0 ? 'text-green-600' : 'text-red-500')}>
                            {diff >= 0 ? '+' : ''}{fmtINR(diff)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Step-Up SIP Impact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-gray-500">If you increase your SIP by 10% every April:</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-green-600 font-medium">Extra corpus</p>
                  <p className="text-lg font-extrabold text-green-700">{fmtINR(p.stepUpImpact.extraCorpus)}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-blue-600 font-medium">Months saved</p>
                  <p className="text-lg font-extrabold text-blue-700">{p.stepUpImpact.monthsSaved}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-sm">
                <p className="text-gray-600">
                  <span className="font-semibold">Without step-up:</span> {fmtINR(p.projectedCorpus)}
                </p>
                <p className="text-green-700 font-semibold">
                  With 10% annual step-up: {fmtINR(p.stepUpImpact.projectedCorpus)}
                </p>
              </div>
              {p.sipGap > 0 && (
                <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  Increase SIP by {fmtINR(p.sipGap)}/month to close the shortfall without relying on higher returns.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
