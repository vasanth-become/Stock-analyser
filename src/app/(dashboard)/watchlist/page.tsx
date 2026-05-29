'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BookOpen, Plus, Trash2, TrendingUp, TrendingDown,
  Search, RefreshCw, Loader2, Pencil, Check, X, ArrowUpRight,
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface WatchlistStockRecord {
  id: string
  symbol: string
  exchange: 'NSE' | 'BSE'
  notes: string | null
  addedAt: string
}

interface WatchlistRecord {
  id: string
  name: string
  stocks: WatchlistStockRecord[]
}

interface LiveQuote {
  price: number
  change: number
  changePercent: number
  week52High: number
  week52Low: number
  companyName: string
  volume: number
}

// ─── 52-week range bar ───────────────────────────────────────────────────────

function RangeBar({ low, high, current }: { low: number; high: number; current: number }) {
  const pct = high > low ? Math.min(100, Math.max(0, ((current - low) / (high - low)) * 100)) : 50
  return (
    <div className="w-full">
      <div className="relative h-1.5 bg-gray-100 rounded-full">
        <div
          className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-blue-600 shadow-sm border-2 border-white"
          style={{ left: `calc(${pct}% - 6px)` }}
        />
        <div className="absolute left-0 h-full bg-gradient-to-r from-red-400 via-amber-400 to-green-400 rounded-full opacity-40 w-full" />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-gray-400">₹{low.toLocaleString('en-IN')}</span>
        <span className="text-[9px] text-gray-400">52W</span>
        <span className="text-[9px] text-gray-400">₹{high.toLocaleString('en-IN')}</span>
      </div>
    </div>
  )
}

// ─── Inline notes editor ─────────────────────────────────────────────────────

function NotesCell({
  stockId, initial, onSave,
}: { stockId: string; initial: string | null; onSave: (id: string, val: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initial ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await fetch('/api/watchlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watchlistStockId: stockId, notes: value }),
      })
      onSave(stockId, value)
      setEditing(false)
    } catch { /* ignore */ } finally { setSaving(false) }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 w-full">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
          placeholder="Add your notes, buy target…"
          className="flex-1 text-xs border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 min-w-0"
        />
        <button onClick={save} disabled={saving} className="text-green-600 hover:text-green-800 p-0.5">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        </button>
        <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600 p-0.5">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors group max-w-full"
    >
      <Pencil className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="truncate max-w-[200px]">{value || 'Add notes…'}</span>
    </button>
  )
}

// ─── Stock row ───────────────────────────────────────────────────────────────

