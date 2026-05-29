'use client'

import { useState, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { calculateSip, fmtCrL } from '@/lib/sipCalc'
import { cn } from '@/lib/utils'

interface Props {
  defaultAmount?: number
}

interface TooltipPayload {
  dataKey: string
  value: number
  color: string
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string | number
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">Year {label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.dataKey === 'invested' ? 'Invested' : p.dataKey === 'value' ? 'Value' : 'Gain'}:{' '}
          <span className="font-semibold">{fmtCrL(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

function Slider({
  label, value, min, max, step, unit, onChange, format,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (v: number) => void
  format?: (v: number) => string
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-600 font-medium">{label}</label>
        <span className="text-sm font-bold text-blue-700">
          {format ? format(value) : `${value.toLocaleString('en-IN')} ${unit}`}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gray-200"
          style={{
            background: `linear-gradient(to right, #2563eb ${pct}%, #e5e7eb ${pct}%)`,
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>{format ? format(min) : `${min.toLocaleString('en-IN')} ${unit}`}</span>
        <span>{format ? format(max) : `${max.toLocaleString('en-IN')} ${unit}`}</span>
      </div>
    </div>
  )
}

export function SipCalculator({ defaultAmount = 5000 }: Props) {
  const [monthly, setMonthly] = useState(defaultAmount)
  const [returnPct, setReturnPct] = useState(12)
  const [years, setYears] = useState(10)
  const [inputMode, setInputMode] = useState(false)
  const [inputVal, setInputVal] = useState(String(defaultAmount))

  const result = useMemo(
    () => calculateSip(monthly, returnPct, years),
    [monthly, returnPct, years],
  )

  const gainUp = result.totalGain >= 0

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="grid sm:grid-cols-3 gap-5 bg-gray-50 rounded-xl p-4 border">
        {/* Monthly amount — input + slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-600 font-medium">Monthly SIP</label>
            <span className="text-sm font-bold text-blue-700">
              ₹{monthly.toLocaleString('en-IN')}
            </span>
          </div>
          {inputMode ? (
            <div className="flex gap-1">
              <Input
                autoFocus
                type="number"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onBlur={() => {
                  const v = Math.max(500, Math.min(200000, Number(inputVal) || monthly))
                  setMonthly(v)
                  setInputVal(String(v))
                  setInputMode(false)
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                className="h-8 text-sm"
              />
            </div>
          ) : (
            <div
              className="relative cursor-pointer"
              onDoubleClick={() => { setInputMode(true); setInputVal(String(monthly)) }}
            >
              <input
                type="range"
                min={500}
                max={200000}
                step={500}
                value={monthly}
                onChange={(e) => setMonthly(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gray-200"
                style={{
                  background: `linear-gradient(to right, #2563eb ${((monthly - 500) / (200000 - 500)) * 100}%, #e5e7eb ${((monthly - 500) / (200000 - 500)) * 100}%)`,
                }}
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>₹500</span>
                <span className="text-[9px]">dbl-click to type</span>
                <span>₹2L</span>
              </div>
            </div>
          )}
        </div>

        <Slider
          label="Expected Return"
          value={returnPct}
          min={4}
          max={30}
          step={0.5}
          unit=""
          onChange={setReturnPct}
          format={(v) => `${v}% p.a.`}
        />

        <Slider
          label="Tenure"
          value={years}
          min={1}
          max={40}
          step={1}
          unit=""
          onChange={setYears}
          format={(v) => `${v} yr${v !== 1 ? 's' : ''}`}
        />
      </div>

      {/* Result summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Maturity Value', value: fmtCrL(result.maturityValue), color: 'text-blue-700', highlight: true },
          { label: 'Total Invested', value: fmtCrL(result.totalInvested), color: 'text-gray-800', highlight: false },
          {
            label: 'Total Gain',
            value: `${gainUp ? '+' : ''}${fmtCrL(result.totalGain)}`,
            color: gainUp ? 'text-green-600' : 'text-red-600',
            highlight: false,
          },
          { label: 'CAGR', value: `${result.cagr.toFixed(1)}%`, color: 'text-purple-700', highlight: false },
        ].map(({ label, value, color, highlight }) => (
          <div
            key={label}
            className={cn(
              'rounded-xl p-3 text-center',
              highlight ? 'bg-blue-600 text-white' : 'bg-gray-50 border',
            )}
          >
            <p className={cn('text-[10px] uppercase tracking-wide', highlight ? 'text-blue-100' : 'text-gray-500')}>
              {label}
            </p>
            <p className={cn('text-base font-bold mt-0.5', highlight ? 'text-white' : color)}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Growth chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-700">Portfolio Growth Over {years} Year{years !== 1 ? 's' : ''}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-4 px-2">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={result.yearlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradInvested" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#9ca3af" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickFormatter={(v) => `Yr ${v}`}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickFormatter={(v) => fmtCrL(v).replace('₹', '')}
                width={52}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area
                type="monotone"
                dataKey="invested"
                name="Invested"
                stroke="#9ca3af"
                strokeWidth={1.5}
                fill="url(#gradInvested)"
              />
              <Area
                type="monotone"
                dataKey="value"
                name="Value"
                stroke="#2563eb"
                strokeWidth={2}
                fill="url(#gradValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
