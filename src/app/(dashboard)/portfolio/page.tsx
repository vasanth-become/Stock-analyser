'use client'

import { useState } from 'react'
import { BriefcaseBusiness, Plus, TrendingUp, TrendingDown, IndianRupee } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const defaultHoldings = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', qty: 10, avgPrice: 2450, currentPrice: 2834.50, exchange: 'NSE' },
  { symbol: 'TCS', name: 'Tata Consultancy Services', qty: 5, avgPrice: 3500, currentPrice: 3921.75, exchange: 'NSE' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', qty: 20, avgPrice: 1600, currentPrice: 1567.20, exchange: 'NSE' },
  { symbol: 'INFY', name: 'Infosys', qty: 15, avgPrice: 1600, currentPrice: 1789.90, exchange: 'NSE' },
]

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState(defaultHoldings)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ symbol: '', qty: '', price: '' })

  const totalInvested = holdings.reduce((sum, h) => sum + h.qty * h.avgPrice, 0)
  const totalValue = holdings.reduce((sum, h) => sum + h.qty * h.currentPrice, 0)
  const totalGain = totalValue - totalInvested
  const totalGainPct = (totalGain / totalInvested) * 100

  function addHolding() {
    if (!form.symbol || !form.qty || !form.price) return
    const sym = form.symbol.toUpperCase()
    const existing = holdings.find((h) => h.symbol === sym)
    if (existing) {
      setHoldings(holdings.map((h) =>
        h.symbol === sym ? { ...h, qty: h.qty + Number(form.qty) } : h
      ))
    } else {
      setHoldings([...holdings, {
        symbol: sym,
        name: `${sym} Limited`,
        qty: Number(form.qty),
        avgPrice: Number(form.price),
        currentPrice: Number(form.price) * (1 + (Math.random() - 0.3) * 0.2),
        exchange: 'NSE',
      }])
    }
    setForm({ symbol: '', qty: '', price: '' })
    setShowAdd(false)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BriefcaseBusiness className="h-6 w-6 text-blue-600" />
            Portfolio
          </h1>
          <p className="text-gray-500 text-sm mt-1">Track your investments</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4 mr-1" /> Add Holding
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Value', value: `₹${totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: 'text-gray-900' },
          { label: 'Invested', value: `₹${totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: 'text-gray-900' },
          { label: 'Total Gain', value: `${totalGain >= 0 ? '+' : ''}₹${Math.abs(totalGain).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: totalGain >= 0 ? 'text-green-600' : 'text-red-600' },
          { label: 'Returns', value: `${totalGainPct >= 0 ? '+' : ''}${totalGainPct.toFixed(2)}%`, color: totalGainPct >= 0 ? 'text-green-600' : 'text-red-600' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-lg font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {showAdd && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-base">Add New Holding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <Input
                placeholder="Symbol (e.g. TCS)"
                value={form.symbol}
                onChange={(e) => setForm({ ...form, symbol: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Quantity"
                value={form.qty}
                onChange={(e) => setForm({ ...form, qty: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Avg. Buy Price (₹)"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div className="flex gap-3 mt-3">
              <Button onClick={addHolding}>Add Holding</Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-blue-600" />
            Holdings
          </CardTitle>
          <CardDescription>{holdings.length} stocks in portfolio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Stock</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">Qty</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">Avg Price</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">Current</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">Value</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">Gain/Loss</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => {
                  const invested = h.qty * h.avgPrice
                  const value = h.qty * h.currentPrice
                  const gain = value - invested
                  const gainPct = (gain / invested) * 100
                  return (
                    <tr key={h.symbol} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-3">
                        <p className="font-semibold text-gray-900">{h.symbol}</p>
                        <p className="text-xs text-gray-500">{h.name}</p>
                      </td>
                      <td className="py-3 px-3 text-right text-gray-900">{h.qty}</td>
                      <td className="py-3 px-3 text-right text-gray-600">₹{h.avgPrice.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-right font-medium text-gray-900">₹{h.currentPrice.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right font-semibold text-gray-900">₹{value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                      <td className="py-3 px-3 text-right">
                        <div className={`flex items-center gap-1 justify-end font-medium ${gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {gain >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                          <div>
                            <div>{gain >= 0 ? '+' : ''}₹{Math.abs(gain).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                            <div className="text-xs">({gainPct >= 0 ? '+' : ''}{gainPct.toFixed(2)}%)</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
