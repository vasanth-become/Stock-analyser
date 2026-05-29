'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Sparkles, Loader2, RefreshCw, AlertCircle, TrendingUp,
  Clock, ChevronDown, ChevronUp, Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RecommendationCard } from '@/components/analysis/RecommendationCard'
import type { Recommendation } from '@/lib/analysisEngine'

interface AnalysisResponse {
  id: string
  createdAt: string
  summary: string
  marketOutlook: string
  recommendations: Recommendation[]
}

interface PastAnalysis {
  id: string
  createdAt: string
  recommendations: Recommendation[]
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function AnalysisPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [current, setCurrent] = useState<AnalysisResponse | null>(null)
  const [history, setHistory] = useState<PastAnalysis[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/analyse')
      if (res.ok) {
        const data = await res.json()
        setHistory(data)
        if (data.length > 0 && !current) {
          // Show most recent past analysis on first load
          setCurrent({
            id: data[0].id,
            createdAt: data[0].createdAt,
            summary: '',
            marketOutlook: '',
            recommendations: data[0].recommendations,
          })
        }
      }
    } catch { /* ignore */ } finally {
      setHistoryLoading(false)
    }
  }, [current])

  useEffect(() => {
    loadHistory()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function runAnalysis() {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Analysis failed')
      }

      setCurrent(data as AnalysisResponse)
      loadHistory()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate analysis')
    } finally {
      setLoading(false)
    }
  }

  const todayCount = history.filter((h) => {
    const d = new Date(h.createdAt)
    const today = new Date()
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    )
  }).length

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-blue-600" />
            AI Portfolio Analysis
          </h1>
          <p className="text-gray-500 mt-1">
            Personalised stock picks powered by Claude AI, based on your investor profile
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500 text-right">
            <span className="font-medium text-gray-700">{todayCount}/3</span> analyses today
          </div>
          <Button
            onClick={runAnalysis}
            disabled={loading || todayCount >= 3}
            className="shrink-0"
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analysing...</>
            ) : current ? (
              <><RefreshCw className="mr-2 h-4 w-4" />Re-analyse</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" />Generate Analysis</>
            )}
          </Button>
        </div>
      </div>

      {/* Rate limit notice */}
      {todayCount >= 3 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-amber-800 text-sm">
              <Info className="h-4 w-4 shrink-0" />
              You&apos;ve used all 3 free analyses for today. Upgrade to Pro for unlimited analyses.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-2 text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {loading && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-blue-100 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-blue-400 animate-pulse" />
              </div>
              <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-transparent border-t-blue-600 animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-800">Claude is analysing your profile...</p>
              <p className="text-sm text-gray-500 mt-1">
                Reviewing market data and building personalised recommendations
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {!loading && current && (
        <>
          {/* Meta bar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Generated {formatTime(current.createdAt)}
            </span>
            <Badge variant="outline" className="w-fit">
              {current.recommendations.length} recommendations
            </Badge>
          </div>

          {/* Summary + outlook */}
          {(current.summary || current.marketOutlook) && (
            <div className="grid sm:grid-cols-2 gap-4">
              {current.summary && (
                <Card className="bg-blue-50 border-blue-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-blue-800 flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4" /> Portfolio Strategy
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-blue-900 leading-relaxed">{current.summary}</p>
                  </CardContent>
                </Card>
              )}
              {current.marketOutlook && (
                <Card className="bg-gray-50 border-gray-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-700 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4" /> Market Outlook
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 leading-relaxed">{current.marketOutlook}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Recommendation cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {current.recommendations.map((rec, i) => (
              <RecommendationCard key={`${rec.ticker}-${i}`} rec={rec} />
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && !current && !historyLoading && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
            <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-lg">No analysis yet</p>
              <p className="text-sm text-gray-500 mt-1 max-w-sm">
                Click &quot;Generate Analysis&quot; to get personalised stock recommendations
                based on your investor profile and live market data.
              </p>
            </div>
            <Button onClick={runAnalysis} disabled={loading}>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate My First Analysis
            </Button>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history.length > 1 && (
        <div>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Past analyses ({history.length - 1} more)
          </button>

          {showHistory && (
            <div className="mt-3 space-y-2">
              {history.slice(1).map((h) => (
                <button
                  key={h.id}
                  onClick={() =>
                    setCurrent({
                      id: h.id,
                      createdAt: h.createdAt,
                      summary: '',
                      marketOutlook: '',
                      recommendations: h.recommendations,
                    })
                  }
                  className="w-full text-left rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <span className="text-sm text-gray-700">{formatTime(h.createdAt)}</span>
                  <Badge variant="outline" className="text-xs">
                    {h.recommendations.length} picks
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[11px] text-gray-400 leading-relaxed border-t pt-4">
        Disclaimer: AI-generated recommendations are for educational purposes only and do not constitute
        financial advice. Please consult a SEBI-registered investment advisor before making investment
        decisions. Past performance is not indicative of future results.
      </p>
    </div>
  )
}
