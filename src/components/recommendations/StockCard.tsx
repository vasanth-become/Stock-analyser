'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp, TrendingDown, Target, ChevronDown, ChevronUp,
  Bookmark, BookmarkCheck, Loader2, ArrowUpRight,
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Recommendation } from '@/lib/analysisEngine'

interface Props {
  rec: Recommendation
  isBestMatch?: boolean
  watchedSymbols: Set<string>
  onWatchlistToggle: (symbol: string, action: 'add' | 'remove') => void
}

const TYPE_STYLES: Record<string, string> = {
  Stock: 'bg-blue-50 text-blue-700 border-blue-200',
  SIP:   'bg-purple-50 text-purple-700 border-purple-200',
  ETF:   'bg-amber-50 text-amber-700 border-amber-200',
  ELSS:  'bg-green-50 text-green-700 border-green-200',
}

const RISK_DOT: Record<string, string> = {
  Low:      'bg-green-500',
  Moderate: 'bg-amber-500',
  High:     'bg-red-500',
}

function ConfidenceBar({ score }: { score: number }) {
  const color =
    score >= 75 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-600 w-7 text-right">{score}</span>
    </div>
  )
}

function LivePrice({ symbol }: { symbol: string }) {
  const [price, setPrice] = useState<number | null>(null)
  const [change, setChange] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/market/quote?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (cancelled || !d?.quote) return
        setPrice(d.quote.price)
        setChange(d.quote.changePercent)
      })
      .catch(() => null)
    return () => { cancelled = true }
  }, [symbol])

  if (price === null) {
    return (
      <span className="flex items-center gap-1 text-xs text-gray-400">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading
      </span>
    )
  }

  const up = (change ?? 0) >= 0
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-base font-bold text-gray-900">
        ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      {change !== null && (
        <span className={cn('text-xs font-semibold flex items-center gap-0.5', up ? 'text-green-600' : 'text-red-600')}>
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {up ? '+' : ''}{change.toFixed(2)}%
        </span>
      )}
    </div>
  )
}

export function StockCard({ rec, isBestMatch, watchedSymbols, onWatchlistToggle }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)

  const inWatchlist = watchedSymbols.has(rec.ticker)

  const fmt = (n: number) =>
    n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const handleWatchlist = useCallback(async () => {
    setSaving(true)
    try {
      if (inWatchlist) {
        // Get watchlistId from server first
        const listRes = await fetch('/api/watchlist')
        const lists = await listRes.json()
        const defaultList = lists[0]
        if (defaultList) {
          await fetch(`/api/watchlist?symbol=${rec.ticker}&watchlistId=${defaultList.id}`, {
            method: 'DELETE',
          })
          onWatchlistToggle(rec.ticker, 'remove')
        }
      } else {
        await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: rec.ticker }),
        })
        onWatchlistToggle(rec.ticker, 'add')
      }
    } catch { /* ignore */ } finally {
      setSaving(false)
    }
  }, [inWatchlist, rec.ticker, onWatchlistToggle])

  return (
    <Card className={cn(
      'flex flex-col transition-shadow hover:shadow-md',
      isBestMatch && 'ring-2 ring-blue-500 ring-offset-1',
    )}>
      <CardHeader className="pb-3 space-y-0">
        {/* Best match badge */}
        {isBestMatch && (
          <div className="mb-2">
            <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              ★ Best match for your profile
            </span>
          </div>
        )}

        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-gray-900 text-sm">{rec.name}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="text-[11px] font-mono bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                {rec.ticker}
              </span>
              <Badge variant="outline" className={cn('text-[10px] py-0', TYPE_STYLES[rec.type])}>
                {rec.type}
              </Badge>
              <span className="text-[10px] text-gray-500">{rec.sector}</span>
            </div>
          </div>

          {/* Watchlist + stock link */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleWatchlist}
              disabled={saving}
              title={inWatchlist ? 'Remove from watchlist' : 'Save to watchlist'}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                inWatchlist
                  ? 'text-blue-600 hover:text-blue-800'
                  : 'text-gray-400 hover:text-blue-600',
              )}
            >
              {saving
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : inWatchlist
                  ? <BookmarkCheck className="h-4 w-4" />
                  : <Bookmark className="h-4 w-4" />
              }
            </button>
            <Link
              href={`/stock/${rec.ticker}`}
              className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 transition-colors"
              title="View stock"
            >
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Live price */}
        <div className="mt-2">
          <LivePrice symbol={rec.ticker} />
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 flex-1">
        {/* Confidence bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">AI Confidence</span>
            <span className={cn(
              'text-[10px] font-medium flex items-center gap-1',
              RISK_DOT[rec.riskLevel] ? '' : '',
            )}>
              <span className={cn('h-1.5 w-1.5 rounded-full inline-block', RISK_DOT[rec.riskLevel])} />
              {rec.riskLevel} risk
            </span>
          </div>
          <ConfidenceBar score={rec.confidenceScore} />
        </div>

        {/* Key metrics grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-green-50 rounded-lg p-2 text-center">
            <p className="text-[10px] text-green-700 uppercase tracking-wide">Expected</p>
            <p className="text-xs font-bold text-green-800 mt-0.5">{rec.expectedReturn}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Suggest</p>
            <p className="text-xs font-bold text-gray-800 mt-0.5">
              ₹{fmt(rec.suggestedAmount)}
              {rec.type === 'SIP' && <span className="font-normal text-gray-500">/mo</span>}
            </p>
          </div>
        </div>

        {/* Price levels */}
        <div className="space-y-1.5 border-t pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-gray-500">
              <Target className="h-3 w-3" />Buy Zone
            </span>
            <span className="font-medium text-gray-800">
              ₹{fmt(rec.buyZone.low)}–{fmt(rec.buyZone.high)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-green-600">
              <TrendingUp className="h-3 w-3" />Target
            </span>
            <span className="font-semibold text-green-600">₹{fmt(rec.targetPrice)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-red-500">
              <TrendingDown className="h-3 w-3" />Stop Loss
            </span>
            <span className="font-semibold text-red-500">₹{fmt(rec.stopLoss)}</span>
          </div>
          {rec.pe && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">P/E</span>
              <span className="font-medium text-gray-700">{rec.pe.toFixed(1)}x · {rec.marketCap}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {rec.tags.map((tag) => (
            <span key={tag} className="text-[10px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
              {tag}
            </span>
          ))}
        </div>

        {/* Collapsible reasoning */}
        <div className="border-t pt-2 mt-auto">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium w-full"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? 'Hide AI reasoning' : 'Show AI reasoning'}
          </button>
          {expanded && (
            <p className="mt-2 text-xs text-gray-600 leading-relaxed bg-blue-50 rounded-lg p-2.5">
              {rec.reasoning}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
