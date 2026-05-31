'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Brain, ChevronLeft, RefreshCw, Loader2, Save, Plus, X, TrendingUp, TrendingDown,
  Lock, Pencil,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface KeyMetrics {
  pe: number | null
  revenueGrowth: number | null
  debtEquity: number | null
  promoterHolding: number | null
  epsGrowth: number | null
}

interface ThesisReview {
  id: string
  reviewDate: string
  previousStatus: string
  newStatus: string
  statusChanged: boolean
  aiSummary: string
  keyChanges: string[]
  newConfidence: number
  reviewedBy: string
}

interface ThesisDetail {
  id: string
  ticker: string
  companyName: string
  sector: string
  addedAt: string
  originalThesis: string
  userNotes: string | null
  buyZone: { low: number; high: number } | null
  targetPrice: number | null
  stopLossLevel: number | null
  timeHorizon: string | null
  currentStatus: string
  confidenceScore: number
  lastReviewedAt: string
  nextReviewDue: string
  keyMetrics: KeyMetrics
  watchPoints: string[]
  reviews: ThesisReview[]
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; colour: string; bg: string; border: string }> = {
  intact:   { label: '✅ Intact',    colour: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200' },
  weakening:{ label: '⚠️ Weakening', colour: 'text-amber-700', bg: 'bg-amber-50',  border: 'border-amber-200' },
  broken:   { label: '❌ Broken',    colour: 'text-red-700',   bg: 'bg-red-50',    border: 'border-red-300'   },
  achieved: { label: '🎯 Achieved',  colour: 'text-purple-700',bg: 'bg-purple-50', border: 'border-purple-200'},
}

function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'lg' }) {
  const m = STATUS_META[status] ?? STATUS_META.intact
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 font-semibold rounded-full border',
      size === 'sm' ? 'text-xs px-2.5 py-0.5' : 'text-base px-4 py-1.5',
      m.colour, m.bg, m.border,
    )}>{m.label}</span>
  )
}

function fmt(n: number | null, suffix = ''): string {
  if (n === null || n === undefined) return '—'
  return `${n}${suffix}`
}

function daysAgo(date: string): string {
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return '1 day ago'
  return `${d} days ago`
}

// ─── Price range tracker ──────────────────────────────────────────────────────