function WatchlistRow({
  stock,
  watchlistId,
  onRemove,
  onNotesSave,
}: {
  stock: WatchlistStockRecord
  watchlistId: string
  onRemove: (symbol: string) => void
  onNotesSave: (id: string, val: string) => void
}) {
  const [quote, setQuote] = useState<LiveQuote | null>(null)
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/market/quote?symbol=${stock.symbol}&exchange=${stock.exchange}&fundamentals=false`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (!cancelled && d?.quote) setQuote(d.quote) })
      .catch(() => null)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [stock.symbol, stock.exchange])

  async function remove() {
    setRemoving(true)
    await fetch(`/api/watchlist?symbol=${stock.symbol}&watchlistId=${watchlistId}`, { method: 'DELETE' })
    onRemove(stock.symbol)
  }

  const up = (quote?.changePercent ?? 0) >= 0

  return (
    <div className="grid grid-cols-[1fr_auto] gap-3 sm:grid-cols-[2fr_1.5fr_2fr_auto] items-center py-3 px-4 -mx-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
      {/* Symbol + name */}
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
          loading ? 'bg-gray-100 text-gray-400' : up ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700',
        )}>
          {stock.symbol.slice(0, 2)}
        </div>
        <div className="min-w-0">
          <Link href={`/stock/${stock.symbol}`} className="flex items-center gap-1 group">
            <p className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
              {stock.symbol}
            </p>
            <ArrowUpRight className="h-3 w-3 text-gray-300 group-hover:text-blue-500 transition-colors" />
          </Link>
          <p className="text-xs text-gray-500 truncate">
            {loading ? '—' : quote?.companyName ?? `${stock.symbol} Limited`}
          </p>
          <div className="mt-0.5">
            <NotesCell stockId={stock.id} initial={stock.notes} onSave={onNotesSave} />
          </div>
        </div>
      </div>

      {/* Price + change */}
      <div className="text-right">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-gray-300 ml-auto" />
        ) : quote ? (
          <>
            <p className="font-bold text-gray-900 text-sm">
              ₹{quote.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className={cn(
              'flex items-center justify-end gap-0.5 text-xs font-semibold mt-0.5',
              up ? 'text-green-600' : 'text-red-600',
            )}>
              {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {up ? '+' : ''}{quote.changePercent.toFixed(2)}%
            </div>
          </>
        ) : <span className="text-xs text-gray-400">N/A</span>}
      </div>

      {/* 52W range — hidden on mobile */}
      <div className="hidden sm:block px-2">
        {!loading && quote ? (
          <RangeBar low={quote.week52Low} high={quote.week52High} current={quote.price} />
        ) : (
          <div className="h-5 bg-gray-100 rounded animate-pulse" />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Badge variant="outline" className="hidden sm:flex text-[10px]">{stock.exchange}</Badge>
        <button
          onClick={remove}
          disabled={removing}
          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded"
          title="Remove"
        >
          {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [symbol, setSymbol] = useState('')
  const [exchange, setExchange] = useState<'NSE' | 'BSE'>('NSE')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchWatchlist = useCallback(async () => {
    try {
      const res = await fetch('/api/watchlist')
      if (!res.ok) return
      const data: WatchlistRecord[] = await res.json()
      setWatchlist(data[0] ?? null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchWatchlist() }, [fetchWatchlist])

  async function addStock() {
    if (!symbol.trim()) return
    setAdding(true)
    setAddError('')
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: symbol.trim(), exchange }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setSymbol('')
      await fetchWatchlist()
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : 'Failed to add stock')
    } finally {
      setAdding(false)
    }
  }

  function removeStock(sym: string) {
    if (!watchlist) return
    setWatchlist({ ...watchlist, stocks: watchlist.stocks.filter((s) => s.symbol !== sym) })
  }

  function updateNotes(id: string, notes: string) {
    if (!watchlist) return
    setWatchlist({
      ...watchlist,
      stocks: watchlist.stocks.map((s) => (s.id === id ? { ...s, notes } : s)),
    })
  }

  const stocks = watchlist?.stocks ?? []

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-600" />
            Watchlist
          </h1>
          <p className="text-gray-500 text-sm mt-1">Track stocks with live prices and personal notes</p>
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-gray-100"
          title="Refresh prices"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Add stock */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add Stock</CardTitle>
          <CardDescription>Enter an NSE/BSE ticker symbol</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="e.g. RELIANCE, TCS, INFY"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && addStock()}
                className="pl-9 uppercase"
              />
            </div>
            <div className="flex gap-2 shrink-0">
              {(['NSE', 'BSE'] as const).map((ex) => (
                <button
                  key={ex}
                  onClick={() => setExchange(ex)}
                  className={cn(
                    'px-3 py-2 rounded-md text-sm font-medium border transition-colors',
                    exchange === ex
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
                  )}
                >
                  {ex}
                </button>
              ))}
              <Button onClick={addStock} disabled={adding || !symbol.trim()}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                <span className="ml-1 hidden sm:inline">Add</span>
              </Button>
            </div>
          </div>
          {addError && <p className="text-xs text-red-500 mt-2">{addError}</p>}
        </CardContent>
      </Card>

      {/* Watchlist table */}
      <Card key={refreshKey}>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                {watchlist?.name ?? 'My Watchlist'}
              </CardTitle>
              <CardDescription>
                {loading ? 'Loading…' : `${stocks.length} stock${stocks.length !== 1 ? 's' : ''}`}
              </CardDescription>
            </div>
            {stocks.length > 0 && (
              <div className="hidden sm:grid grid-cols-4 gap-3 text-[10px] uppercase tracking-wide text-gray-400 text-right pr-4 w-80">
                <span className="col-span-1 text-left">Stock</span>
                <span>Price</span>
                <span>52-Week Range</span>
                <span />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {loading ? (
            <div className="space-y-4 py-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : stocks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="font-medium">No stocks yet</p>
              <p className="text-sm mt-1">Add a stock above to start tracking</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {stocks.map((s) => (
                <WatchlistRow
                  key={s.id}
                  stock={s}
                  watchlistId={watchlist!.id}
                  onRemove={removeStock}
                  onNotesSave={updateNotes}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
