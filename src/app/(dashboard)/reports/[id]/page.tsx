'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ChevronLeft, Download, Loader2, Crown, TrendingUp, TrendingDown,
  CheckCircle2, XCircle, AlertCircle, Target, Brain, BarChart2, Shield,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { cn } from '@/lib/utils'
import type { ReportData } from '@/lib/quarterlyReport/reportGenerator'
import Link from 'next/link'

// ─── Grade badge ──────────────────────────────────────────────────────────────

const GRADE_COLOURS: Record<string, { bg: string; ring: string; label: string }> = {
  'A+': { bg: 'bg-amber-500', ring: 'ring-amber-400', label: 'Excellent' },
  'A':  { bg: 'bg-amber-400', ring: 'ring-amber-300', label: 'Very Good' },
  'B+': { bg: 'bg-blue-600',  ring: 'ring-blue-400',  label: 'Good' },
  'B':  { bg: 'bg-blue-500',  ring: 'ring-blue-300',  label: 'Above Average' },
  'C+': { bg: 'bg-amber-500', ring: 'ring-amber-400', label: 'Average' },
  'C':  { bg: 'bg-amber-400', ring: 'ring-amber-300', label: 'Below Average' },
  'D':  { bg: 'bg-red-500',   ring: 'ring-red-400',   label: 'Needs Work' },
}

function GradeBadge({ grade }: { grade: string }) {
  const m = GRADE_COLOURS[grade] ?? GRADE_COLOURS['B']
  return (
    <div className={cn('h-24 w-24 rounded-full flex items-center justify-center font-extrabold text-4xl text-white ring-4 ring-offset-2 shadow-lg', m.bg, m.ring)}>
      {grade}
    </div>
  )
}

// ─── Section headings ─────────────────────────────────────────────────────────

function SectionHeading({ icon: Icon, title, id }: { icon: React.ElementType; title: string; id: string }) {
  return (
    <div id={id} className="flex items-center gap-3 mb-4">
      <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-blue-600" />
      </div>
      <h2 className="text-lg font-extrabold text-gray-900">{title}</h2>
    </div>
  )
}

// ─── Recommendation colour ────────────────────────────────────────────────────

