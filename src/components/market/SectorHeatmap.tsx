'use client'

import { useState, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import type { SectorPerformance } from '@/lib/marketData'
import { cn } from '@/lib/utils'

interface SectorHeatmapProps {
  initialData: SectorPerformance[]
}

const SECTOR_ICONS: Record<string, string> = {
  IT: '💻', Banking: '🏦', Pharma: '💊', FMCG: '🛒',
  Auto: '🚗', Energy: '⚡', Infrastructure: '🏗️',
  Metals: '🔩', Realty: '🏢', Finance: '💰',
}

function intensity(pct: number): string {
  const abs = Math.abs(pct)
  if (abs >= 3) return 'strong'
  if (abs >= 1.5) return 'medium'
  if (abs >= 0.5) return 'mild'
  return 'flat'
}

const COLOURS = {
  green: {
    strong: 'bg-green-600 text-white border-green-500',
    medium: 'bg-green-500 text-white border-green-400',
    mild:   'bg-green-100 text-green-800 border-green-200',
    flat:   'bg-green-50  text-green-700 border-green-100',
  },
  red: {
    strong: 'bg-red-600 text-white border-red-500',
    medium: 'bg-red-500 text-white border-red-400',
    mild:   'bg-red-100 text-red-800 border-red-200',
    flat:   'bg-red-50  text-red-700 border-red-100',
  },
  neutral: {
    strong: 'bg-gray-200 text-gray-700 border-gray-200',
    medium: 'bg-gray-200 text-gray-700 border-gray-200',
    mild:   'bg-gray-100 text-gray-600 border-gray-200',
    flat:   'bg-gray-50  text-gray-500 border-gray-100',
  },
}

export function SectorHeatmap({ initialData }: SectorHeatmapProps) {
  const [data, setData] = useState<SectorPerformance[]>(initialData)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/market/sectors', { cache: 'no-store' })
      if (res.ok) setData(await res.json())
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">Sector Heatmap</h3>
          <p className="text-xs text-gray-500 mt-0.5">NSE sector index performance today</p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {data.map((sec) => {
          const level = intensity(sec.changePercent)
          const colourClass = COLOURS[sec.color][level as keyof typeof COLOURS.green]
          const icon = SECTOR_ICONS[sec.sector] ?? '📊'

          return (
            <div
              key={sec.sector}
              className={cn(
                'rounded-xl border p-3 flex flex-col gap-1.5 transition-all hover:scale-[1.02] cursor-default',
                colourClass,
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-base leading-none">{icon}</span>
                <span
                  className={cn(
                    'text-xs font-bold',
                    sec.color === 'green' && level !== 'flat' ? '' : '',
                  )}
                >
                  {sec.changePercent >= 0 ? '+' : ''}
                  {sec.changePercent.toFixed(2)}%
                </span>
              </div>
              <p className="text-xs font-semibold leading-tight">{sec.sector}</p>
              <p className="text-[10px] opacity-80">
                {sec.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-5 rounded bg-green-600" /> &gt;3% gain
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-5 rounded bg-green-100 border border-green-200" /> &lt;1.5%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-5 rounded bg-red-100 border border-red-200" /> &lt;-1.5%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-5 rounded bg-red-600" /> &gt;-3% loss
        </span>
      </div>
    </div>
  )
}
