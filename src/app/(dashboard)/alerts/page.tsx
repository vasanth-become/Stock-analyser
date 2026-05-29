'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Bell, Plus, Trash2, CheckCircle2, AlertTriangle, RefreshCw,
  Loader2, ToggleLeft, ToggleRight, TrendingUp, TrendingDown,
  Percent, Info, Mail,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

type AlertType = 'PRICE_ABOVE' | 'PRICE_BELOW' | 'PERCENT_CHANGE'

interface Alert {
  id: string
  symbol: string
  exchange: 'NSE' | 'BSE'
  type: AlertType
  value: number
  triggered: boolean
  triggeredAt: string | null
  notifiedAt: string | null
  active: boolean
  createdAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_META: Record<AlertType, { label: string; icon: typeof TrendingUp; color: string; prefix: string; suffix: string }> = {
  PRICE_ABOVE:    { label: 'Price Above',   icon: TrendingUp,   color: 'text-green-600 bg-green-50',  prefix: '₹', suffix: '' },
  PRICE_BELOW:    { label: 'Price Below',   icon: TrendingDown, color: 'text-red-600 bg-red-50',      prefix: '₹', suffix: '' },
  PERCENT_CHANGE: { label: '% Change ≥',    icon: Percent,      color: 'text-blue-600 bg-blue-50',    prefix: '±', suffix: '%' },
}

// ─── Alert row ────────────────────────────────────────────────────────────────

function AlertRow({
  alert,
  onDelete,
  onToggle,
}: {
  alert: Alert
  onDelete: (id: string) => void
  onToggle: (id: string, active: boolean) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [toggling, setToggling] = useState(false)
  const meta = TYPE_META[alert.type]
  const Icon = meta.icon

  async function del() {
    setDeleting(true)
    await fetch(`/api/alerts?id=${alert.id}`, { method: 'DELETE' })
    onDelete(alert.id)
  }

  async function toggle() {
    setToggling(true)
    const res = await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: alert.id, active: !alert.active }),
    })
    if (res.ok) onToggle(alert.id, !alert.active)
    setToggling(false)
  }

  return (
    <div className={cn(
      'flex items-center gap-3 py-3 px-4 -mx-4 rounded-lg transition-colors',
      alert.triggered ? 'bg-amber-50 border border-amber-100' : 'hover:bg-gray-50',
      !alert.active && 'opacity-50',
    )}>
      {/* Type icon */}
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', meta.color)}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-gray-900 text-sm">{alert.symbol}</span>
          <Badge variant="outline" className="text-[10px] py-0">{alert.exchange}</Badge>
          {alert.triggered && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
              <CheckCircle2 className="h-3 w-3" /> Triggered
            </span>
          )}
          {!alert.active && (
            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">Paused</span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {meta.label}: <span className="font-semibold text-gray-800">{meta.prefix}{alert.value.toLocaleString('en-IN')}{meta.suffix}</span>
          {alert.triggeredAt && (
            <span className="ml-2 text-amber-600">
              · fired {new Date(alert.triggeredAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
            </span>
          )}
          {alert.notifiedAt && (
            <span className="ml-1 text-gray-400 flex-inline items-center gap-0.5">
              · <Mail className="h-2.5 w-2.5 inline" /> emailed
            </span>
          )}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={toggle}
          disabled={toggling}
          title={alert.active ? 'Pause alert' : 'Resume alert'}
          className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
        >
          {toggling
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : alert.active
              ? <ToggleRight className="h-5 w-5 text-blue-600" />
              : <ToggleLeft className="h-5 w-5" />
          }
        </button>
        <button
          onClick={del}
          disabled={deleting}
          title="Delete"
          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}

// ─── Add alert form ───────────────────────────────────────────────────────────

interface AddFormProps {
  onAdd: (alert: Alert) => void
  onClose: () => void
}

function AddAlertForm({ onAdd, onClose }: AddFormProps) {
  const [symbol, setSymbol] = useState('')
  const [exchange, setExchange] = useState<'NSE' | 'BSE'>('NSE')
  const [type, setType] = useState<AlertType>('PRICE_ABOVE')
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!symbol || !value) { setError('Symbol and threshold are required.'); return }
    const num = parseFloat(value)
    if (isNaN(num) || num <= 0) { setError('Enter a valid positive number.'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, exchange, type, value: num }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      onAdd(data as Alert)
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create alert')
    } finally {
      setSaving(false)
    }
  }

  const meta = TYPE_META[type]

  return (
    <div className="space-y-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
      <p className="text-sm font-semibold text-gray-800">New Price Alert</p>

      {/* Symbol + exchange */}
      <div className="flex gap-2">
        <Input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="e.g. RELIANCE"
          className="uppercase flex-1 h-9 text-sm"
        />
        <div className="flex gap-1 shrink-0">
          {(['NSE', 'BSE'] as const).map((ex) => (
            <button
              key={ex}
              onClick={() => setExchange(ex)}
              className={cn(
                'px-3 h-9 rounded-md text-xs font-medium border transition-colors',
                exchange === ex ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300',
              )}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Alert type */}
      <div className="grid grid-cols-3 gap-1.5">
        {(Object.keys(TYPE_META) as AlertType[]).map((t) => {
          const m = TYPE_META[t]
          const TIcon = m.icon
          return (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                'flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-xs font-medium transition-colors',
                type === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300',
              )}
            >
              <TIcon className="h-4 w-4" />
              {m.label}
            </button>
          )
        })}
      </div>

      {/* Threshold */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 font-medium w-6">{meta.prefix}</span>
        <Input
          type="number"
          min="0.01"
          step={type === 'PERCENT_CHANGE' ? '0.1' : '1'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={type === 'PERCENT_CHANGE' ? 'e.g. 5' : 'e.g. 3000'}
          className="flex-1 h-9 text-sm"
        />
        {meta.suffix && <span className="text-sm text-gray-500 font-medium">{meta.suffix}</span>}
      </div>

      {/* Helper text */}
      <p className="text-[11px] text-gray-500 flex items-center gap-1">
        <Info className="h-3 w-3" />
        {type === 'PRICE_ABOVE' && `Alert when ${symbol || 'stock'} price rises above ${meta.prefix}${value || '…'}`}
        {type === 'PRICE_BELOW' && `Alert when ${symbol || 'stock'} price falls below ${meta.prefix}${value || '…'}`}
        {type === 'PERCENT_CHANGE' && `Alert when ${symbol || 'stock'} moves more than ±${value || '…'}% in a day`}
      </p>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={submit} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
          Create Alert
        </Button>
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts')
      if (res.ok) setAlerts(await res.json())
    } catch {
      setError('Failed to load alerts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  function addAlert(alert: Alert) {
    setAlerts((prev) => [alert, ...prev])
  }

  function removeAlert(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }

  function toggleAlert(id: string, active: boolean) {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, active, triggered: active ? false : a.triggered } : a))
  }

  const active = alerts.filter((a) => a.active && !a.triggered)
  const triggered = alerts.filter((a) => a.triggered)
  const paused = alerts.filter((a) => !a.active)

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-600" />
            Price Alerts
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Get email notifications when stocks hit your price targets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAlerts}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-gray-100"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <Button size="sm" onClick={() => setShowForm(true)} disabled={showForm}>
            <Plus className="h-4 w-4 mr-1" /> New Alert
          </Button>
        </div>
      </div>

      {/* How it works */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
        <CardContent className="py-3 px-4">
          <div className="flex items-start gap-2 text-sm text-blue-800">
            <Mail className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Alerts are checked every 15 minutes during market hours (9:15 AM – 3:30 PM IST).
              You&apos;ll receive an email at <strong>{' '}your registered address</strong> when a threshold is crossed.
              Set <strong>RESEND_API_KEY</strong> in your environment to enable email delivery.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Add form */}
      {showForm && <AddAlertForm onAdd={addAlert} onClose={() => setShowForm(false)} />}

      {/* Free tier notice */}
      {alerts.filter((a) => a.active).length >= 5 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-3 px-4">
            <p className="text-sm text-amber-800 flex items-center gap-2">
              <Info className="h-4 w-4" />
              You&apos;ve reached the 5-alert free tier limit. Upgrade to Pro for unlimited alerts.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <Card>
          <CardContent className="py-8 flex items-center justify-center gap-2 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading alerts…</span>
          </CardContent>
        </Card>
      )}

      {/* Active alerts */}
      {!loading && active.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-600" />
              Active
              <Badge className="ml-1">{active.length}</Badge>
            </CardTitle>
            <CardDescription>Watching for price movements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-0.5">
              {active.map((a) => (
                <AlertRow key={a.id} alert={a} onDelete={removeAlert} onToggle={toggleAlert} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Triggered alerts */}
      {!loading && triggered.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-amber-600" />
              Triggered
              <Badge variant="warning" className="ml-1">{triggered.length}</Badge>
            </CardTitle>
            <CardDescription>These alerts fired — toggle them to re-arm</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-0.5">
              {triggered.map((a) => (
                <AlertRow key={a.id} alert={a} onDelete={removeAlert} onToggle={toggleAlert} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paused alerts */}
      {!loading && paused.length > 0 && (
        <Card className="opacity-70">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-gray-500">Paused ({paused.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0.5">
              {paused.map((a) => (
                <AlertRow key={a.id} alert={a} onDelete={removeAlert} onToggle={toggleAlert} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && alerts.length === 0 && !showForm && (
        <Card className="border-dashed">
          <CardContent className="py-14 flex flex-col items-center gap-4 text-center">
            <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center">
              <Bell className="h-7 w-7 text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-lg">No alerts yet</p>
              <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
                Create your first alert to get an email when a stock hits your target price or moves sharply.
              </p>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Create First Alert
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Weekly digest info */}
      <Card className="bg-gray-50 border-gray-100">
        <CardContent className="py-4 px-4">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-700">Weekly Market Digest</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Every Monday at 8:00 AM IST you&apos;ll receive a personalised digest with last week&apos;s market
                performance, your watchlist highlights, and a fresh AI-generated stock pick for the week.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