const REC_META: Record<string, { bg: string; text: string; label: string }> = {
  continue: { bg: 'bg-green-100', text: 'text-green-800', label: 'Continue' },
  trim:     { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Trim' },
  add:      { bg: 'bg-blue-100',  text: 'text-blue-800',  label: 'Add More' },
  exit:     { bg: 'bg-red-100',   text: 'text-red-800',   label: 'Exit' },
  review:   { bg: 'bg-gray-100',  text: 'text-gray-800',  label: 'Review' },
}

const THESIS_META: Record<string, { text: string; icon: React.ElementType }> = {
  intact:   { text: 'text-green-700',  icon: CheckCircle2 },
  weakening:{ text: 'text-amber-700',  icon: AlertCircle },
  broken:   { text: 'text-red-700',    icon: XCircle },
  achieved: { text: 'text-purple-700', icon: Target },
}

const ACTION_COLOURS = ['#1A56DB', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#1d4ed8', '#2563eb']

// ─── Score gauge ──────────────────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const r = 54, sw = 12, circ = 2 * Math.PI * r
  const colour = score >= 80 ? '#d97706' : score >= 60 ? '#1A56DB' : score >= 40 ? '#f59e0b' : '#ef4444'
  const filled = (score / 100) * circ
  return (
    <div className="relative" style={{ width: 140, height: 140 }}>
      <svg width={140} height={140} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={70} cy={70} r={r} fill="none" stroke="#e2e8f0" strokeWidth={sw} />
        <circle cx={70} cy={70} r={r} fill="none" stroke={colour} strokeWidth={sw}
          strokeLinecap="round" strokeDasharray={`${filled} ${circ - filled}`}
          style={{ transition: 'stroke-dasharray 1.2s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-gray-900">{score}</span>
        <span className="text-xs text-gray-400">/100</span>
      </div>
    </div>
  )
}

// ─── Navigation sidebar ───────────────────────────────────────────────────────

const NAV_SECTIONS = [
  { id: 'executive', label: 'Executive Summary', icon: BarChart2 },
  { id: 'market',    label: 'Market Context',    icon: TrendingUp },
  { id: 'portfolio', label: 'Portfolio Health',  icon: BarChart2 },
  { id: 'holdings',  label: 'Holdings',          icon: TrendingUp },
  { id: 'sip',       label: 'SIPs',              icon: Target },
  { id: 'goals',     label: 'Goals',             icon: Target },
  { id: 'behaviour', label: 'Behaviour',         icon: Shield },
  { id: 'rebalance', label: 'Rebalance',         icon: AlertCircle },
  { id: 'outlook',   label: 'Outlook',           icon: Brain },
]

function NavSidebar({ active }: { active: string }) {
  return (
    <nav className="hidden xl:flex flex-col gap-1 sticky top-4">
      {NAV_SECTIONS.map(({ id, label, icon: Icon }) => (
        <a key={id} href={`#${id}`} className={cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
          active === id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50',
        )}>
          <Icon className="h-3.5 w-3.5 shrink-0" />
          {label}
        </a>
      ))}
    </nav>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface FullReport {
  id: string
  quarter: string
  generatedAt: string
  portfolioScore: number
  portfolioGrade: string
  reportData: ReportData
  isPro: boolean
}

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [report, setReport] = useState<FullReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('executive')
  const [expandedHolding, setExpandedHolding] = useState<string | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    fetch(`/api/reports/${params.id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setReport(d) })
      .finally(() => setLoading(false))
  }, [params.id])

  useEffect(() => {
    if (!report) return
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id)
        }
      },
      { rootMargin: '-20% 0px -60% 0px' },
    )
    for (const { id } of NAV_SECTIONS) {
      const el = document.getElementById(id)
      if (el) observerRef.current.observe(el)
    }
    return () => observerRef.current?.disconnect()
  }, [report])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  )
  if (!report) return (
    <div className="text-center py-20">
      <p className="text-gray-500">Report not found.</p>
      <Button variant="outline" onClick={() => router.push('/reports')} className="mt-4">Back to reports</Button>
    </div>
  )

  const rd = report.reportData
  if (!rd) return <div className="text-center py-20 text-gray-400">Report data unavailable.</div>

  return (
    <div className="max-w-6xl">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100 py-3 px-1 mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/reports')} className="gap-1.5 text-gray-500">
            <ChevronLeft className="h-4 w-4" />Back
          </Button>
          <span className="text-sm font-semibold text-gray-700 hidden sm:block">{report.quarter} Portfolio Health Report</span>
        </div>
        {report.isPro ? (
          <a href={`/api/reports/${report.id}/pdf`} download>
            <Button size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </a>
        ) : (
          <Link href="/billing">
            <Button size="sm" variant="outline" className="gap-2 border-amber-300 text-amber-700">
              <Crown className="h-4 w-4" />
              Upgrade for PDF
            </Button>
          </Link>
        )}
      </div>

      <div className="grid xl:grid-cols-[200px_1fr] gap-6">
        <NavSidebar active={activeSection} />

        <div className="space-y-6 min-w-0">
          {/* ── Hero ──────────────────────────────────────────────────────── */}
          <div className="bg-gradient-to-br from-[#1a365d] to-[#1A56DB] rounded-2xl p-8 text-white">
            <p className="text-blue-200 text-xs uppercase tracking-widest mb-2">ARIA Research</p>
            <h1 className="text-2xl font-extrabold mb-1">{rd.reportTitle ?? `${report.quarter} Report`}</h1>
            <p className="text-blue-200 text-sm">{rd.quarter}</p>
            <div className="flex items-center gap-6 mt-6">
              <GradeBadge grade={report.portfolioGrade} />
              <div>
                <p className="text-blue-100 text-sm mb-1">Portfolio Score</p>
                <p className="text-4xl font-extrabold">{report.portfolioScore}<span className="text-xl font-normal text-blue-200">/100</span></p>
                <p className="text-blue-200 text-sm mt-1">{GRADE_COLOURS[report.portfolioGrade]?.label ?? 'Good'}</p>
              </div>
            </div>
          </div>

          {/* Free user paywall */}
          {!report.isPro && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-5 flex items-center gap-4">
                <Crown className="h-8 w-8 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <p className="font-bold text-amber-900">You're viewing a preview</p>
                  <p className="text-sm text-amber-700 mt-0.5">Upgrade to Pro to unlock all 7 sections, PDF download, and quarterly email delivery.</p>
                </div>
                <Link href="/billing">
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white gap-2 shrink-0">
                    <Crown className="h-4 w-4" />
                    Upgrade to Pro
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* ── Executive Summary ─────────────────────────────────────────── */}
          <Card id="executive">
            <CardContent className="p-6">
              <SectionHeading icon={BarChart2} title="Executive Summary" id="executive-title" />
              <div className="flex flex-col sm:flex-row gap-6 items-start mb-6">
                <ScoreGauge score={report.portfolioScore} />
                <div className="flex-1">
                  <p className="text-gray-700 text-base leading-relaxed mb-4">{rd.executiveSummary.headline}</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold text-green-700 uppercase mb-2">🏆 Key Wins</p>
                      <ul className="space-y-1.5">
                        {rd.executiveSummary.keyWins?.map((w, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />{w}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-blue-700 uppercase mb-2">→ Priority Actions</p>
                      <ul className="space-y-1.5">
                        {rd.executiveSummary.keyActions?.map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <div className="h-4 w-4 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-blue-700">{i + 1}</div>
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Market Context ────────────────────────────────────────────── */}
          <Card id="market">
            <CardContent className="p-6">
              <SectionHeading icon={TrendingUp} title="Market Context" id="market-title" />
              <p className="text-gray-700 mb-4">{rd.marketContext?.quarterSummary}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-blue-600 font-semibold">Nifty 50</p>
                  <p className="text-lg font-extrabold text-gray-900 mt-1">{rd.marketContext?.niftyPerformance}</p>
                </div>
                {rd.marketContext?.sectorWinners?.slice(0, 2).map((s) => (
                  <div key={s} className="bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-green-700 font-semibold">Winner</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">{s}</p>
                  </div>
                ))}
                {rd.marketContext?.sectorLosers?.slice(0, 1).map((s) => (
                  <div key={s} className="bg-red-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-red-700 font-semibold">Laggard</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">{s}</p>
                  </div>
                ))}
              </div>
              {rd.marketContext?.keyEvents?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {rd.marketContext.keyEvents.map((e) => (
                    <span key={e} className="text-xs bg-gray-100 text-gray-600 rounded-full px-3 py-1">{e}</span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Portfolio Health ──────────────────────────────────────────── */}
          <Card id="portfolio">
            <CardContent className="p-6">
              <SectionHeading icon={BarChart2} title="Portfolio Health" id="portfolio-title" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'Quarterly Return', value: rd.portfolioHealth?.quarterlyReturn },
                  { label: 'vs Nifty', value: rd.portfolioHealth?.vsNifty },
                  { label: 'Diversification', value: `${rd.portfolioHealth?.diversificationScore ?? 0}/100` },
                  { label: 'Risk Alignment', value: `${rd.portfolioHealth?.riskAlignmentScore ?? 0}/100` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="text-base font-bold text-gray-900 mt-1">{value ?? '—'}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-600 mb-1">{rd.portfolioHealth?.diversificationComment}</p>
              <p className="text-sm text-gray-600">{rd.portfolioHealth?.riskComment}</p>

              {/* Sector allocation donut */}
              {rd.portfolioHealth?.sectorAllocation?.length > 0 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center gap-6">
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie data={rd.portfolioHealth.sectorAllocation} dataKey="percent" nameKey="sector" cx="50%" cy="50%" outerRadius={80} innerRadius={50}>
                        {rd.portfolioHealth.sectorAllocation.map((_, i) => (
                          <Cell key={i} fill={ACTION_COLOURS[i % ACTION_COLOURS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => `${v}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2">
                    {rd.portfolioHealth.sectorAllocation.map((s, i) => (
                      <div key={s.sector} className="flex items-center gap-1.5 text-xs">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ACTION_COLOURS[i % ACTION_COLOURS.length] }} />
                        <span className="text-gray-600">{s.sector}</span>
                        <span className="font-bold text-gray-900">{s.percent}%</span>
                        {s.comment !== 'neutral' && <span className="text-gray-400 italic">{s.comment}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Holdings Review ───────────────────────────────────────────── */}
          {rd.holdingsReview?.length > 0 && (
            <Card id="holdings">
              <CardContent className="p-6">
                <SectionHeading icon={TrendingUp} title="Holdings Review" id="holdings-title" />
                <div className="space-y-2">
                  {rd.holdingsReview.map((h) => {
                    const rec = REC_META[h.recommendation] ?? REC_META.review
                    const thesis = THESIS_META[h.thesisStatus] ?? THESIS_META.intact
                    const ThesisIcon = thesis.icon
                    const expanded = expandedHolding === h.ticker
                    return (
                      <div key={h.ticker} className="border border-gray-100 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setExpandedHolding(expanded ? null : h.ticker)}
                          className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                            {h.ticker.slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 text-sm">{h.ticker} <span className="font-normal text-gray-500">{h.companyName}</span></p>
                            <p className="text-xs text-gray-400 mt-0.5">Return: {h.quarterlyReturn}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <ThesisIcon className={cn('h-4 w-4', thesis.text)} />
                            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', rec.bg, rec.text)}>{rec.label}</span>
                          </div>
                        </button>
                        {expanded && (
                          <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                            <p className="text-sm text-gray-700 mt-3">{h.reasoning}</p>
                            <p className="text-xs text-blue-600 mt-2 font-medium">👁 Watch next quarter: {h.keyWatchForNextQuarter}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── SIP Review ────────────────────────────────────────────────── */}
          <Card id="sip">
            <CardContent className="p-6">
              <SectionHeading icon={Target} title="SIP Review" id="sip-title" />
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400">Total Monthly SIP</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">
                    ₹{(rd.sipReview?.totalSIPAmount ?? 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400">Total SIP Corpus</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">
                    ₹{(rd.sipReview?.totalSIPCorpus ?? 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">{rd.sipReview?.sipConsistency}</p>
              <p className="text-sm text-gray-600">{rd.sipReview?.sipComment}</p>
            </CardContent>
          </Card>

          {/* ── Goals Review ──────────────────────────────────────────────── */}
          {rd.goalsReview?.length > 0 && (
            <Card id="goals">
              <CardContent className="p-6">
                <SectionHeading icon={Target} title="Goals Progress" id="goals-title" />
                <div className="space-y-4">
                  {rd.goalsReview.map((g) => (
                    <div key={g.goalName} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-gray-900">{g.goalName}</p>
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', g.onTrack ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800')}>
                          {g.onTrack ? '✅ On Track' : '⚠️ Behind'}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full mb-2">
                        <div className={cn('h-2 rounded-full', g.onTrack ? 'bg-green-500' : 'bg-amber-500')}
                          style={{ width: `${Math.min(100, g.percentComplete)}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{g.percentComplete.toFixed(0)}% complete · {g.quarterProgress}</span>
                        <span>Target: {g.projectedCompletion}</span>
                      </div>
                      {!g.onTrack && g.actionIfBehind && (
                        <p className="text-xs text-amber-700 mt-1.5">{g.actionIfBehind}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Behaviour Review ──────────────────────────────────────────── */}
          <Card id="behaviour">
            <CardContent className="p-6">
              <SectionHeading icon={Shield} title="Behaviour Review" id="behaviour-title" />
              <div className="flex items-center gap-6 mb-4">
                <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center text-2xl font-extrabold text-blue-700 shrink-0">
                  {rd.behaviourReview?.score}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-lg">{rd.behaviourReview?.grade}</p>
                  <p className="text-sm text-gray-500">{rd.behaviourReview?.panicsAvoided} panics avoided this quarter</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-2">{rd.behaviourReview?.bestDecision}</p>
              <p className="text-sm text-gray-500 italic">{rd.behaviourReview?.improvementArea}</p>
              {rd.behaviourReview?.badgesEarned?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {rd.behaviourReview.badgesEarned.map((b) => (
                    <span key={b} className="text-xs bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full border border-purple-200">🏅 {b}</span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Rebalance ─────────────────────────────────────────────────── */}
          <Card id="rebalance">
            <CardContent className="p-6">
              <SectionHeading icon={AlertCircle} title="Rebalance Recommendations" id="rebalance-title" />
              <div className="flex items-center gap-3 mb-4">
                <span className={cn(
                  'text-sm font-bold px-3 py-1.5 rounded-lg',
                  rd.rebalanceRecommendations?.rebalanceNeeded ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800',
                )}>
                  {rd.rebalanceRecommendations?.rebalanceNeeded
                    ? `⚠️ Rebalance needed: ${(rd.rebalanceRecommendations.urgency ?? 'soon').replace('_', ' ')}`
                    : '✅ No rebalancing needed'}
                </span>
              </div>
              <p className="text-sm text-gray-700 mb-4">{rd.rebalanceRecommendations?.rebalanceSummary}</p>
              {rd.rebalanceRecommendations?.actions?.map((a) => (
                <div key={a.asset} className={cn(
                  'rounded-xl p-4 mb-3 border-l-4',
                  a.action === 'exit' ? 'bg-red-50 border-red-500' :
                  a.action === 'add' || a.action === 'increase' ? 'bg-green-50 border-green-500' : 'bg-amber-50 border-amber-500',
                )}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-gray-900">{a.asset}</p>
                    <span className={cn(
                      'text-xs font-bold uppercase px-2 py-0.5 rounded',
                      a.action === 'exit' ? 'bg-red-100 text-red-700' :
                      a.action === 'add' || a.action === 'increase' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700',
                    )}>{a.action}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{a.currentWeight} → {a.targetWeight}</p>
                  <p className="text-sm text-gray-700">{a.reasoning}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* ── Next Quarter Outlook ──────────────────────────────────────── */}
          <Card id="outlook">
            <CardContent className="p-6">
              <SectionHeading icon={Brain} title="Next Quarter Outlook" id="outlook-title" />
              <p className="text-gray-700 mb-3">{rd.nextQuarterOutlook?.marketOutlook}</p>
              <div className="bg-blue-50 rounded-xl p-4 mb-4">
                <p className="text-xs font-bold text-blue-700 mb-1">Sector to Watch</p>
                <p className="text-sm text-blue-900">{rd.nextQuarterOutlook?.sectorToWatch}</p>
              </div>
              <p className="text-sm font-bold text-gray-700 mb-2">Your Personal Plan</p>
              <ul className="space-y-2">
                {rd.nextQuarterOutlook?.personalPlan?.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <div className="h-5 w-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                    {p}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-400 leading-relaxed">
            {rd.disclaimer}
          </div>
        </div>
      </div>
    </div>
  )
}
