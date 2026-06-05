'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import WatchlistPage from '../../watchlist/page'
import PortfolioPage from '../../portfolio/page'
import ThesisPage from '../../thesis/page'

type Tab = 'watchlist' | 'portfolio' | 'research-notes'

const TABS: { id: Tab; label: string }[] = [
  { id: 'watchlist', label: 'Watchlist' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'research-notes', label: 'Research Notes' },
]

interface PortfolioStats {
  totalValue: number | null
  pnlToday: number | null
  stocksTracked: number | null
}

function StatSkeleton() {
  return (
    <div className="flex flex-col gap-1 animate-pulse">
      <div className="h-3 w-20 bg-gray-200 rounded" />
      <div className="h-5 w-24 bg-gray-300 rounded" />
    </div>
  )
}

function HeaderStats() {
  const [stats, setStats] = useState<PortfolioStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/portfolio')
      .then((r) => r.json())
      .then((data) => {
        // API returns { holdings: [...] } — compute stats from holdings
        const holdings: Array<{ currentValue?: number; gainLoss?: number }> = data?.holdings ?? []
        const totalValue = holdings.reduce((s, h) => s + (h.currentValue ?? 0), 0) || null
        const pnlToday = null // not available from portfolio API
        const stocksTracked = holdings.length || null
        setStats({ totalValue, pnlToday, stocksTracked })
      })
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  const fmt = (val: number | null | undefined, prefix = '₹') => {
    if (val == null) return '—'
    return `${prefix}${val.toLocaleString('en-IN')}`
  }

  const fmtPnl = (val: number | null | undefined) => {
    if (val == null) return '—'
    const sign = val >= 0 ? '+' : ''
    return `${sign}₹${val.toLocaleString('en-IN')}`
  }

  return (
    <div className="flex items-center gap-6 flex-wrap">
      {loading ? (
        <>
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
        </>
      ) : (
        <>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Value</span>
            <span className="text-base font-semibold text-gray-900">{fmt(stats?.totalValue)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">P&L Today</span>
            <span
              className={cn(
                'text-base font-semibold',
                stats?.pnlToday != null && stats.pnlToday >= 0 ? 'text-green-600' : 'text-red-600',
                stats?.pnlToday == null && 'text-gray-900',
              )}
            >
              {fmtPnl(stats?.pnlToday)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Stocks Tracked</span>
            <span className="text-base font-semibold text-gray-900">
              {stats?.stocksTracked != null ? stats.stocksTracked : '—'}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

function InvestmentsInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const rawTab = searchParams.get('tab') as Tab | null
  const activeTab: Tab = TABS.some((t) => t.id === rawTab) ? (rawTab as Tab) : 'watchlist'

  const handleTabClick = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Shared header strip */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-xl font-bold text-gray-900">My Investments</h1>
          <HeaderStats />
        </div>

        {/* Tab navigation */}
        <div className="mt-4 flex gap-0 border-b border-gray-200 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors focus:outline-none',
                activeTab === tab.id
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1">
        {activeTab === 'watchlist' && <WatchlistPage />}
        {activeTab === 'portfolio' && <PortfolioPage />}
        {activeTab === 'research-notes' && <ThesisPage />}
      </div>
    </div>
  )
}

export default function InvestmentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading…</div>}>
      <InvestmentsInner />
    </Suspense>
  )
}