function PriceRangeTracker({ stopLoss, buyZone, targetPrice }: {
  stopLoss: number | null
  buyZone: { low: number; high: number } | null
  targetPrice: number | null
}) {
  if (!stopLoss && !buyZone && !targetPrice) return null
  const low = stopLoss ?? (buyZone?.low ?? 0)
  const high = targetPrice ?? (buyZone?.high ?? low * 1.5)
  const range = high - low || 1

  const markers = [
    stopLoss != null && { label: 'Stop Loss', value: stopLoss, colour: '#ef4444' },
    buyZone && { label: 'Buy Zone', value: (buyZone.low + buyZone.high) / 2, colour: '#3b82f6' },
    targetPrice != null && { label: 'Target', value: targetPrice, colour: '#16a34a' },
  ].filter(Boolean) as { label: string; value: number; colour: string }[]

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-700">Price Levels</p>
      <div className="relative">
        <div className="h-3 bg-gradient-to-r from-red-200 via-blue-100 to-green-200 rounded-full" />
        {markers.map((m) => {
          const pct = Math.min(100, Math.max(0, ((m.value - low) / range) * 100))
          return (
            <div key={m.label} className="absolute top-0" style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}>
              <div className="w-3 h-3 rounded-full border-2 border-white shadow" style={{ background: m.colour }} />
              <div className="absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <p className="text-[10px] font-bold" style={{ color: m.colour }}>{m.label}</p>
                <p className="text-[10px] text-gray-500 text-center">₹{m.value.toLocaleString('en-IN')}</p>
              </div>
            </div>
          )
        })}
      </div>
      <div className="h-8" /> {/* spacer for marker labels */}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ThesisDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [thesis, setThesis] = useState<ThesisDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [notesValue, setNotesValue] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [newWatchPoint, setNewWatchPoint] = useState('')
  const [savingWP, setSavingWP] = useState(false)

  const loadThesis = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/thesis/${params.id}`)
    if (res.ok) {
      const data: ThesisDetail = await res.json()
      setThesis(data)
      setNotesValue(data.userNotes ?? '')
    }
    setLoading(false)
  }, [params.id])

  useEffect(() => { loadThesis() }, [loadThesis])

  async function triggerReview() {
    setReviewing(true); setReviewError('')
    const res = await fetch(`/api/thesis/${params.id}/review`, { method: 'POST' })
    if (!res.ok) {
      const d = await res.json()
      setReviewError(d.error ?? 'Review failed')
    } else {
      await loadThesis()
    }
    setReviewing(false)
  }

  async function saveNotes() {
    setSavingNotes(true)
    await fetch(`/api/thesis/${params.id}/notes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: notesValue }),
    })
    setSavingNotes(false); setEditingNotes(false)
  }

  async function addWatchPoint() {
    if (!thesis || !newWatchPoint.trim()) return
    setSavingWP(true)
    const updated = [...thesis.watchPoints, newWatchPoint.trim()]
    await fetch(`/api/thesis/${params.id}/watch-points`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watchPoints: updated }),
    })
    setThesis({ ...thesis, watchPoints: updated })
    setNewWatchPoint('')
    setSavingWP(false)
  }

  async function removeWatchPoint(idx: number) {
    if (!thesis) return
    const updated = thesis.watchPoints.filter((_, i) => i !== idx)
    await fetch(`/api/thesis/${params.id}/watch-points`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watchPoints: updated }),
    })
    setThesis({ ...thesis, watchPoints: updated })
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  )

  if (!thesis) return (
    <div className="text-center py-20">
      <p className="text-gray-500">Thesis not found.</p>
      <Button variant="outline" onClick={() => router.back()} className="mt-4">Go back</Button>
    </div>
  )

  const m = thesis.keyMetrics
  const metricRows = [
    { label: 'P/E Ratio',        value: fmt(m.pe, 'x') },
    { label: 'Revenue Growth',   value: fmt(m.revenueGrowth, '%') },
    { label: 'Debt/Equity',      value: fmt(m.debtEquity) },
    { label: 'Promoter Holding', value: fmt(m.promoterHolding, '%') },
    { label: 'EPS Growth YoY',   value: fmt(m.epsGrowth, '%') },
  ]

  return (
    <div className="max-w-5xl space-y-6">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/thesis')} className="gap-1.5 text-gray-500">
          <ChevronLeft className="h-4 w-4" />Back
        </Button>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-600" />
            {thesis.ticker} — {thesis.companyName}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {thesis.sector} · Added {daysAgo(thesis.addedAt)}
            {thesis.timeHorizon && ` · ${thesis.timeHorizon} horizon`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={thesis.currentStatus} size="lg" />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Left column ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Original thesis — locked */}
          <Card className="border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-gray-700">
                <Lock className="h-4 w-4 text-gray-400" />
                Original Thesis
                <Badge variant="outline" className="text-[10px] ml-auto">Locked — never changes</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 leading-relaxed italic">"{thesis.originalThesis}"</p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                {metricRows.map((r) => (
                  <div key={r.label} className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">{r.label}</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{r.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* User notes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-gray-700">
                <Pencil className="h-4 w-4 text-gray-400" />
                My Notes
                {!editingNotes && (
                  <button onClick={() => setEditingNotes(true)} className="ml-auto text-xs text-blue-600 hover:underline">Edit</button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editingNotes ? (
                <div className="space-y-2">
                  <textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    rows={4}
                    placeholder="Your own research notes for this stock…"
                    className="w-full text-sm border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingNotes(false); setNotesValue(thesis.userNotes ?? '') }}>Cancel</Button>
                    <Button size="sm" onClick={saveNotes} disabled={savingNotes} className="gap-1.5">
                      {savingNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600">{thesis.userNotes || <span className="text-gray-400 italic">No notes yet. Click Edit to add your own research notes.</span>}</p>
              )}
            </CardContent>
          </Card>

          {/* Watch points */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-700">Watch Points</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {thesis.watchPoints.map((wp, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                  <span className="flex-1">{wp}</span>
                  <button onClick={() => removeWatchPoint(i)} className="text-gray-300 hover:text-red-500 transition-colors shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2 mt-3">
                <input
                  value={newWatchPoint}
                  onChange={(e) => setNewWatchPoint(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addWatchPoint()}
                  placeholder="Add a watch point…"
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <Button size="sm" variant="outline" onClick={addWatchPoint} disabled={savingWP || !newWatchPoint.trim()}>
                  {savingWP ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Price levels */}
          {(thesis.stopLossLevel || thesis.buyZone || thesis.targetPrice) && (
            <Card>
              <CardContent className="p-5">
                <PriceRangeTracker
                  stopLoss={thesis.stopLossLevel}
                  buyZone={thesis.buyZone}
                  targetPrice={thesis.targetPrice}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right column ─────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Status card */}
          <Card className={cn('border-2', STATUS_META[thesis.currentStatus]?.border ?? 'border-gray-200')}>
            <CardContent className="p-5 space-y-4">
              <div className="text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Current Status</p>
                <StatusBadge status={thesis.currentStatus} size="lg" />
              </div>

              {/* Confidence gauge */}
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Confidence</span>
                  <span className="font-bold text-gray-700">{thesis.confidenceScore}/100</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all',
                      thesis.confidenceScore >= 70 ? 'bg-green-500' :
                      thesis.confidenceScore >= 50 ? 'bg-amber-500' : 'bg-red-500')}
                    style={{ width: `${thesis.confidenceScore}%` }}
                  />
                </div>
              </div>

              <div className="text-xs text-gray-400 space-y-1">
                <div className="flex justify-between">
                  <span>Last reviewed</span>
                  <span className="text-gray-600">{daysAgo(thesis.lastReviewedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Next review due</span>
                  <span className="text-gray-600">
                    {Math.ceil((new Date(thesis.nextReviewDue).getTime() - Date.now()) / 86400000) <= 0
                      ? <span className="text-red-500 font-semibold">Overdue</span>
                      : `${Math.ceil((new Date(thesis.nextReviewDue).getTime() - Date.now()) / 86400000)} days`}
                  </span>
                </div>
              </div>

              <Button
                onClick={triggerReview}
                disabled={reviewing}
                className="w-full gap-2"
              >
                {reviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {reviewing ? 'Reviewing…' : 'Trigger manual review'}
              </Button>
              {reviewError && <p className="text-xs text-red-500 text-center">{reviewError}</p>}
            </CardContent>
          </Card>

          {/* Latest review summary */}
          {thesis.reviews.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-700">Latest Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={thesis.reviews[0].previousStatus} />
                  <span className="text-gray-400 text-xs">→</span>
                  <StatusBadge status={thesis.reviews[0].newStatus} />
                </div>
                <p className="text-xs text-gray-600">{thesis.reviews[0].aiSummary}</p>
                <div className="flex items-center justify-between text-[10px] text-gray-400">
                  <span>{thesis.reviews[0].reviewedBy === 'auto_weekly' ? '🤖 Auto review' : '👤 Manual review'}</span>
                  <span>{daysAgo(thesis.reviews[0].reviewDate)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Review history timeline */}
      {thesis.reviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-700">Review History ({thesis.reviews.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-0">
              {thesis.reviews.map((review, i) => (
                <div key={review.id} className={cn('flex gap-4 pb-6 relative', i < thesis.reviews.length - 1 && 'after:absolute after:left-[11px] after:top-6 after:bottom-0 after:w-px after:bg-gray-200')}>
                  <div className={cn(
                    'h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 z-10',
                    review.statusChanged ? 'bg-blue-100' : 'bg-gray-100',
                  )}>
                    {review.statusChanged
                      ? <TrendingUp className="h-3 w-3 text-blue-600" />
                      : <TrendingDown className="h-3 w-3 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs text-gray-400">{new Date(review.reviewDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span className="text-[10px] text-gray-300">{review.reviewedBy === 'auto_weekly' ? '🤖 Auto' : '👤 Manual'}</span>
                      {review.statusChanged && (
                        <div className="flex items-center gap-1">
                          <StatusBadge status={review.previousStatus} />
                          <span className="text-gray-400 text-xs">→</span>
                          <StatusBadge status={review.newStatus} />
                        </div>
                      )}
                      <span className="ml-auto text-xs font-semibold text-gray-600">{review.newConfidence}/100</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{review.aiSummary}</p>
                    {review.keyChanges.length > 0 && (
                      <ul className="space-y-0.5">
                        {review.keyChanges.map((c, j) => (
                          <li key={j} className="text-xs text-gray-500 flex items-start gap-1.5">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gray-300 shrink-0" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
