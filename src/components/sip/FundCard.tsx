'use client'

import { ExternalLink, TrendingUp, ShieldCheck, Info } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SipAiRecommendation } from '@/app/api/sip/recommend/route'

const PRIORITY_STYLES: Record<string, string> = {
  Primary:   'bg-blue-600 text-white',
  Secondary: 'bg-purple-100 text-purple-800',
  Optional:  'bg-gray-100 text-gray-700',
}

const RISK_STYLES: Record<string, string> = {
  Low:      'text-green-700 bg-green-50',
  Moderate: 'text-amber-700 bg-amber-50',
  High:     'text-red-700 bg-red-50',
}

function ReturnBadge({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null
  return (
    <div className="text-center">
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className={cn('text-xs font-bold mt-0.5', value >= 0 ? 'text-green-600' : 'text-red-500')}>
        {value >= 0 ? '+' : ''}{value.toFixed(1)}%
      </p>
    </div>
  )
}

export function FundCard({ rec }: { rec: SipAiRecommendation }) {
  const { fund, reasoning, goalAlignment, suggestedSipAmount, priority } = rec

  const fmt = (n: number) =>
    n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return (
    <Card className={cn(
      'flex flex-col transition-shadow hover:shadow-md',
      priority === 'Primary' && 'ring-2 ring-blue-500 ring-offset-1',
    )}>
      <CardHeader className="pb-3 space-y-2">
        {/* Priority badge */}
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            'text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0',
            PRIORITY_STYLES[priority],
          )}>
            {priority === 'Primary' ? '★ Primary Pick' : priority}
          </span>
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', RISK_STYLES[fund.riskLevel])}>
            {fund.riskLevel} Risk
          </span>
        </div>

        {/* Fund name + AMC */}
        <div>
          <p className="font-bold text-gray-900 text-sm leading-tight">{fund.schemeName}</p>
          <p className="text-xs text-gray-500 mt-0.5">{fund.amc}</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            <Badge variant="outline" className="text-[10px] py-0">{fund.category}</Badge>
            <Badge variant="outline" className="text-[10px] py-0 text-gray-500">{fund.subCategory}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 flex-1">
        {/* Returns grid */}
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Historical Returns
          </p>
          <div className="grid grid-cols-3 divide-x divide-gray-200">
            <ReturnBadge label="1Y" value={fund.return1y} />
            <ReturnBadge label="3Y" value={fund.return3y} />
            <ReturnBadge label="5Y" value={fund.return5y} />
          </div>
        </div>

        {/* Expense + NAV + AUM */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { label: 'Expense Ratio', value: fund.expenseRatio != null ? `${fund.expenseRatio}%` : '—' },
            { label: 'NAV', value: `₹${fund.nav.toFixed(2)}` },
            { label: 'Min SIP', value: `₹${fmt(fund.minSipAmount)}/mo` },
            { label: 'AUM', value: fund.aum ? `₹${fmt(fund.aum)} Cr` : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-md px-2.5 py-1.5">
              <p className="text-[10px] text-gray-400">{label}</p>
              <p className="font-semibold text-gray-800 mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {/* Suggested SIP */}
        <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
          <span className="text-xs text-blue-700 font-medium">Suggested SIP</span>
          <span className="text-sm font-bold text-blue-800">₹{fmt(suggestedSipAmount)}/mo</span>
        </div>

        {/* Goal alignment */}
        <div className="flex items-start gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600">{goalAlignment}</p>
        </div>

        {/* AI reasoning */}
        <div className="flex items-start gap-1.5 bg-gray-50 rounded-lg p-2.5">
          <Info className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600 leading-relaxed">{reasoning}</p>
        </div>

        {/* Start SIP CTA */}
        <a
          href={fund.fundUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'mt-auto flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors',
            priority === 'Primary'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'border border-blue-600 text-blue-700 hover:bg-blue-50',
          )}
        >
          Start SIP
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </CardContent>
    </Card>
  )
}
