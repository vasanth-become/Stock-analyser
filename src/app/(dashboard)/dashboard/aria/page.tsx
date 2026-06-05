'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { Search, Loader2, TrendingUp, TrendingDown, MessageSquare, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import AskAriaPage from '../../ask-aria/page'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResult {
  symbol: string
  companyName: string
  exchange: string
}

interface StockQuote {
  symbol: string
  companyName: string
  price: number
  change: number
  changePct: number
  exchange: string
}

// ─── Popular searches ─────────────────────────────────────────────────────────

const POPULAR = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'WIPRO', 'BAJFINANCE', 'HINDUNILVR']

// ─── Debounce hook ────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// ─── Stock Card ───────────────────────────────────────────────────────────────

function StockCard({
  quote,
  onAskAria,
  onClose,
}: {
  quote: StockQuote
  onAskAria: (msg: string) => void
  onClose: () => void
}) {
  const up = quote.changePct >= 0
  return (
    <Card className="mt-3 border-blue-200 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-gray-900 text-lg">{quote.symbol}</span>
              <span className="text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">{quote.exchange}</span>
            </div>
            <p className="text-sm text-gray-500 truncate">{quote.companyName}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xl font-bold text-gray-900">₹{quote.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className={`flex items-center gap-0.5 text-sm font-medium ${up ? 'text-green-600' : 'text-red-600'}`}>
                {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {up ? '+' : ''}{quote.change.toFixed(2)} ({up ? '+' : ''}{quote.changePct.toFixed(2)}%)
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
        <Button
          size="sm"
          className="mt-3 gap-1.5 w-full sm:w-auto"
          onClick={() => onAskAria(`Tell me about ${quote.symbol} (${quote.companyName}) — give me a research summary, key metrics, and your view on it.`)}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Ask ARIA about this →
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Smart Search Section ─────────────────────────────────────────────────────

function SmartSearch({ onAskAria }: { onAskAria: (msg: string) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedStock, setSelectedStock] = useState<StockQuote | null>(null)
  const [loadingQuote, setLoadingQuote] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const debouncedQuery = useDebounce(query, 300)

  const isQuestion = query.trim().split(/\s+/).length > 3

  // Fetch autocomplete
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([])
      setShowDropdown(false)
      return
    }
    setSearching(true)
    fetch(`/api/market/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        setResults(Array.isArray(data) ? data.slice(0, 8) : [])
        setShowDropdown(true)
      })
      .catch(() => setResults([]))
      .finally(() => setSearching(false))
  }, [debouncedQuery])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectStock = useCallback(async (result: SearchResult) => {
    setQuery(result.symbol)
    setShowDropdown(false)
    setLoadingQuote(true)
    setSelectedStock(null)
    try {
      const res = await fetch(`/api/market/quote?symbol=${result.symbol}&exchange=${result.exchange}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedStock({
          symbol: result.symbol,
          companyName: result.companyName,
          exchange: result.exchange,
          price: data.price ?? data.currentPrice ?? 0,
          change: data.change ?? 0,
          changePct: data.changePct ?? data.changePercent ?? 0,
        })
      } else {
        // Show card with partial info even if quote fails
        setSelectedStock({
          symbol: result.symbol,
          companyName: result.companyName,
          exchange: result.exchange,
          price: 0,
          change: 0,
          changePct: 0,
        })
      }
    } catch {
      setSelectedStock({
        symbol: result.symbol,
        companyName: result.companyName,
        exchange: result.exchange,
        price: 0,
        change: 0,
        changePct: 0,
      })
    } finally {
      setLoadingQuote(false)
    }
  }, [])

  const handlePopular = (ticker: string) => {
    setQuery(ticker)
    setSelectedStock(null)
    inputRef.current?.focus()
  }

  const handleAskAriaQuestion = () => {
    if (query.trim()) onAskAria(query.trim())
  }

  return (
    <div>
      {/* Search bar */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4 h-5 w-5 text-gray-400 pointer-events-none" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedStock(null) }}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder="Search any stock or ask ARIA a question"
            className="pl-11 pr-4 py-6 text-base rounded-2xl border-gray-300 focus:border-blue-400 focus:ring-blue-200 shadow-sm"
          />
          {searching && (
            <Loader2 className="absolute right-4 h-4 w-4 text-gray-400 animate-spin" />
          )}
        </div>

        {/* Autocomplete dropdown */}
        {showDropdown && results.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-30 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden"
          >
            {results.map((r) => (
              <button
                key={`${r.symbol}-${r.exchange}`}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50 transition-colors text-left"
                onMouseDown={(e) => { e.preventDefault(); selectStock(r) }}
              >
                <div>
                  <span className="font-semibold text-gray-900 text-sm">{r.symbol}</span>
                  <span className="text-xs text-gray-500 ml-2">{r.companyName}</span>
                </div>
                <span className="text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 shrink-0">{r.exchange}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Ask ARIA button — shown when query looks like a question */}
      {isQuestion && (
        <div className="mt-3">
          <Button onClick={handleAskAriaQuestion} className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Ask ARIA →
          </Button>
        </div>
      )}

      {/* Popular searches */}
      <div className="mt-4 flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-500 font-medium">Popular:</span>
        {POPULAR.map((ticker) => (
          <button
            key={ticker}
            onClick={() => handlePopular(ticker)}
            className="text-xs font-medium px-3 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700 transition-colors"
          >
            {ticker}
          </button>
        ))}
      </div>

      {/* Loading state for quote */}
      {loadingQuote && (
        <Card className="mt-3 border-gray-200">
          <CardContent className="p-4 flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            <span className="text-sm text-gray-500">Fetching stock data…</span>
          </CardContent>
        </Card>
      )}

      {/* Stock card when selected */}
      {selectedStock && !loadingQuote && (
        <StockCard
          quote={selectedStock}
          onAskAria={onAskAria}
          onClose={() => { setSelectedStock(null); setQuery('') }}
        />
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AriaPage() {
  // We need a way to pass a pre-filled message down to AskAriaPage.
  // AskAriaPage manages its own state, so we use a simple key + sessionStorage trick:
  // when "Ask ARIA about this →" is clicked, we store the message and remount the chat.
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const [chatKey, setChatKey] = useState(0)

  const handleAskAria = useCallback((msg: string) => {
    // Store in sessionStorage so AskAriaPage can pick it up on mount
    try { sessionStorage.setItem('aria_prefill', msg) } catch { /* ignore */ }
    setPendingMessage(msg)
    setChatKey((k) => k + 1)
    // Scroll to chat section
    setTimeout(() => {
      document.getElementById('aria-chat-section')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }, [])

  // AskAriaPage doesn't accept props, so we use a wrapper that triggers send after mount
  // by dispatching a custom event that AskAriaPage can listen to (simplest non-invasive approach).
  // We store in sessionStorage and the wrapped version below reads it.
  return (
    <div className="space-y-8">
      {/* Section A: Smart Search */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">ARIA Research Hub</h1>
        <p className="text-sm text-gray-500 mb-5">Search stocks or ask ARIA anything about the Indian markets.</p>
        <SmartSearch onAskAria={handleAskAria} />
      </div>

      {/* Section B: ARIA Chat */}
      <div id="aria-chat-section">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">Ask ARIA</h2>
        </div>
        <AskAriaPageWrapper key={chatKey} pendingMessage={pendingMessage} />
      </div>
    </div>
  )
}

// ─── Wrapper that auto-sends pending message ──────────────────────────────────
// Since AskAriaPage is a self-contained 'use client' component with internal state,
// we wrap it and use a useEffect to trigger the prefill via a custom DOM event.

function AskAriaPageWrapper({ pendingMessage, chatKey: _chatKey }: { pendingMessage: string | null; chatKey?: number }) {
  useEffect(() => {
    if (!pendingMessage) return
    // Give AskAriaPage time to mount and attach its listener
    const timer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('aria:prefill', { detail: { message: pendingMessage } }))
    }, 300)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <AskAriaPage />
}
