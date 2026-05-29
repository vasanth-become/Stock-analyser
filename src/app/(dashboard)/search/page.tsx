'use client'

import { useState } from 'react'
import { Search, TrendingUp, TrendingDown, ExternalLink, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface StockResult {
  symbol: string
  companyName: string
  price: number
  change: number
  changePercent: number
  exchange: string
  volume: number
  marketCap?: number
}

const popularSearches = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'WIPRO', 'BAJFINANCE', 'HINDUNILVR']

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<StockResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSearch(sym?: string) {
    const searchSym = (sym || query).toUpperCase().trim()
    if (!searchSym) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch(`/api/stocks/quote?symbol=${searchSym}&exchange=NSE`)
      if (!res.ok) throw new Error('Stock not found')
      const data = await res.json()
      setResult(data)
    } catch {
      setError('Could not find stock. Please check the symbol and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Search className="h-6 w-6 text-blue-600" />
          Stock Search
        </h1>
        <p className="text-gray-500 text-sm mt-1">Search for any NSE or BSE listed stock</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Enter stock symbol (e.g. RELIANCE, TCS)"
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9 text-sm"
          />
        </div>
        <Button onClick={() => handleSearch()} disabled={loading || !query.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
        </Button>
      </div>

      <div>
        <p className="text-sm text-gray-500 mb-3">Popular stocks:</p>
        <div className="flex flex-wrap gap-2">
          {popularSearches.map((s) => (
            <button
              key={s}
              onClick={() => { setQuery(s); handleSearch(s) }}
              className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">{result.symbol}</CardTitle>
                <p className="text-gray-500 text-sm mt-1">{result.companyName}</p>
              </div>
              <div className="flex gap-2">
                <Badge>{result.exchange}</Badge>
                <Link href={`/stock/${result.symbol}`}>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Full View
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-4 mb-6">
              <span className="text-4xl font-bold text-gray-900">₹{result.price.toFixed(2)}</span>
              <div className={`flex items-center gap-1 text-lg font-semibold ${result.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {result.changePercent >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                {result.change >= 0 ? '+' : ''}₹{result.change.toFixed(2)} ({result.changePercent >= 0 ? '+' : ''}{result.changePercent.toFixed(2)}%)
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Volume', value: result.volume.toLocaleString('en-IN') },
                { label: 'Market Cap', value: result.marketCap ? `₹${(result.marketCap / 10000000).toFixed(0)}Cr` : 'N/A' },
                { label: 'Exchange', value: result.exchange },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className="font-semibold text-gray-900">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-3">
              <Link href={`/analysis?symbol=${result.symbol}`} className="flex-1">
                <Button className="w-full">Get AI Analysis</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
