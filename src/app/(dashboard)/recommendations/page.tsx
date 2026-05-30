'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Sparkles, RefreshCw, Loader2, AlertCircle, Clock,
  TrendingUp, TrendingDown, Minus, Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Disclaimer } from '@/components/ui/Disclaimer'
import { StockCard } from '@/components/recommendations/StockCard'
import { cn } from '@/lib/utils'
import type { Recommendation } from '@/lib/analysisEngine'

interface AnalysisData {
  id: string
  createdAt: string
  summary: string
  marketOutlook: string
  recommendations: Recommendation[]
}

type MarketMood = 'Bullish' | 'Neutral' | 'Bearish'

function deriveMood(recs: Recommendation[]): { mood: MarketMood; rationale: string } {
  if (!recs.length) return { mood: 'Neutral', rationale: 'Insufficient data.' }

  const avgConfidence = recs.reduce((s, r) => s + r.confidenceScore, 0) / recs.length
  const highRiskCount = recs.filter((r) => r.riskLevel === 'High').length
  const lowRiskCount = recs.filter((r) => r.riskLevel === 'Low').length

  if (avgConfidence >= 70 && lowRiskCount >= recs.length * 0.4) {
    return {
      mood: 'Bullish',
      rationale: `Strong research conviction across ${recs.length} picks with avg confidence ${Math.round(avgConfidence)}/100.`,
    }
  }
  if (avgConfidence < 55 || highRiskCount > recs.length * 0.5) {
    return {
      mood: 'Bearish',
      rationale: `Elevated risk profile in current research output. Proceed with caution.`,
    }
  }
  return {
    mood: 'Neutral',
    rationale: `Mixed signals — balanced mix of research picks with avg confidence ${Math.round(avgConfidence)}/100.`,
  }
}

function findTopPick(recs: Recommendation[]): string {
  return recs.reduce((best, r) => (r.confidenceScore > best.confidenceScore ? r : best)).ticker
}

const MOOD_STYLES: Record<MarketMood, { bg: string; text: string; border: string; icon: typeof TrendingUp }> = {
  Bullish: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', icon: TrendingUp },
  Neutral: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', icon: Minus },
  Bearish: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', icon: TrendingDown },
}

