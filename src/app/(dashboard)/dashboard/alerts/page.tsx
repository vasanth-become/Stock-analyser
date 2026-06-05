'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Bell, Plus, Shield, Loader2, RefreshCw,
  TrendingUp, TrendingDown, Percent, Info, Mail,
  ToggleLeft, ToggleRight, Trash2, CheckCircle2,
  AlertTriangle, Brain, Target,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type AlertType = 'PRICE_ABOVE' | 'PRICE_BELOW' | 'PERCENT_CHANGE'
type FeedFilter = 'all' | 'price' | 'research' | 'market'

interface PriceAlert {
  id: string
  symbol: string
  exchange: 'NSE' | 'BSE'
  type: AlertType
  value: number
  triggered: boolean
  triggeredAt: string | null
  notifiedAt: string | null
  active: boolean
  createdAt: string
}

interface ThesisAlert {
  id: string
  alertType: string
  message: string
  isRead: boolean
  createdAt: string
  thesis: { ticker: string; companyName: string }
}

interface BehaviourAlert {
  id: string
  alertType: string
  triggerValue: number
  message: string
  wasRead: boolean
  createdAt: string
}

interface ScoreData {
  score: number
  panicsStopped: number
  sipsKept: number
}

const TYPE_META: Record<AlertType, { label: string; icon: typeof TrendingUp; color: string; prefix: string; suffix: string }> = {
  PRICE_ABOVE:    { label: 'Price Above',  icon: TrendingUp,   color: 'text-green-600 bg-green-50',  prefix: '₹', suffix: '' },
  PRICE_BELOW:    { label: 'Price Below',  icon: TrendingDown, color: 'text-red-600 bg-red-50',      prefix: '₹', suffix: '' },
  PERCENT_CHANGE: { label: '% Change ≥',   icon: Percent,      color: 'text-blue-600 bg-blue-50',    prefix: '±', suffix: '%' },
}

function getScoreLabel(score: number) {
  if (score >= 80) return { label: 'Excellent', colour: '#16a34a' }
  if (score >= 60) return { label: 'Good',      colour: '#2563eb' }
  if (score >= 40) return { label: 'Fair',      colour: '#f59e0b' }
  return { label: 'Needs Work', colour: '#dc2626' }
}

// ─── Add alert form ───────────────────────────────────────────────────────────

