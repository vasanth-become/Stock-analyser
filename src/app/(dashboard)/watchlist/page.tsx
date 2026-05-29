'use client'

import { useState } from 'react'
import { BookOpen, Plus, Trash2, TrendingUp, TrendingDown, Search } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

const defaultWatchlist = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', price: 2834.50, change: 1.23, exchange: 'NSE' },
  { symbol: 'TCS', name: 'Tata Consultancy Services', price: 3921.75, change: 0.87, exchange: 'NSE' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', price: 1567.20, change: -0.34, exchange: 'NSE' },
  { symbol: 'INFY', name: 'Infosys', price: 1789.90, change: 1.56, exchange: 'NSE' },
  { symbol: 'WIPRO', name: 'Wipro Ltd', price: 478.90, change: 3.21, exchange: 'NSE' },
]

export default function WatchlistPage() {
  const [stocks, setStocks] = useState(defaultWatchlist)
  const [newSymbol, setNewSymbol] = useState('')

  function addStock() {
    if (!newSymbol.trim()) return
    const sym = newSymbol.toUpperCase().trim()
    if (stocks.find((s) => s.symbol === sym)) return
    setStocks([...stocks, {
      symbol: sym,
      name: `${sym} Limited`,
      price: 1000 + Math.random() * 3000,
      change: (Math.random() - 0.5) * 6,
      exchange: 'NSE',
    }])
    setNewSymbol('')
  }

  function removeStock(symbol: string) {
    setStocks(stocks.filter((s) => s.symbol !== symbol))
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-600" />
            Watchlist
          </h1>
          <p className="text-gray-500 text-sm mt-1">Track stocks you&apos;re following</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add to Watchlist</CardTitle>
          <CardDescription>Search and add NSE/BSE stocks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Enter stock symbol (e.g. RELIANCE)"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && addStock()}
                className="pl-9"
              />
            </div>
            <Button onClick={addStock} disabled={!newSymbol.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Watchlist</CardTitle>
          <CardDescription>{stocks.length} stocks being tracked</CardDescription>
        </CardHeader>
        <CardContent>
          {stocks.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No stocks in watchlist. Add some above.</p>
          ) : (
            <div className="space-y-2">
              {stocks.map((stock) => (
                <div key={stock.symbol} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors">
                  <Link href={`/stock/${stock.symbol}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold ${stock.change >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {stock.symbol.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{stock.symbol}</p>
                        <p className="text-xs text-gray-500 truncate">{stock.name}</p>
                      </div>
                    </div>
                  </Link>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 text-sm">₹{stock.price.toFixed(2)}</p>
                      <div className={`flex items-center gap-1 text-xs font-medium justify-end ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stock.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
                      </div>
                    </div>
                    <Badge variant="outline" className="hidden sm:flex">{stock.exchange}</Badge>
                    <button
                      onClick={() => removeStock(stock.symbol)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
