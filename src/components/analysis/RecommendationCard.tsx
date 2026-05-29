'use client'

import { TrendingUp, TrendingDown, Target, ShieldAlert, Info } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Recommendation } from '@/lib/analysisEngine'

interface Props {
  rec: Recommendation
}

const TYPE_COLORS: Record<string, string> = {
  Stock: 'bg-blue-50 text-blue-700 border-blue-200',
  SIP: 'bg-purple-50 text-purple-700 border-purple-200',
  ETF: 'bg-amber-50 text-amber-700 border-amber-200',
  ELSS: 'bg-green-50 text-green-700 border-green-200',
}

const RISK_COLORS: Record<string, string> = {
  Low: 'text-green-600',
  Moderate: 'text-amber-600',
  High: 'text-red-600',
}

function ConfidenceRing({ score }: { score: number }) {
  const r = 20
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 75 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626'

  return (
    <div className="relative flex items-center justify-center w-14 h-14">
      <svg width="56" height="56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} stroke="#e5e7eb" strokeWidth="4" fill="none" />
        <circle
          cx="28" cy="28" r={r}
          stroke={color}
          strokeWidth="4"
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color }}>{score}</span>
    </div>
  )
}

export function RecommendationCard({ rec }: Props) {
  const fmt = (n: number) =>
    n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-bold text-gray-900 truncate">{rec.name}</span>
              <Badge variant="outline" className={cn('text-[10px] shrink-0', TYPE_COLORS[rec.type])}>
                {rec.type}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{rec.ticker} · {rec.sector}</p>
          </div>
          <ConfidenceRing score={rec.confidenceScore} />
        </div>

        <div className="flex flex-wrap gap-1.5 mt-2">
          {rec.tags.map((tag) => (
            <span key={tag} className="text-[10px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">
              {tag}
            </span>
          ))}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 gap-4">
        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Expected</p>
            <p className="text-xs font-semibold text-green-600 mt-0.5">{rec.expectedReturn}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Risk</p>
            <p className={cn('text-xs font-semibold mt-0.5', RISK_COLORS[rec.riskLevel])}>
              {rec.riskLevel}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Cap</p>
            <p className="text-xs font-semibold text-gray-700 mt-0.5">{rec.marketCap}</p>
          </div>
        </div>

        {/* Suggested amount */}
        <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
          <span className="text-xs text-blue-700 font-medium">
            {rec.type === 'SIP' ? 'Monthly SIP' : 'Invest'}
          </span>
          <span className="text-sm font-bold text-blue-800">₹{fmt(rec.suggestedAmount)}</span>
        </div>

        {/* Price levels */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-gray-500">
              <Target className="h-3 w-3" /> Buy Zone
            </span>
            <span className="font-medium text-gray-800">
              ₹{fmt(rec.buyZone.low)} – ₹{fmt(rec.buyZone.high)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-green-600">
              <TrendingUp className="h-3 w-3" /> Target
            </span>
            <span className="font-semibold text-green-600">₹{fmt(rec.targetPrice)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-red-500">
              <TrendingDown className="h-3 w-3" /> Stop Loss
            </span>
            <span className="font-semibold text-red-500">₹{fmt(rec.stopLoss)}</span>
          </div>
          {rec.pe && (
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-gray-500">
                <Info className="h-3 w-3" /> P/E
              </span>
              <span className="font-medium text-gray-700">{rec.pe.toFixed(1)}x</span>
            </div>
          )}
        </div>

        {/* Reasoning */}
        <div className="flex gap-2 bg-gray-50 rounded-lg p-3 mt-auto">
          <ShieldAlert className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600 leading-relaxed">{rec.reasoning}</p>
        </div>
      </CardContent>
    </Card>
  )
}