function AddAlertForm({ onAdd, onClose }: { onAdd: (a: PriceAlert) => void; onClose: () => void }) {
  const [symbol, setSymbol] = useState('')
  const [exchange, setExchange] = useState<'NSE' | 'BSE'>('NSE')
  const [type, setType] = useState<AlertType>('PRICE_ABOVE')
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!symbol || !value) { setError('Symbol and threshold are required.'); return }
    const num = parseFloat(value)
    if (isNaN(num) || num <= 0) { setError('Enter a valid positive number.'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, exchange, type, value: num }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      onAdd(data as PriceAlert)
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create alert')
    } finally {
      setSaving(false)
    }
  }

  const meta = TYPE_META[type]

  return (
    <div className="space-y-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
      <p className="text-sm font-semibold text-gray-800">New Price Alert</p>
      <div className="flex gap-2">
        <Input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="e.g. RELIANCE" className="uppercase flex-1 h-9 text-sm" />
        <div className="flex gap-1 shrink-0">
          {(['NSE', 'BSE'] as const).map((ex) => (
            <button key={ex} onClick={() => setExchange(ex)}
              className={cn('px-3 h-9 rounded-md text-xs font-medium border transition-colors',
                exchange === ex ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300')}>
              {ex}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {(Object.keys(TYPE_META) as AlertType[]).map((t) => {
          const m = TYPE_META[t]; const TIcon = m.icon
          return (
            <button key={t} onClick={() => setType(t)}
              className={cn('flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-xs font-medium transition-colors',
                type === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300')}>
              <TIcon className="h-4 w-4" />{m.label}
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 font-medium w-6">{meta.prefix}</span>
        <Input type="number" min="0.01" step={type === 'PERCENT_CHANGE' ? '0.1' : '1'}
          value={value} onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={type === 'PERCENT_CHANGE' ? 'e.g. 5' : 'e.g. 3000'}
          className="flex-1 h-9 text-sm" />
        {meta.suffix && <span className="text-sm text-gray-500 font-medium">{meta.suffix}</span>}
      </div>
      <p className="text-[11px] text-gray-500 flex items-center gap-1">
        <Info className="h-3 w-3" />
        {type === 'PRICE_ABOVE' && `Alert when ${symbol || 'stock'} rises above ${meta.prefix}${value || '…'}`}
        {type === 'PRICE_BELOW' && `Alert when ${symbol || 'stock'} falls below ${meta.prefix}${value || '…'}`}
        {type === 'PERCENT_CHANGE' && `Alert when ${symbol || 'stock'} moves more than ±${value || '…'}% in a day`}
      </p>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={submit} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
          Create Alert
        </Button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([])
  const [thesisAlerts, setThesisAlerts] = useState<ThesisAlert[]>([])
  const [behaviourAlerts, setBehaviourAlerts] = useState<BehaviourAlert[]>([])
  const [score, setScore] = useState<ScoreData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<FeedFilter>('all')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [pa, ta, ba, sc] = await Promise.allSettled([
        fetch('/api/alerts').then((r) => r.json()),
        fetch('/api/thesis/alerts').then((r) => r.json()),
        fetch('/api/behaviour/score').then((r) => r.json()),
        fetch('/api/behaviour/score').then((r) => r.json()),
      ])
      if (pa.status === 'fulfilled') setPriceAlerts(Array.isArray(pa.value) ? pa.value : [])
      if (ta.status === 'fulfilled') setThesisAlerts(Array.isArray(ta.value) ? ta.value : [])
      if (ba.status === 'fulfilled') setScore(ba.value as ScoreData)
      if (sc.status === 'fulfilled') setScore(sc.value as ScoreData)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const totalUnread =
    priceAlerts.filter((a) => a.triggered && a.active).length +
    thesisAlerts.filter((a) => !a.isRead).length +
    behaviourAlerts.filter((a) => !a.wasRead).length

  // Build unified feed
  type FeedItem =
    | { kind: 'price'; data: PriceAlert; date: Date }
    | { kind: 'thesis'; data: ThesisAlert; date: Date }
    | { kind: 'behaviour'; data: BehaviourAlert; date: Date }

  const feed: FeedItem[] = [
    ...priceAlerts.filter((a) => a.triggered).map((a) => ({ kind: 'price' as const, data: a, date: new Date(a.triggeredAt ?? a.createdAt) })),
    ...thesisAlerts.map((a) => ({ kind: 'thesis' as const, data: a, date: new Date(a.createdAt) })),
    ...behaviourAlerts.map((a) => ({ kind: 'behaviour' as const, data: a, date: new Date(a.createdAt) })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime())

  const filtered = feed.filter((item) => {
    if (filter === 'all') return true
    if (filter === 'price') return item.kind === 'price'
    if (filter === 'research') return item.kind === 'thesis'
    if (filter === 'market') return item.kind === 'behaviour'
    return true
  })

  const { label: scoreLabel, colour: scoreColour } = getScoreLabel(score?.score ?? 0)

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-600" />
            Alerts
          </h1>
          {totalUnread > 0 && (
            <p className="text-sm text-gray-400 mt-0.5">{totalUnread} unread</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={cn('h-3.5 w-3.5 mr-1', loading && 'animate-spin')} /> Refresh
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)} disabled={showForm}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Set price alert
          </Button>
        </div>
      </div>

      {/* Discipline Score widget */}
      {score && (
        <Card className="border-0 bg-gradient-to-r from-slate-50 to-blue-50">
          <CardContent className="py-4 px-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4"
                style={{ borderColor: scoreColour }}>
                <span className="text-sm font-bold" style={{ color: scoreColour }}>{score.score}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-gray-900 text-sm">Discipline Score: {score.score}/100</span>
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: scoreColour }}>{scoreLabel}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {score.panicsStopped ?? 0} panic{score.panicsStopped !== 1 ? 's' : ''} stopped ·{' '}
                  {score.sipsKept ?? 0} SIPs kept on track
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add alert form */}
      {showForm && (
        <AddAlertForm
          onAdd={(a) => setPriceAlerts((prev) => [a, ...prev])}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {(['all', 'price', 'research', 'market'] as FeedFilter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn('shrink-0 rounded-full px-4 py-1.5 text-xs font-medium border transition-colors capitalize',
              filter === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300')}>
            {f === 'all' ? 'All' : f === 'price' ? 'Price' : f === 'research' ? 'Research' : 'Market'}
          </button>
        ))}

        {/* Active price alerts count */}
        <button onClick={() => setShowForm(true)}
          className="shrink-0 ml-auto rounded-full px-4 py-1.5 text-xs font-medium border border-dashed border-gray-300 text-gray-400 hover:border-blue-300 hover:text-blue-600 transition-colors whitespace-nowrap">
          {priceAlerts.filter((a) => a.active).length} active price alerts
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <Card>
          <CardContent className="py-8 flex items-center justify-center gap-2 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading alerts…</span>
          </CardContent>
        </Card>
      )}

      {/* Unified feed */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((item, i) => {
            if (item.kind === 'price') {
              const a = item.data
              const meta = TYPE_META[a.type]
              const Icon = meta.icon
              return (
                <div key={`price-${a.id}`}
                  className="flex gap-3 rounded-xl border bg-white p-4 border-l-4 border-l-amber-400">
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', meta.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50">Price</Badge>
                      <span className="font-semibold text-gray-900 text-sm">{a.symbol}</span>
                      <span className="text-xs text-gray-400">{a.exchange}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5">
                      {meta.label} {meta.prefix}{a.value.toLocaleString('en-IN')}{meta.suffix} — triggered
                    </p>
                    {a.triggeredAt && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(a.triggeredAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        {a.notifiedAt && ' · emailed'}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => setPriceAlerts((prev) => prev.filter((x) => x.id !== a.id))}
                        className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                        <Trash2 className="h-3 w-3" /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              )
            }

            if (item.kind === 'thesis') {
              const a = item.data
              const isWeakened = a.alertType?.toLowerCase().includes('weak')
              const isBroken = a.alertType?.toLowerCase().includes('broken')
              return (
                <div key={`thesis-${a.id}`}
                  className={cn('flex gap-3 rounded-xl border bg-white p-4 border-l-4',
                    isBroken ? 'border-l-red-500' : isWeakened ? 'border-l-amber-400' : 'border-l-blue-400')}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                    <Brain className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={cn('text-[10px]',
                        isBroken ? 'text-red-700 border-red-300 bg-red-50' : 'text-blue-700 border-blue-300 bg-blue-50')}>
                        Research
                      </Badge>
                      <span className="font-semibold text-gray-900 text-sm">{a.thesis?.ticker}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5">{a.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(a.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      {!a.isRead && <span className="ml-2 text-blue-500 font-medium">· Unread</span>}
                    </p>
                  </div>
                </div>
              )
            }

            if (item.kind === 'behaviour') {
              const a = item.data
              return (
                <div key={`behaviour-${a.id}`}
                  className="flex gap-3 rounded-xl border bg-white p-4 border-l-4 border-l-blue-400">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50">
                    <Shield className="h-4 w-4 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] text-slate-700 border-slate-300 bg-slate-50">Market</Badge>
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5">{a.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(a.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      {!a.wasRead && <span className="ml-2 text-blue-500 font-medium">· Unread</span>}
                    </p>
                  </div>
                </div>
              )
            }

            return null
          })}
        </div>
      )}

      {/* Active price alerts (non-triggered) */}
      {!loading && priceAlerts.filter((a) => a.active && !a.triggered).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-600" />
              Watching
              <Badge className="ml-1">{priceAlerts.filter((a) => a.active && !a.triggered).length}</Badge>
            </CardTitle>
            <CardDescription>Active price alerts — no threshold crossed yet</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {priceAlerts.filter((a) => a.active && !a.triggered).map((a) => {
                const meta = TYPE_META[a.type]
                const Icon = meta.icon
                return (
                  <div key={a.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded', meta.color)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm text-gray-900">{a.symbol}</span>
                      <span className="text-xs text-gray-400 ml-2">{a.exchange}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        {meta.label}: {meta.prefix}{a.value.toLocaleString('en-IN')}{meta.suffix}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={async () => {
                        await fetch('/api/alerts', {
                          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: a.id, active: false })
                        })
                        setPriceAlerts((prev) => prev.map((x) => x.id === a.id ? { ...x, active: false } : x))
                      }} className="p-1 text-gray-400 hover:text-blue-600 transition-colors" title="Pause">
                        <ToggleRight className="h-4 w-4 text-blue-600" />
                      </button>
                      <button onClick={async () => {
                        await fetch(`/api/alerts?id=${a.id}`, { method: 'DELETE' })
                        setPriceAlerts((prev) => prev.filter((x) => x.id !== a.id))
                      }} className="p-1 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && priceAlerts.filter((a) => a.active && !a.triggered).length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-14 flex flex-col items-center gap-4 text-center">
            <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center">
              <Bell className="h-7 w-7 text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-lg">No alerts right now</p>
              <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
                ARIA is watching your investments. Set a price alert to get notified when a stock hits your target.
              </p>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Set price alert
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Email digest info */}
      <Card className="bg-gray-50 border-gray-100">
        <CardContent className="py-4 px-4">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-700">Weekly Market Digest</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Every Monday at 8:00 AM IST you&apos;ll receive a personalised digest with last week&apos;s market
                performance, your watchlist highlights, and a fresh AI-generated stock pick for the week.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
