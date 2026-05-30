'use client'

import { useState, useEffect } from 'react'
import {
  Calculator, Sparkles, Loader2, AlertCircle, RefreshCw,
  TrendingUp, Info, ChevronDown, ChevronUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Disclaimer } from '@/components/ui/Disclaimer'
import { SipCalculator } from '@/components/sip/SipCalculator'
import { FundCard } from '@/components/sip/FundCard'
import type { SipAiRecommendation } from '@/app/api/sip/recommend/route'

interface RecoResponse {
  recommendations: SipAiRecommendation[]
  strategy: string
  disclaimer: string
  totalSip: number
}

export default function SipPlannerPage() {
  const [profile, setProfile] = useState<{ sipBudget: number | null; riskTolerance: string } | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  const [recos, setRecos] = useState<RecoResponse | null>(null)
  const [recoLoading, setRecoLoading] = useState(false)
  const [recoError, setRecoError] = useState('')
  const [showStrategy, setShowStrategy] = useState(true)

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) setProfile({ sipBudget: d.sipBudget ?? null, riskTolerance: d.riskTolerance })
      })
      .catch(() => null)
      .finally(() => setProfileLoading(false))
  }, [])

  async function fetchRecos() {
    setRecoLoading(true)
    setRecoError('')
    try {
      const res = await fetch('/api/sip/recommend')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load research')
      setRecos(data as RecoResponse)
    } catch (e: unknown) {
      setRecoError(e instanceof Error ? e.message : 'Failed to load research')
    } finally {
      setRecoLoading(false)
    }
  }

  const defaultAmount = profile?.sipBudget ?? 5000

  return (
    <div className="space-y-8 max-w-6xl">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calculator className="h-6 w-6 text-blue-600" />
          SIP Research Planner
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Calculate SIP projections and get AI-researched mutual fund analysis for your goals
        </p>
      </div>

      {/* ── SIP Calculator ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">SIP Calculator</h2>
        </div>
        {!profileLoading && (
          <SipCalculator defaultAmount={defaultAmount} />
        )}
        {profileLoading && (
          <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
        )}
        <p className="text-xs text-gray-400 mt-3">
          Projections shown are illustrative estimates based on assumed rates of return. Actual returns will vary based on market conditions and fund performance.
        </p>
      </section>

      {/* ── PRIYA Research Output section ── */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">PRIYA Research Output — Mutual Fund Analysis</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                AI-researched mutual fund analysis based on your investor profile
              </p>
            </div>
          </div>
          <Button
            onClick={fetchRecos}
            disabled={recoLoading}
            size="sm"
            className="shrink-0"
          >
            {recoLoading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analysing…</>
              : recos
                ? <><RefreshCw className="mr-2 h-4 w-4" />Refresh Research</>
                : <><Sparkles className="mr-2 h-4 w-4" />Run Fund Research</>
            }
          </Button>
        </div>

        {/* Error */}
        {recoError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-3 px-4">
              <p className="text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {recoError}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {recoLoading && (
          <Card>
            <CardContent className="py-12 flex flex-col items-center gap-4">
              <div className="relative h-14 w-14">
                <div className="absolute inset-0 rounded-full border-4 border-blue-100 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-blue-400 animate-pulse" />
                </div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-800">PRIYA is analysing funds for your profile…</p>
                <p className="text-sm text-gray-500 mt-1">Matching your risk profile to mutual fund research data</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {!recoLoading && recos && (
          <>
            {/* Strategy banner */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-100">
              <CardHeader className="pb-2">
                <button
                  onClick={() => setShowStrategy((v) => !v)}
                  className="flex items-center justify-between w-full"
                >
                  <CardTitle className="text-sm text-blue-800 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" />
                    Research Strategy
                  </CardTitle>
                  {showStrategy
                    ? <ChevronUp className="h-4 w-4 text-blue-500" />
                    : <ChevronDown className="h-4 w-4 text-blue-500" />}
                </button>
              </CardHeader>
              {showStrategy && (
                <CardContent className="pt-0 pb-3">
                  <p className="text-sm text-blue-900 leading-relaxed">{recos.strategy}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-blue-700">
                    <span>Total suggested SIP: <strong>₹{recos.totalSip.toLocaleString('en-IN')}/month</strong></span>
                    <span>{recos.recommendations.length} funds in research output</span>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Fund cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recos.recommendations.map((rec, i) => (
                <FundCard key={`${rec.schemeCode}-${i}`} rec={rec} />
              ))}
            </div>

            {/* Disclaimer */}
            <Card className="border-amber-100 bg-amber-50">
              <CardContent className="py-3 px-4">
                <p className="text-xs text-amber-800 flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  {recos.disclaimer} Mutual fund investments are subject to market risks. Please read all scheme-related documents carefully before investing. Past returns are not indicative of future performance.
                </p>
              </CardContent>
            </Card>

            {/* Inline disclaimer */}
            <div className="border-t pt-3">
              <Disclaimer variant="inline" />
            </div>
          </>
        )}

        {/* Empty state */}
        {!recoLoading && !recos && !recoError && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base text-gray-700">Get Personalised Fund Research</CardTitle>
              <CardDescription>
                Click &quot;Run Fund Research&quot; to let PRIYA analyse your investor profile and
                surface mutual fund research aligned to your goals and risk tolerance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-3 text-sm text-gray-600">
                {[
                  { icon: '🎯', label: 'Goal-aligned research', desc: 'Matched to your wealth/tax/income goals' },
                  { icon: '🛡️', label: 'Risk-calibrated', desc: 'Filtered for your Conservative/Moderate/Aggressive profile' },
                  { icon: '📊', label: 'Data-backed', desc: '1Y/3Y/5Y returns, expense ratio, AUM' },
                ].map(({ icon, label, desc }) => (
                  <div key={label} className="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
                    <span className="text-lg">{icon}</span>
                    <div>
                      <p className="font-medium text-gray-800">{label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── Fund glossary ── */}
      <section>
        <details className="group">
          <summary className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-500 hover:text-gray-800 transition-colors list-none">
            <ChevronDown className="h-4 w-4 group-open:rotate-180 transition-transform" />
            Understanding mutual fund terms
          </summary>
          <div className="mt-3 grid sm:grid-cols-2 gap-3">
            {[
              { term: 'NAV', def: 'Net Asset Value — the per-unit price of the fund.' },
              { term: 'Expense Ratio', def: 'Annual fee charged by the AMC as a % of AUM. Lower is better.' },
              { term: 'AUM', def: 'Assets Under Management — total money managed by the fund.' },
              { term: 'CAGR', def: 'Compound Annual Growth Rate — annualised return over a period.' },
              { term: 'ELSS', def: 'Equity Linked Savings Scheme — tax-saving MF with 3-year lock-in under Sec 80C.' },
              { term: 'Direct Plan', def: 'No distributor commission — lower expense ratio vs Regular plans.' },
            ].map(({ term, def }) => (
              <div key={term} className="bg-gray-50 rounded-lg px-3 py-2.5 text-xs">
                <span className="font-semibold text-gray-800">{term}: </span>
                <span className="text-gray-600">{def}</span>
              </div>
            ))}
          </div>
        </details>
      </section>
    </div>
  )
}
