'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react'
import type { IndexQuote } from '@/lib/marketData'
import { cn } from '@/lib/utils'

interface TickerBarProps {
  initialData: IndexQuote[]
}

function IndexChip({ index }: { index: IndexQuote }) {
  const up = index.changePercent > 0
  const flat = index.changePercent === 0

  return (
    <div className="inline-flex items-center gap-3 px-4 shrink-0">
      <span className="text-xs font-semibold text-gray-300 whitespace-nowrap">{index.name}</span>
      <span className="text-sm font-bold text-white whitespace-nowrap">
        {index.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </span>
      <span
        className={cn(
          'inline-flex items-center gap-0.5 text-xs font-semibold whitespace-nowrap',
          up ? 'text-green-400' : flat ? 'text-gray-400' : 'text-red-400',
        )}
      >
        {up ? <TrendingUp className="h-3 w-3" /> : flat ? <Minus className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {up && '+'}
        {index.change.toFixed(2)} ({up && '+'}
        {index.changePercent.toFixed(2)}%)
      </span>
      <span className="text-gray-600 select-none">·</span>
    </div>
  )
}

export function TickerBar({ initialData }: TickerBarProps) {
  const [data, setData] = useState<IndexQuote[]>(initialData)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/market/indices', { cache: 'no-store' })
      if (res.ok) {
        const fresh: IndexQuote[] = await res.json()
        setData(fresh)
        setLastUpdated(new Date())
      }
    } catch {
      /* silently keep showing stale data */
    } finally {
      setRefreshing(false)
    }
  }, [])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const id = setInterval(refresh, 60_000)
    return () => clearInterval(id)
  }, [refresh])

  // CSS marquee animation — we duplicate the list so the scroll is seamless
  const items = [...data, ...data]

  return (
    <div className="bg-gray-900 border-b border-gray-800 overflow-hidden">
      <div className="flex items-center">
        {/* Static label */}
        <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-blue-600 border-r border-blue-500 z-10">
          <TrendingUp className="h-3.5 w-3.5 text-white" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Live</span>
        </div>

        {/* Scrolling ticker */}
        <div className="flex-1 overflow-hidden relative">
          <div
            ref={trackRef}
            className="flex animate-ticker whitespace-nowrap py-2.5"
            style={{ animationDuration: `${Math.max(20, data.length * 8)}s` }}
          >
            {items.map((idx, i) => (
              <IndexChip key={`${idx.symbol}-${i}`} index={idx} />
            ))}
          </div>
        </div>

        {/* Refresh button */}
        <button
          onClick={refresh}
          disabled={refreshing}
          className="shrink-0 px-3 py-2.5 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          title="Refresh indices"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
        </button>

        {/* Last updated */}
        <span className="shrink-0 pr-4 text-[10px] text-gray-500">
          {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}
