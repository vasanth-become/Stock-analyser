'use client'

import { useState } from 'react'
import { Bell, Plus, Trash2, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const defaultAlerts = [
  { id: '1', symbol: 'RELIANCE', type: 'PRICE_ABOVE', value: 3000, triggered: false, exchange: 'NSE' },
  { id: '2', symbol: 'TCS', type: 'PRICE_BELOW', value: 3500, triggered: false, exchange: 'NSE' },
  { id: '3', symbol: 'HDFCBANK', type: 'PERCENT_CHANGE', value: 5, triggered: true, exchange: 'NSE' },
]

const alertTypeLabels: Record<string, string> = {
  PRICE_ABOVE: 'Price Above',
  PRICE_BELOW: 'Price Below',
  PERCENT_CHANGE: '% Change',
  VOLUME_SPIKE: 'Volume Spike',
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(defaultAlerts)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ symbol: '', type: 'PRICE_ABOVE', value: '' })

  function addAlert() {
    if (!form.symbol || !form.value) return
    setAlerts([...alerts, {
      id: Date.now().toString(),
      symbol: form.symbol.toUpperCase(),
      type: form.type,
      value: Number(form.value),
      triggered: false,
      exchange: 'NSE',
    }])
    setForm({ symbol: '', type: 'PRICE_ABOVE', value: '' })
    setShowAdd(false)
  }

  function deleteAlert(id: string) {
    setAlerts(alerts.filter((a) => a.id !== id))
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-600" />
            Price Alerts
          </h1>
          <p className="text-gray-500 text-sm mt-1">Get notified when stocks hit your targets</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4 mr-1" /> New Alert
        </Button>
      </div>

      {showAdd && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-base">Create New Alert</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Input
                placeholder="Symbol (e.g. INFY)"
                value={form.symbol}
                onChange={(e) => setForm({ ...form, symbol: e.target.value })}
              />
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="PRICE_ABOVE">Price Above</option>
                <option value="PRICE_BELOW">Price Below</option>
                <option value="PERCENT_CHANGE">% Change</option>
                <option value="VOLUME_SPIKE">Volume Spike</option>
              </select>
              <Input
                type="number"
                placeholder="Value (₹ or %)"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={addAlert}>Create Alert</Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
          <CardDescription>{alerts.filter((a) => !a.triggered).length} active, {alerts.filter((a) => a.triggered).length} triggered</CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No alerts set. Create one above.</p>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${alert.triggered ? 'border-green-200 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-3">
                    {alert.triggered ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Bell className="h-5 w-5 text-blue-500" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{alert.symbol}</p>
                        <Badge variant="outline">{alert.exchange}</Badge>
                        {alert.triggered && <Badge variant="success">Triggered</Badge>}
                      </div>
                      <p className="text-sm text-gray-600">
                        {alertTypeLabels[alert.type]}: {alert.type === 'PERCENT_CHANGE' ? `${alert.value}%` : `₹${alert.value}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1 ml-4"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
