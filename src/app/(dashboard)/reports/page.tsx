'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FileText, Loader2, Sparkles, Download, Crown, TrendingUp, Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ReportSummary {
  id: string
  quarter: string
  generatedAt: string
  portfolioScore: number
  portfolioGrade: string
  wasRead: boolean
  wasEmailed: boolean
}

const GRADE_META: Record<string, { bg: string; text: string; ring: string; label: string }> = {
  'A+': { bg: 'bg-amber-500', text: 'text-white', ring: 'ring-amber-400', label: 'Excellent' },
  'A':  { bg: 'bg-amber-400', text: 'text-white', ring: 'ring-amber-300', label: 'Very Good' },
  'B+': { bg: 'bg-blue-600',  text: 'text-white', ring: 'ring-blue-400',  label: 'Good' },
  'B':  { bg: 'bg-blue-500',  text: 'text-white', ring: 'ring-blue-300',  label: 'Above Average' },
  'C+': { bg: 'bg-amber-500', text: 'text-white', ring: 'ring-amber-400', label: 'Average' },
  'C':  { bg: 'bg-amber-400', text: 'text-white', ring: 'ring-amber-300', label: 'Below Average' },
  'D':  { bg: 'bg-red-500',   text: 'text-white', ring: 'ring-red-400',   label: 'Needs Work' },
}

function GradeBadge({ grade, size = 'sm' }: { grade: string; size?: 'sm' | 'lg' }) {
  const m = GRADE_META[grade] ?? GRADE_META['B']
  return (
    <div className={cn(
      'rounded-full flex items-center justify-center font-extrabold ring-2 ring-offset-2',
      m.bg, m.text, m.ring,
      size === 'lg' ? 'h-20 w-20 text-3xl' : 'h-10 w-10 text-sm',
    )}>
      {grade}
    </div>
  )
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const [genResult, setGenResult] = useState<{ id: string; previewOnly: boolean } | null>(null)

  useEffect(() => {
    fetch('/api/reports')
      .then((r) => r.ok ? r.json() : [])
      .then(setReports)
      .finally(() => setLoading(false))
  }, [])

  async function generate() {
    setGenerating(true); setGenError('')
    try {
      const res = await fetch('/api/reports', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setGenError(data.error ?? 'Failed'); return }
      setGenResult({ id: data.id, previewOnly: data.previewOnly })
      // Refresh list
      const list = await fetch('/api/reports').then((r) => r.json())
      setReports(list)
    } catch { setGenError('Something went wrong') }
    finally { setGenerating(false) }
  }

  const latest = reports[0]

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="h-6 w-6 text-blue-600" />
          Quarterly Reports
        </h1>
        <p className="text-gray-500 text-sm mt-1">AI-generated portfolio health reports — your premium quarterly review</p>
      </div>

      {/* Latest report hero */}
      {latest && (
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="bg-gradient-to-br from-[#1a365d] via-[#1e3a5f] to-[#1A56DB] p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <GradeBadge grade={latest.portfolioGrade} size="lg" />
              <div className="flex-1 text-white">
                <p className="text-blue-200 text-xs uppercase tracking-widest mb-1">Latest Report</p>
                <h2 className="text-2xl font-extrabold">{latest.quarter} Portfolio Health Report</h2>
                <p className="text-blue-200 text-sm mt-1">
                  Score: {latest.portfolioScore}/100 · {GRADE_META[latest.portfolioGrade]?.label ?? 'Good'}
                </p>
                <p className="text-blue-300 text-xs mt-1">
                  Generated {new Date(latest.generatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {!latest.wasRead && <span className="ml-2 bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full">New</span>}
                </p>
              </div>
              <div className="flex gap-3">
                <Link href={`/reports/${latest.id}`}>
                  <Button className="bg-white text-blue-700 hover:bg-blue-50 gap-2">
                    <FileText className="h-4 w-4" />
                    View Report
                  </Button>
                </Link>
                <a href={`/api/reports/${latest.id}/pdf`} download>
                  <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 gap-2">
                    <Download className="h-4 w-4" />
                    PDF
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Generate new report */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                Generate New Report
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                ARIA analyses your entire portfolio, goals, theses, and behaviour to produce a comprehensive quarterly review.
              </p>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                {[
                  { icon: TrendingUp, label: '7 report sections' },
                  { icon: FileText, label: 'PDF download (Pro)' },
                  { icon: Calendar, label: 'Updated quarterly' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Icon className="h-3.5 w-3.5 text-blue-500" />
                    {label}
                  </div>
                ))}
              </div>
            </div>
            <Button onClick={generate} disabled={generating} className="gap-2 shrink-0">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? 'Generating…' : 'Generate Report'}
            </Button>
          </div>
          {genError && <p className="text-sm text-red-500 mt-3">{genError}</p>}
          {genResult && (
            <div className={cn('mt-3 rounded-lg p-3 text-sm', genResult.previewOnly ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-800')}>
              {genResult.previewOnly ? (
                <span>
                  Preview ready — <Link href={`/reports/${genResult.id}`} className="font-semibold underline">view your report</Link>.
                  <span className="flex items-center gap-1 mt-1 text-xs"><Crown className="h-3.5 w-3.5" /> Upgrade to Pro for full report + PDF download.</span>
                </span>
              ) : (
                <span>Report ready! <Link href={`/reports/${genResult.id}`} className="font-semibold underline">View your full report →</Link></span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past reports */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
      ) : reports.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="py-12 text-center">
            <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No reports yet</p>
            <p className="text-sm text-gray-400 mt-1">Generate your first quarterly report above</p>
          </CardContent>
        </Card>
      ) : (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Report History</h3>
          <div className="space-y-3">
            {reports.map((r) => {
              const m = GRADE_META[r.portfolioGrade] ?? GRADE_META['B']
              return (
                <Card key={r.id} className={cn('hover:shadow-md transition-all', !r.wasRead && 'ring-1 ring-blue-200')}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <GradeBadge grade={r.portfolioGrade} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900">{r.quarter} Report</p>
                          {!r.wasRead && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">New</span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Score: {r.portfolioScore}/100 · {m.label} ·{' '}
                          {new Date(r.generatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Link href={`/reports/${r.id}`}>
                          <Button variant="outline" size="sm" className="gap-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            View
                          </Button>
                        </Link>
                        <a href={`/api/reports/${r.id}/pdf`} download>
                          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500">
                            <Download className="h-3.5 w-3.5" />
                            PDF
                          </Button>
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
