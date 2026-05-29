'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { MarketMover } from '@/lib/marketData'
import { cn } from '@/lib/utils'

interface MoversTableProps {
  initialGainers: MarketMover[]
  initialLosers: MarketMover[]
}

function formatVolume(v: number): string {
  if (v >= 10_000_000) return `${(v / 10_000_000).toFixed(1)}Cr`
  if (v >= 100_000)    return `${(v / 100_000).toFixed(1)}L`
  return v.toLocaleString('en-IN')
}

function MoverRow({ mover, type }: { mover: MarketMover; type: 'gainer' | 'loser' }) {
  const up = type === 'gainer'
  return (
    <Link href={`/stock/${mover.symbol}`}>
      <div className="flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg hover:bg-gray-50 transition-colors group">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold',
              up ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700',
            )}
          >
            {mover.symbol.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {mover.symbol}
            </p>
            <p className="text-xs text-gray-500 truncate">{mover.companyName}</p>
          </div>
        </div>
        <div className="text-right shrink-0 ml-3">
          <p className="text-sm font-bold text-gray-900">
            ₹{mover.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className={cn(
            'flex items-center justify-end gap-0.5 text-xs font-semibold mt-0.5',
            up ? 'text-green-600' : 'text-red-600',
          )}>
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {up && '+'}{mover.changePercent.toFixed(2)}%
          </div>
        </div>
      </div>
    </Link>
  )
}

export function MoversTable({ initialGainers, initialLosers }: MoversTableProps) {
  const [gainers, setGainers] = useState<MarketMover[]>(initialGainers)
  const [losers, setLosers] = useState<MarketMover[]>(initialLosers)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'gainers' | 'losers'>('gainers')

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/market/movers', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setGainers(data.gainers)
        setLosers(data.losers)
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  const active = tab === 'gainers' ? gainers : losers

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setTab('gainers')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors',
                tab === 'gainers'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Gainers
            </button>
            <button
              onClick={() => setTab('losers')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-200',
                tab === 'losers'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              <TrendingDown className="h-3.5 w-3.5" />
              Losers
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">NIFTY 50</Badge>
            <button
              onClick={refresh}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-0.5">
          {active.map((m) => (
            <MoverRow key={m.symbol} mover={m} type={tab === 'gainers' ? 'gainer' : 'loser'} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
