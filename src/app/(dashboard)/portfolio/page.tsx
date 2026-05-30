'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BriefcaseBusiness, Plus, Trash2, Pencil, Check,
  Loader2, TrendingUp, TrendingDown, IndianRupee, RefreshCw,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { xirr, xirrToPercent, type CashFlow } from '@/lib/xirr'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Holding {
  id: string
  symbol: string
  exchange: 'NSE' | 'BSE'
  companyName: string | null
  sector: string | null
  quantity: number
  buyPrice: number
  buyDate: string
  notes: string | null
}

interface LiveHolding extends Holding {
  currentPrice: number | null
  loadingPrice: boolean
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SECTOR_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1',
]

const SECTORS = [
  'IT', 'Banking', 'Finance', 'FMCG', 'Auto', 'Pharma',
  'Energy', 'Metals', 'Infrastructure', 'Realty', 'Telecom', 'Other',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtINR(n: number) {
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Add / Edit holding form ──────────────────────────────────────────────────

interface HoldingFormProps {
  initial?: Partial<Holding>
  onSave: (data: Omit<Holding, 'id'>) => Promise<void>
  onCancel: () => void
}

function HoldingForm({ initial, onSave, onCancel }: HoldingFormProps) {
  const [symbol, setSymbol] = useState(initial?.symbol ?? '')
  const [exchange, setExchange] = useState<'NSE' | 'BSE'>(initial?.exchange ?? 'NSE')
  const [companyName, setCompanyName] = useState(initial?.companyName ?? '')
  const [sector, setSector] = useState(initial?.sector ?? '')
  const [quantity, setQuantity] = useState(String(initial?.quantity ?? ''))
  const [buyPrice, setBuyPrice] = useState(String(initial?.buyPrice ?? ''))
  const [buyDate, setBuyDate] = useState(
    initial?.buyDate ? initial.buyDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
  )
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!symbol || !quantity || !buyPrice || !buyDate) {
      setError('Symbol, quantity, buy price and date are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        symbol: symbol.toUpperCase(),
        exchange,
        companyName: companyName || null,
        sector: sector || null,
        quantity: parseFloat(quantity),
        buyPrice: parseFloat(buyPrice),
        buyDate,
        notes: notes || null,
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3 bg-blue-50 rounded-xl p-4 border border-blue-100">
      <p className="text-sm font-semibold text-gray-800">{initial?.id ? 'Edit Holding' : 'Add Holding'}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs text-gray-500 mb-1">Symbol *</label>
          <Input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="e.g. RELIANCE"
            className="uppercase text-sm h-9"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Exchange</label>
          <div className="flex gap-1 h-9">
            {(['NSE', 'BSE'] as const).map((ex) => (
              <button
                key={ex}
                onClick={() => setExchange(ex)}
                className={cn(
                  'flex-1 rounded-md text-xs font-medium border transition-colors',
                  exchange === ex ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300',
                )}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Quantity *</label>
          <Input
            type="number"
            min="0.001"
            step="0.001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g. 10"
            className="text-sm h-9"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Buy Price (₹) *</label>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
            placeholder="e.g. 2450"
            className="text-sm h-9"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Buy Date *</label>
          <Input
            type="date"
            value={buyDate}
            onChange={(e) => setBuyDate(e.target.value)}
            className="text-sm h-9"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Sector</label>
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="w-full h-9 text-sm border border-gray-300 rounded-md px-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="">Select…</option>
            {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Company Name</label>
          <Input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Optional — auto-shown from market data"
            className="text-sm h-9"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Notes (optional)</label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Investment thesis, target price, etc."
          className="text-sm h-9"
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={submit} disabled={saving}>
          {saving
            ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            : <Check className="h-3.5 w-3.5 mr-1" />}
          Save
        </Button>
      </div>
    </div>
  )
}

// ─── Holding row ─────────────────────────────────────────────────────────────

function HoldingRow({
  holding,
  onDelete,
  onEdit,
}: { holding: LiveHolding; onDelete: (id: string) => void; onEdit: (h: LiveHolding) => void }) {
  const [deleting, setDeleting] = useState(false)

  const invested = holding.quantity * holding.buyPrice
  const currentValue = holding.currentPrice !== null ? holding.quantity * holding.currentPrice : null
  const gain = currentValue !== null ? currentValue - invested : null
  const gainPct = gain !== null ? (gain / invested) * 100 : null
  const up = (gainPct ?? 0) >= 0

  async function doDelete() {
    setDeleting(true)
    await fetch(`/api/portfolio?id=${holding.id}`, { method: 'DELETE' })
    onDelete(holding.id)
  }

  return (
    <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-center py-3 px-4 -mx-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
      {/* Symbol + name */}
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
          gain === null ? 'bg-gray-100 text-gray-500'
            : up ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700',
        )}>
          {holding.symbol.slice(0, 2)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-gray-900 text-sm">{holding.symbol}</p>
            <Badge variant="outline" className="text-[10px] py-0">{holding.exchange}</Badge>
          </div>
          <p className="text-xs text-gray-500 truncate">
            {holding.companyName ?? `${holding.symbol} Limited`}
          </p>
          {holding.sector && (
            <span className="text-[10px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5 mt-0.5 inline-block">
              {holding.sector}
            </span>
          )}
          {holding.notes && (
            <p className="text-[10px] text-gray-400 italic mt-0.5 truncate max-w-[180px]">{holding.notes}</p>
          )}
        </div>
      </div>

      {/* Qty × buy price + date */}
      <div className="hidden sm:block text-right">
        <p className="text-sm font-medium text-gray-800">{holding.quantity} shares</p>
        <p className="text-xs text-gray-500">@ ₹{holding.buyPrice.toLocaleString('en-IN')}</p>
        <p className="text-xs text-gray-400">{fmtDate(holding.buyDate)}</p>
      </div>

      {/* Invested */}
      <div className="hidden sm:block text-right">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Invested</p>
        <p className="text-sm font-semibold text-gray-800">{fmtINR(invested)}</p>
      </div>

      {/* Current value + unrealised P&L */}
      <div className="text-right">
        {holding.loadingPrice ? (
          <Loader2 className="h-4 w-4 animate-spin text-gray-300 ml-auto" />
        ) : currentValue !== null ? (
          <>
            <p className="text-sm font-bold text-gray-900">{fmtINR(currentValue)}</p>
            <div className={cn(
              'flex items-center justify-end gap-0.5 text-xs font-semibold',
              up ? 'text-green-600' : 'text-red-600',
            )}>
              {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {up ? '+' : ''}{fmtINR(gain!)}
              <span className="text-[10px] ml-0.5">
                ({up ? '+' : ''}{gainPct!.toFixed(1)}%)
              </span>
            </div>
          </>
        ) : (
          <span className="text-xs text-gray-400">N/A</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={() => onEdit(holding)}
          className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded"
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={doDelete}
          disabled={deleting}
          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded"
          title="Delete"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}

// ─── Custom pie tooltip ───────────────────────────────────────────────────────

interface TooltipPayloadItem {
  name: string
  payload: { value: number; pct: number }
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null
  const { name, payload: p } = payload[0]
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-xs">
      <p className="font-semibold text-gray-800">{name}</p>
      <p className="text-gray-600">{fmtINR(p.value)}</p>
      <p className="text-gray-500">{p.pct.toFixed(1)}% of portfolio</p>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<LiveHolding[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<LiveHolding | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchHoldings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/portfolio')
      if (!res.ok) return
      const data = await res.json()
      const liveHoldings: LiveHolding[] = (data.holdings ?? []).map((h: Holding) => ({
        ...h,
        currentPrice: null,
        loadingPrice: true,
      }))
      setHoldings(liveHoldings)
      // Fetch live prices in parallel (non-blocking)
      liveHoldings.forEach(async (h) => {
        try {
          const r = await fetch(`/api/market/quote?symbol=${h.symbol}&exchange=${h.exchange}`)
          const d = r.ok ? await r.json() : null
          const price = d?.quote?.price ?? null
          const name = d?.quote?.companyName ?? null
          setHoldings((prev) => prev.map((p) =>
            p.id === h.id ? { ...p, currentPrice: price, loadingPrice: false, companyName: p.companyName ?? name } : p,
          ))
        } catch {
          setHoldings((prev) => prev.map((p) => p.id === h.id ? { ...p, loadingPrice: false } : p))
        }
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchHoldings() }, [fetchHoldings, refreshKey])

  async function addHolding(data: Omit<Holding, 'id'>) {
    const res = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed to add') }
    await fetchHoldings()
    setShowForm(false)
  }

  async function updateHolding(data: Omit<Holding, 'id'>) {
    if (!editTarget) return
    const res = await fetch('/api/portfolio', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editTarget.id, ...data }),
    })
    if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed to update') }
    await fetchHoldings()
    setEditTarget(null)
  }

  function deleteHolding(id: string) {
    setHoldings((prev) => prev.filter((h) => h.id !== id))
  }

  // ── Aggregate metrics ──────────────────────────────────────────────────────

  const totalInvested = holdings.reduce((s, h) => s + h.quantity * h.buyPrice, 0)
  const totalValue = holdings.reduce(
    (s, h) => s + h.quantity * (h.currentPrice ?? h.buyPrice),
    0,
  )
  const totalGain = totalValue - totalInvested
  const totalGainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0

  // XIRR: one negative cashflow per holding at buyDate, current value today
  const cashflows: CashFlow[] = [
    ...holdings.map((h) => ({ amount: -(h.quantity * h.buyPrice), date: new Date(h.buyDate) })),
    { amount: totalValue, date: new Date() },
  ].sort((a, b) => a.date.getTime() - b.date.getTime())

  const xirrRate = holdings.length > 1 ? xirr(cashflows) : null

  // ── Sector pie data ────────────────────────────────────────────────────────

  const sectorMap = new Map<string, number>()
  holdings.forEach((h) => {
    const sec = h.sector ?? 'Other'
    const val = h.quantity * (h.currentPrice ?? h.buyPrice)
    sectorMap.set(sec, (sectorMap.get(sec) ?? 0) + val)
  })
  const pieData = Array.from(sectorMap.entries())
    .map(([name, value]) => ({ name, value, pct: totalValue > 0 ? (value / totalValue) * 100 : 0 }))
    .sort((a, b) => b.value - a.value)

  const overallUp = totalGain >= 0

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BriefcaseBusiness className="h-6 w-6 text-blue-600" />
            Portfolio Tracker
          </h1>
          <p className="text-gray-500 text-sm mt-1">Track holdings, P&amp;L and sector allocation</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-gray-100"
            title="Refresh prices"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <Button size="sm" onClick={() => { setShowForm(true); setEditTarget(null) }}>
            <Plus className="h-4 w-4 mr-1" /> Add Holding
          </Button>
        </div>
      </div>

      {/* Add / Edit form */}
      {(showForm || editTarget) && (
        <HoldingForm
          initial={editTarget ?? undefined}
          onSave={editTarget ? updateHolding : addHolding}
          onCancel={() => { setShowForm(false); setEditTarget(null) }}
        />
      )}

      {/* P&L tracking note */}
      {!loading && holdings.length > 0 && (
        <p className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
          P&L shown is based on prices you entered manually and live market data. This is a tracking tool only. ARIA Research does not manage or execute trades on your behalf.
        </p>
      )}

      {/* Summary cards */}
      {!loading && holdings.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Total Invested',
              value: fmtINR(totalInvested),
              sub: null,
              color: 'text-gray-900',
            },
            {
              label: 'Current Value',
              value: fmtINR(totalValue),
              sub: null,
              color: 'text-gray-900',
            },
            {
              label: 'Unrealised P&L',
              value: `${overallUp ? '+' : ''}${fmtINR(totalGain)}`,
              sub: `${overallUp ? '+' : ''}${totalGainPct.toFixed(1)}%`,
              color: overallUp ? 'text-green-600' : 'text-red-600',
            },
            {
              label: 'XIRR (p.a.)',
              value: xirrToPercent(xirrRate),
              sub: 'annualised',
              color: (xirrRate ?? 0) >= 0 ? 'text-green-600' : 'text-red-600',
            },
          ].map(({ label, value, sub, color }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-gray-500">{label}</p>
                <p className={cn('text-lg font-bold mt-0.5', color)}>{value}</p>
                {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pie + holdings table */}
      {!loading && holdings.length > 0 && (
        <div className={cn('grid gap-4', pieData.length > 1 ? 'lg:grid-cols-3' : '')}>
          {/* Sector allocation pie */}
          {pieData.length > 1 && (
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Sector Allocation</CardTitle>
              </CardHeader>
              <CardContent className="p-0 pb-4">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(v) => <span className="text-xs text-gray-700">{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Holdings */}
          <Card className={pieData.length > 1 ? 'lg:col-span-2' : ''}>
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Holdings</CardTitle>
                <CardDescription>
                  {holdings.length} position{holdings.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div>
                {holdings.map((h) => (
                  <HoldingRow
                    key={h.id}
                    holding={h}
                    onDelete={deleteHolding}
                    onEdit={setEditTarget}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && holdings.length === 0 && !showForm && !editTarget && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
            <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center">
              <IndianRupee className="h-8 w-8 text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-lg">No holdings yet</p>
              <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
                Add your first holding to start tracking portfolio value and returns.
              </p>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add First Holding
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
