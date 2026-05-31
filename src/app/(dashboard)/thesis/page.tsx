'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Brain, Plus, Loader2, RefreshCw, Bell, CheckCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ThesisAlert {
  id: string
  alertType: string
  message: string
  isRead: boolean
  createdAt: string
  thesis: { ticker: string; companyName: string }
}

interface ThesisRecord {
  id: string
  ticker: string
  companyName: string
  sector: string
  addedAt: string
  originalThesis: string
  currentStatus: string
  confidenceScore: number
  lastReviewedAt: string
  nextReviewDue: string
  watchPoints: string[]
  alerts: { id: string; isRead: boolean }[]
  reviews: { reviewDate: string; statusChanged: boolean }[]
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; colour: string; bg: string; border: string; pulse: boolean }> = {
  intact:   { label: '✅ Intact',   colour: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200', pulse: false },
  weakening:{ label: '⚠️ Weakening',colour: 'text-amber-700', bg: 'bg-amber-50',  border: 'border-amber-200', pulse: true  },
  broken:   { label: '❌ Broken',   colour: 'text-red-700',   bg: 'bg-red-50',    border: 'border-red-300',   pulse: false },
  achieved: { label: '🎯 Achieved', colour: 'text-purple-700',bg: 'bg-purple-50', border: 'border-purple-200',pulse: false },
}

function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'lg' }) {
  const m = STATUS_META[status] ?? STATUS_META.intact
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 font-semibold rounded-full border',
      size === 'sm' ? 'text-xs px-2.5 py-0.5' : 'text-sm px-3 py-1',
      m.colour, m.bg, m.border,
    )}>
      {m.pulse && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />}
      {m.label}
    </span>
  )
}

function ConfidenceBar({ score }: { score: number }) {
  const colour = score >= 70 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', colour)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-600 w-12 text-right">{score}/100</span>
    </div>
  )
}

function daysUntil(date: string): string {
  const d = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
  if (d <= 0) return 'Overdue'
  if (d === 1) return '1 day'
  return `${d} days`
}

function daysAgo(date: string): string {
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return '1 day ago'
  return `${d} days ago`
}

// ─── Thesis card ──────────────────────────────────────────────────────────────

function ThesisCard({ thesis }: { thesis: ThesisRecord }) {
  const unread = thesis.alerts.filter((a) => !a.isRead).length
  const meta = STATUS_META[thesis.currentStatus] ?? STATUS_META.intact

  return (
    <Card className={cn(
      'hover:shadow-md transition-all border-2',
      thesis.currentStatus === 'broken' ? 'border-red-200 bg-red-50/30' :
      thesis.currentStatus === 'weakening' ? 'border-amber-200 bg-amber-50/20' :
      'border-gray-200',
    )}>
      <CardContent className="p-5 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn('h-9 w-9 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold', meta.bg, meta.colour)}>
              {thesis.ticker.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm">{thesis.ticker}</p>
              <p className="text-xs text-gray-500 truncate">{thesis.companyName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {unread > 0 && (
              <span className="h-5 w-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">{unread}</span>
            )}
            <StatusBadge status={thesis.currentStatus} />
          </div>
        </div>

        {/* Sector + added */}
        <p className="text-xs text-gray-400">{thesis.sector} · Added {daysAgo(thesis.addedAt)}</p>

        {/* Original thesis excerpt */}
        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">"{thesis.originalThesis}"</p>

        {/* Confidence */}
        <div>
          <p className="text-xs text-gray-400 mb-1">Confidence</p>
          <ConfidenceBar score={thesis.confidenceScore} />
        </div>

        {/* Review timing */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Last reviewed: {daysAgo(thesis.lastReviewedAt)}</span>
          <span>Next: {daysUntil(thesis.nextReviewDue)}</span>
        </div>

        {/* Watch points */}
        {thesis.watchPoints.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {thesis.watchPoints.slice(0, 3).map((wp, i) => (
              <span key={i} className="text-[10px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 truncate max-w-[120px]">{wp}</span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Link href={`/thesis/${thesis.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full text-xs">View full thesis</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'all',      label: 'All' },
  { key: 'intact',   label: '✅ Intact' },
  { key: 'weakening',label: '⚠️ Weakening' },
  { key: 'broken',   label: '❌ Broken' },
  { key: 'achieved', label: '🎯 Achieved' },
]

export default function ThesisPage() {
  const [theses, setTheses] = useState<ThesisRecord[]>([])
  const [alerts, setAlerts] = useState<ThesisAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [markingRead, setMarkingRead] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/thesis').then((r) => r.ok ? r.json() : []),
      fetch('/api/thesis/alerts').then((r) => r.ok ? r.json() : []),
    ]).then(([t, a]) => { setTheses(t); setAlerts(a) })
      .finally(() => setLoading(false))
  }, [])

  async function markAllRead() {
    setMarkingRead(true)
    await fetch('/api/thesis/alerts/read-all', { method: 'POST' })
    setAlerts([])
    setMarkingRead(false)
  }

  const filtered = filter === 'all' ? theses : theses.filter((t) => t.currentStatus === filter)
  const counts: Record<string, number> = {}
  for (const t of theses) counts[t.currentStatus] = (counts[t.currentStatus] ?? 0) + 1

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-600" />
            Thesis Tracker
          </h1>
          <p className="text-gray-500 text-sm mt-1">ARIA remembers why you researched every stock — and tells you if it still holds</p>
        </div>
        <Link href="/watchlist">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add stock to watchlist
          </Button>
        </Link>
      </div>

      {/* Alerts banner */}
      {alerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Bell className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-800 text-sm">{alerts.length} unread thesis alert{alerts.length > 1 ? 's' : ''}</p>
            <ul className="mt-1 space-y-0.5">
              {alerts.slice(0, 3).map((a) => (
                <li key={a.id} className="text-xs text-amber-700 truncate">{a.message}</li>
              ))}
            </ul>
          </div>
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={markingRead} className="shrink-0 gap-1.5 text-xs border-amber-300 text-amber-700">
            {markingRead ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
            Mark all read
          </Button>
        </div>
      )}

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
              filter === tab.key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
            )}
          >
            {tab.label}
            {tab.key !== 'all' && counts[tab.key] ? (
              <span className="ml-1.5 text-xs opacity-75">({counts[tab.key]})</span>
            ) : tab.key === 'all' && theses.length > 0 ? (
              <span className="ml-1.5 text-xs opacity-75">({theses.length})</span>
            ) : null}
          </button>
        ))}
        {theses.length > 0 && (
          <button
            onClick={() => { setLoading(true); fetch('/api/thesis').then((r) => r.json()).then((t) => { setTheses(t); setLoading(false) }) }}
            className="ml-auto p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
            <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center">
              <Brain className="h-8 w-8 text-blue-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-800">
                {filter === 'all' ? 'No theses yet' : `No ${filter} theses`}
              </p>
              <p className="text-sm text-gray-500 mt-1 max-w-sm">
                {filter === 'all'
                  ? 'Add a stock to your watchlist and ARIA will automatically build an investment thesis for it.'
                  : `You have no theses with status "${filter}" right now.`}
              </p>
            </div>
            {filter === 'all' && (
              <Link href="/watchlist">
                <Button className="gap-2 mt-2">
                  <Plus className="h-4 w-4" />
                  Add stock to watchlist
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => <ThesisCard key={t.id} thesis={t} />)}
        </div>
      )}
    </div>
  )
}
