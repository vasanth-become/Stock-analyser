import { Suspense } from 'react'
import { Clock, Activity } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TickerBar } from '@/components/market/TickerBar'
import { SectorHeatmap } from '@/components/market/SectorHeatmap'
import { MoversTable } from '@/components/market/MoversTable'
import {
  getIndexQuotes,
  getSectorPerformance,
  getTopGainersLosers,
  isMarketOpen,
} from '@/lib/marketData'

export const metadata = { title: 'Markets' }

// Revalidate every 60s so the page data is reasonably fresh on server render
export const revalidate = 60

function MarketStatusBadge({ open }: { open: boolean }) {
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
      open ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${open ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
      {open ? 'Market Open' : 'Market Closed'}
    </div>
  )
}

async function MarketPageContent() {
  const [indices, sectors, movers] = await Promise.all([
    getIndexQuotes(),
    getSectorPerformance(),
    getTopGainersLosers(),
  ])

  const marketOpen = isMarketOpen()
  const istTime = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date())

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-600" />
            Markets
          </h1>
          <p className="text-gray-500 text-sm mt-1">NSE & BSE live market overview</p>
        </div>
        <div className="flex items-center gap-3">
          <MarketStatusBadge open={marketOpen} />
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            IST {istTime}
          </div>
        </div>
      </div>

      {/* Live ticker bar */}
      <div className="-mx-4 lg:-mx-6 rounded-none overflow-hidden sm:mx-0 sm:rounded-xl">
        <TickerBar initialData={indices} />
      </div>

      {/* Indices summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {indices.map((idx) => (
          <Card key={idx.symbol}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-gray-500 mb-1">{idx.name}</p>
              <p className="text-lg font-bold text-gray-900">
                {idx.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
              <p className={`text-sm font-semibold mt-0.5 ${idx.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {idx.changePercent >= 0 ? '+' : ''}{idx.change.toFixed(2)}{' '}
                <span className="text-xs">({idx.changePercent >= 0 ? '+' : ''}{idx.changePercent.toFixed(2)}%)</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sector heatmap */}
      <Card>
        <CardContent className="p-5">
          <SectorHeatmap initialData={sectors} />
        </CardContent>
      </Card>

      {/* Top movers */}
      <div className="grid lg:grid-cols-2 gap-6">
        <MoversTable initialGainers={movers.gainers} initialLosers={movers.losers} />

        {/* Market info card */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="font-semibold text-gray-900">Market Information</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: 'NSE Trading Hours', value: '9:15 AM – 3:30 PM IST' },
                { label: 'BSE Trading Hours', value: '9:15 AM – 3:30 PM IST' },
                { label: 'Settlement Cycle',  value: 'T+1 (Equity)' },
                { label: 'Circuit Limits',    value: '2%, 5%, 10%, 20%' },
                { label: 'Lot Size (F&O)',    value: 'Varies by security' },
                { label: 'SEBI Regulator',    value: 'Securities and Exchange Board of India' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-gray-500 shrink-0">{label}</span>
                  <span className="text-gray-900 font-medium text-right">{value}</span>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 mt-2">
              <p className="text-xs text-blue-700 leading-relaxed">
                <strong>Data disclaimer:</strong> Market data shown is for informational purposes only.
                There may be a delay of up to 15 minutes. Always verify with your broker before trading.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MarketPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <div className="grid lg:grid-cols-2 gap-6">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  )
}

export default function MarketsPage() {
  return (
    <Suspense fallback={<MarketPageSkeleton />}>
      <MarketPageContent />
    </Suspense>
  )
}
