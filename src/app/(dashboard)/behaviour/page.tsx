'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Shield, ShieldCheck, Brain, TrendingDown, Search,
  Loader2, AlertCircle, CheckCircle2, Clock, ChevronDown, ChevronUp,
  Star, Award, Zap, Calendar, Timer, RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { CalmMessage, StockAnalysisItem } from '@/lib/behaviourGuard/calmMessageGenerator'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BadgeDetail {
  id: string
  label: string
  description: string
  icon: string
  earned: boolean
}

interface ScoreData {
  score: number
  totalEvents: number
  panicsStopped: number
  sipsKept: number
  holdingsKept: number
  badDecisions: number
  badgeDetails: BadgeDetail[]
}

interface AlertData {
  id: string
  alertType: string
  triggerValue: number
  message: string
  wasRead: boolean
  userResponse: string | null
  createdAt: string
}

interface EventData {
  id: string
  eventType: string
  marketDrop: number
  userAction: string | null
  stocksAffected: string[]
  createdAt: string
}

// ─── Score gauge (SVG circle) ─────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const filled = (score / 100) * circumference
  const { label, colour } = getScoreLabel(score)

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg width="180" height="180" className="rotate-[-90deg]">
          <circle cx="90" cy="90" r={radius} stroke="#e2e8f0" strokeWidth="14" fill="none" />
          <circle
            cx="90" cy="90" r={radius}
            stroke={colour}
            strokeWidth="14"
            fill="none"
            strokeDasharray={`${filled} ${circumference - filled}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-extrabold text-gray-900">{score}</span>
          <span className="text-xs text-gray-500 font-medium">/ 100</span>
        </div>
      </div>
      <span className="text-base font-bold" style={{ color: colour }}>{label}</span>
    </div>
  )
}

function getScoreLabel(score: number): { label: string; colour: string } {
  if (score <= 30) return { label: 'Needs Discipline', colour: '#dc2626' }
  if (score <= 50) return { label: 'Developing', colour: '#d97706' }
  if (score <= 75) return { label: 'Disciplined', colour: '#2563eb' }
  if (score <= 90) return { label: 'Iron Hands', colour: '#16a34a' }
  return { label: 'Market Sage', colour: '#d97706' }
}

// ─── Alert card ───────────────────────────────────────────────────────────────

function AlertCard({
  alert,
  onRespond,
}: {
  alert: AlertData
  onRespond: (alertId: string, response: 'stay_course' | 'research_more') => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [responding, setResponding] = useState(false)

  let calmMsg: CalmMessage | null = null
  try { calmMsg = JSON.parse(alert.message) } catch { /* ignore */ }

  if (!calmMsg) return null

  const actionPoints = calmMsg.actionPlan.split('|').map((p) => p.trim()).filter(Boolean)

  async function handleRespond(response: 'stay_course' | 'research_more') {
    setResponding(true)
    await onRespond(alert.id, response)
    setResponding(false)
  }

  return (
    <Card className="border-blue-200 bg-blue-50/40">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">
              🛡️ ARIA Behaviour Guard
            </p>
            <h3 className="font-bold text-gray-900 text-base">{calmMsg.headline}</h3>
            <p className="text-xs text-gray-500 mt-1">
              Nifty dropped {Math.abs(alert.triggerValue).toFixed(2)}% ·{' '}
              {new Date(alert.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          </div>
          <button onClick={() => setExpanded((p) => !p)} className="text-gray-400 hover:text-gray-700 shrink-0 mt-1">
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>

        {/* Context */}
        <div className="bg-blue-100/60 rounded-lg px-4 py-3">
          <p className="text-sm text-blue-900 leading-relaxed">{calmMsg.marketContext}</p>
        </div>

        {/* Stock analysis — expanded */}
        {expanded && calmMsg.stockAnalysis.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Your Watchlist Today</p>
            {calmMsg.stockAnalysis.map((s: StockAnalysisItem) => (
              <div key={s.ticker} className="bg-white rounded-lg p-3 border border-gray-100 flex gap-3">
                <div className="min-w-[56px]">
                  <p className="font-bold text-gray-900 text-sm">{s.ticker}</p>
                  <p className="text-xs text-red-600 font-medium">{s.drop}</p>
                </div>
                <div>
                  <ThesisStatusBadge status={s.thesisStatus} />
                  <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{s.fundamentalUpdate}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action plan — expanded */}
        {expanded && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-600 mb-2">📋 Calm Action Plan</p>
            <ul className="space-y-1.5">
              {actionPoints.map((pt, i) => (
                <li key={i} className="text-sm text-gray-700 flex gap-2">
                  <span className="text-blue-500 font-bold shrink-0">{i + 1}.</span>
                  {pt}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Grounding question */}
        {expanded && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-amber-800 mb-1">🤔 Ask yourself:</p>
            <p className="text-sm text-amber-900 italic">"{calmMsg.groundingQuestion}"</p>
          </div>
        )}

        {/* CTA buttons */}
        {!alert.userResponse && (
          <div className="flex gap-3 pt-1 flex-wrap">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
              onClick={() => handleRespond('stay_course')}
              disabled={responding}
            >
              {responding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Stay the course — thesis intact
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-blue-300 text-blue-700 gap-2"
              onClick={() => handleRespond('research_more')}
              disabled={responding}
            >
              <Search className="h-3.5 w-3.5" />
              Run fresh research
            </Button>
          </div>
        )}
        {alert.userResponse && (
          <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            {alert.userResponse === 'stay_course' ? 'You stayed the course (+20 pts)' : 'You chose to research more (+10 pts)'}
          </div>
        )}

        {/* Behaviour tip */}
        {expanded && (
          <p className="text-xs text-gray-500 italic border-t pt-3">💡 {calmMsg.behaviourTip}</p>
        )}
      </CardContent>
    </Card>
  )
}

function ThesisStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    intact: 'bg-green-100 text-green-800',
    weakening: 'bg-amber-100 text-amber-800',
    broken: 'bg-red-100 text-red-800',
  }
  return (
    <span className={cn('inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase', styles[status] ?? 'bg-gray-100 text-gray-700')}>
      {status}
    </span>
  )
}

// ─── Event type helpers ───────────────────────────────────────────────────────

function eventLabel(type: string): { label: string; colour: string; icon: string } {
  const map: Record<string, { label: string; colour: string; icon: string }> = {
    panic_detected:    { label: 'Market alert triggered', colour: 'text-orange-600', icon: '⚠️' },
    panic_overridden:  { label: 'Panic overridden — well done!', colour: 'text-green-600', icon: '✅' },
    calm_confirmed:    { label: 'Stayed the course', colour: 'text-green-700', icon: '🛡️' },
    sell_prevented:    { label: 'Sell impulse prevented', colour: 'text-blue-600', icon: '🔒' },
    thesis_checked:    { label: 'Manual thesis check', colour: 'text-purple-600', icon: '🔍' },
  }
  return map[type] ?? { label: type, colour: 'text-gray-600', icon: '📌' }
}

// ─── Manual check panel ───────────────────────────────────────────────────────

function ManualCheckPanel() {
  const [ticker, setTicker] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CalmMessage | null>(null)
  const [error, setError] = useState('')
  const [remaining, setRemaining] = useState(5)

  async function handleCheck() {
    if (!ticker.trim() || !reason.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/behaviour/manual-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: ticker.toUpperCase(), reason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Check failed')
      setResult(data.calmMessage)
      setRemaining(data.remainingChecks)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const actionPoints = result?.actionPlan.split('|').map((p) => p.trim()).filter(Boolean) ?? []

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          Should I Sell? — Ask ARIA Behaviour Guard
        </CardTitle>
        <p className="text-xs text-gray-500">{remaining}/5 checks remaining today</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Stock ticker (e.g. INFY)"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="uppercase font-mono w-40"
            maxLength={20}
          />
          <Input
            placeholder="What's making you want to sell?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="flex-1"
            maxLength={500}
          />
          <Button onClick={handleCheck} disabled={loading || !ticker || !reason} className="gap-2 shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            Ask ARIA
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-3 pt-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="font-bold text-gray-900 text-sm mb-2">🛡️ {result.headline}</p>
              <p className="text-sm text-blue-900 leading-relaxed">{result.marketContext}</p>
            </div>

            {result.stockAnalysis.map((s) => (
              <div key={s.ticker} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{s.ticker}</span>
                  <ThesisStatusBadge status={s.thesisStatus} />
                  <span className="text-xs text-gray-500">{s.drop}</span>
                </div>
                <p className="text-xs text-gray-600"><span className="font-medium">Your thesis: </span>{s.thesisReminder}</p>
                <p className="text-xs text-gray-600"><span className="font-medium">Today's data: </span>{s.fundamentalUpdate}</p>
                <p className="text-xs font-medium text-blue-700">
                  Suggested: {s.suggestedAction === 'hold' ? '✅ Hold' : s.suggestedAction === 'research_more' ? '🔍 Research more' : '📋 Review'}
                </p>
              </div>
            ))}

            {actionPoints.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-600 mb-2">Action Plan</p>
                <ul className="space-y-1">
                  {actionPoints.map((pt, i) => (
                    <li key={i} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-blue-500 font-bold shrink-0">{i + 1}.</span>{pt}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800 font-semibold mb-1">Grounding question:</p>
              <p className="text-sm text-amber-900 italic">"{result.groundingQuestion}"</p>
            </div>

            {result.behaviourTip && (
              <p className="text-xs text-gray-500 italic">💡 {result.behaviourTip}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BehaviourPage() {
  const [scoreData, setScoreData] = useState<ScoreData | null>(null)
  const [alerts, setAlerts] = useState<AlertData[]>([])
  const [events, setEvents] = useState<EventData[]>([])
  const [loading, setLoading] = useState(true)
  const [newBadgesEarned, setNewBadgesEarned] = useState<string[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [scoreRes, historyRes] = await Promise.all([
        fetch('/api/behaviour/score').then((r) => r.ok ? r.json() : null),
        fetch('/api/behaviour/history').then((r) => r.ok ? r.json() : { events: [], unreadAlerts: [] }),
      ])
      if (scoreRes) setScoreData(scoreRes)
      setEvents(historyRes.events ?? [])
      setAlerts(historyRes.unreadAlerts ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function handleAlertResponse(alertId: string, response: 'stay_course' | 'research_more') {
    const res = await fetch('/api/behaviour/response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId, response }),
    })
    const data = await res.json()
    if (res.ok) {
      if (data.newBadges?.length) {
        setNewBadgesEarned(data.newBadges.map((b: BadgeDetail) => `${b.icon} ${b.label}`))
      }
      setAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, userResponse: response, wasRead: true } : a))
      if (scoreData) setScoreData((s) => s ? { ...s, score: data.newScore } : s)
    }
  }

  const earnedBadges = scoreData?.badgeDetails.filter((b) => b.earned) ?? []
  const unearnedBadges = scoreData?.badgeDetails.filter((b) => !b.earned) ?? []

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-blue-600" />
          Behaviour Guard
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Panic prevention and emotional investing protection engine
        </p>
      </div>

      {/* New badges toast */}
      {newBadgesEarned.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
          <Award className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800">New badge{newBadgesEarned.length > 1 ? 's' : ''} earned! 🎉</p>
            <p className="text-sm text-amber-700">{newBadgesEarned.join(' · ')}</p>
          </div>
          <button onClick={() => setNewBadgesEarned([])} className="ml-auto text-amber-400 hover:text-amber-700">✕</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {/* Section 1 — Score Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
                <ScoreGauge score={scoreData?.score ?? 50} />
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: 'Panics Prevented', value: scoreData?.panicsStopped ?? 0, icon: Shield, colour: 'text-blue-600' },
                      { label: 'SIPs Kept', value: scoreData?.sipsKept ?? 0, icon: RefreshCw, colour: 'text-green-600' },
                      { label: 'Positions Held', value: scoreData?.holdingsKept ?? 0, icon: TrendingDown, colour: 'text-purple-600' },
                      { label: 'Total Events', value: scoreData?.totalEvents ?? 0, icon: Zap, colour: 'text-amber-600' },
                    ].map(({ label, value, icon: Icon, colour }) => (
                      <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                        <Icon className={cn('h-5 w-5 mx-auto mb-1', colour)} />
                        <p className="text-2xl font-extrabold text-gray-900">{value}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Earned badges */}
                  {earnedBadges.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Badges Earned</p>
                      <div className="flex flex-wrap gap-2">
                        {earnedBadges.map((b) => (
                          <span key={b.id} className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-300 rounded-full px-3 py-1 text-xs font-semibold text-amber-800">
                            {b.icon} {b.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2 — Active Alerts */}
          {alerts.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Active Behaviour Alerts
                <Badge variant="destructive">{alerts.length}</Badge>
              </h2>
              {alerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} onRespond={handleAlertResponse} />
              ))}
            </div>
          )}

          {/* Section 3 — Manual Check */}
          <ManualCheckPanel />

          {/* Section 4 — Behaviour History */}
          {events.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-5 w-5 text-gray-500" />
                  Behaviour History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {events.map((ev) => {
                    const { label, colour, icon } = eventLabel(ev.eventType)
                    return (
                      <div key={ev.id} className="flex items-start gap-3 text-sm">
                        <span className="text-base shrink-0 mt-0.5">{icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={cn('font-medium', colour)}>{label}</p>
                          {ev.stocksAffected.length > 0 && (
                            <p className="text-xs text-gray-500 mt-0.5">Stocks: {ev.stocksAffected.join(', ')}</p>
                          )}
                          {ev.userAction && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">Action: {ev.userAction}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-gray-400">
                            {new Date(ev.createdAt).toLocaleDateString('en-IN', { dateStyle: 'short' })}
                          </p>
                          <p className="text-xs text-red-500 font-medium">
                            {ev.marketDrop < 0 ? `${ev.marketDrop.toFixed(1)}%` : ''}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 5 — All Badges Showcase */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                Badges Showcase
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(scoreData?.badgeDetails ?? []).map((b) => (
                  <div
                    key={b.id}
                    className={cn(
                      'rounded-xl p-3 text-center border',
                      b.earned
                        ? 'bg-amber-50 border-amber-300'
                        : 'bg-gray-50 border-gray-200 opacity-50 grayscale',
                    )}
                  >
                    <div className="text-2xl mb-1">{b.icon}</div>
                    <p className={cn('text-xs font-bold', b.earned ? 'text-amber-800' : 'text-gray-500')}>
                      {b.label}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{b.description}</p>
                    {b.earned && (
                      <span className="inline-block mt-1.5 text-[9px] bg-amber-200 text-amber-800 rounded-full px-2 py-0.5 font-semibold">EARNED</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Empty state */}
          {events.length === 0 && alerts.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
                <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center">
                  <ShieldCheck className="h-7 w-7 text-blue-500" />
                </div>
                <p className="font-semibold text-gray-800">No behaviour events yet</p>
                <p className="text-sm text-gray-500 max-w-xs">
                  Behaviour Guard activates automatically when markets drop. Use the manual check above to test it now.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