function formatTs(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function RecommendationsPage() {
  const [data, setData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [todayCount, setTodayCount] = useState(0)
  const [watchedSymbols, setWatchedSymbols] = useState<Set<string>>(new Set())

  useEffect(() => {
    Promise.all([
      fetch('/api/analyse').then((r) => r.ok ? r.json() : []),
      fetch('/api/watchlist').then((r) => r.ok ? r.json() : []),
    ]).then(([analyses, watchlists]) => {
      if (analyses.length) {
        const latest = analyses[0]
        setData({
          id: latest.id,
          createdAt: latest.createdAt,
          summary: '',
          marketOutlook: '',
          recommendations: latest.recommendations,
        })
        const today = new Date()
        const count = analyses.filter((a: { createdAt: string }) => {
          const d = new Date(a.createdAt)
          return d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear()
        }).length
        setTodayCount(count)
      }
      const symbols = new Set<string>()
      for (const wl of watchlists) {
        for (const s of (wl.stocks ?? [])) {
          symbols.add(s.symbol)
        }
      }
      setWatchedSymbols(symbols)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleWatchlistToggle = useCallback((symbol: string, action: 'add' | 'remove') => {
    setWatchedSymbols((prev) => {
      const next = new Set(prev)
      if (action === 'add') next.add(symbol)
      else next.delete(symbol)
      return next
    })
  }, [])

  async function generateAnalysis() {
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Analysis failed')
      setData(json as AnalysisData)
      setTodayCount((c) => c + 1)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate analysis')
    } finally {
      setGenerating(false)
    }
  }

  const mood = data ? deriveMood(data.recommendations) : null
  const topPick = data ? findTopPick(data.recommendations) : null
  const MoodIcon = mood ? MOOD_STYLES[mood.mood].icon : null

  return (
    <div className="space-y-6 max-w-7xl">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-blue-600" />
            Research Insights
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            ARIA Research Output — personalised to your investor profile
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {todayCount > 0 && (
            <span className="text-xs text-gray-500">
              <span className="font-semibold text-gray-700">{todayCount}/3</span> research runs today
            </span>
          )}
          <Button
            onClick={generateAnalysis}
            disabled={generating || todayCount >= 3}
            size="sm"
          >
            {generating
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analysing…</>
              : data
                ? <><RefreshCw className="mr-2 h-4 w-4" />Run New Research</>
                : <><Sparkles className="mr-2 h-4 w-4" />Generate</>
            }
          </Button>
        </div>
      </div>

      {/* ── Rate limit warning ── */}
      {todayCount >= 3 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-3 px-4">
            <p className="text-sm text-amber-800 flex items-center gap-2">
              <Info className="h-4 w-4 shrink-0" />
              Daily research limit reached (3/3). Upgrade to Research Pro for unlimited research runs.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Error ── */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3 px-4">
            <p className="text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-80 animate-pulse bg-gray-100 border-0" />
          ))}
        </div>
      )}

      {/* ── Generating spinner ── */}
      {!loading && generating && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-4">
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 rounded-full border-4 border-blue-100 flex items-center justify-center">
                <Sparkles className="h-7 w-7 text-blue-400 animate-pulse" />
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-800">Running ARIA research analysis…</p>
              <p className="text-sm text-gray-500 mt-1">Reviewing live market conditions against your profile</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Content ── */}
      {!loading && !generating && data && (
        <>
          {/* Market mood banner */}
          {mood && MoodIcon && (
            <div className={cn(
              'rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2',
              MOOD_STYLES[mood.mood].bg, MOOD_STYLES[mood.mood].border,
            )}>
              <div className="flex items-center gap-2">
                <MoodIcon className={cn('h-5 w-5 shrink-0', MOOD_STYLES[mood.mood].text)} />
                <span className={cn('font-bold text-base', MOOD_STYLES[mood.mood].text)}>
                  Market Research Mood: {mood.mood}
                </span>
                <Badge
                  variant="outline"
                  className={cn('text-[10px] border', MOOD_STYLES[mood.mood].text, MOOD_STYLES[mood.mood].border)}
                >
                  {data.recommendations.length} research picks
                </Badge>
              </div>
              <span className={cn('text-sm', MOOD_STYLES[mood.mood].text, 'sm:ml-2')}>
                {mood.rationale}
              </span>
              {data.marketOutlook && (
                <span className={cn('text-sm italic', MOOD_STYLES[mood.mood].text, 'sm:ml-auto')}>
                  {data.marketOutlook}
                </span>
              )}
            </div>
          )}

          {/* Summary card */}
          {data.summary && (
            <Card className="bg-blue-50 border-blue-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-800 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" /> Research Strategy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-blue-900 leading-relaxed">{data.summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Last updated */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock className="h-3.5 w-3.5" />
            Last updated {formatTs(data.createdAt)}
          </div>

          {/* Stock cards grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.recommendations.map((rec, i) => (
              <StockCard
                key={`${rec.ticker}-${i}`}
                rec={rec}
                isBestMatch={rec.ticker === topPick}
                watchedSymbols={watchedSymbols}
                onWatchlistToggle={handleWatchlistToggle}
              />
            ))}
          </div>

          {/* Inline disclaimer below cards */}
          <div className="border-t pt-4">
            <Disclaimer variant="inline" />
          </div>
        </>
      )}

      {/* ── Empty state ── */}
      {!loading && !generating && !data && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
            <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-lg">No research output yet</p>
              <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
                Run your first ARIA research analysis to see personalised research picks based on
                your risk profile, goals, and live market data.
              </p>
            </div>
            <Button onClick={generateAnalysis} disabled={generating}>
              <Sparkles className="mr-2 h-4 w-4" />
              Run Research Analysis
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
