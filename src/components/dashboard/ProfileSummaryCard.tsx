import Link from 'next/link'
import { ArrowRight, ShieldCheck, Target, LayoutGrid, IndianRupee, Clock, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RiskGauge } from '@/components/ui/gauge'
import type { InvestorProfile } from '@prisma/client'

const RISK_COLOURS = {
  CONSERVATIVE: 'bg-blue-100 text-blue-700',
  MODERATE:     'bg-green-100 text-green-700',
  AGGRESSIVE:   'bg-orange-100 text-orange-700',
}

const HORIZON_LABELS: Record<string, string> = {
  SHORT_TERM:  '< 1 Year',
  MEDIUM_TERM: '1–5 Years',
  LONG_TERM:   '5+ Years',
}

const GOAL_LABELS: Record<string, string> = {
  wealth_creation: 'Wealth Creation',
  retirement:      'Retirement',
  child_education: 'Child Education',
  tax_saving:      'Tax Saving',
  regular_income:  'Regular Income',
  short_term:      'Short-term Gains',
}

function scoreToPercent(score: number) {
  return Math.round(((score - 10) / 40) * 100)
}

export function ProfileSummaryCard({ profile }: { profile: InvestorProfile | null }) {
  if (!profile) {
    return (
      <Card className="border-dashed border-blue-200 bg-blue-50/40">
        <CardContent className="p-6 flex flex-col items-center text-center gap-3">
          <AlertCircle className="h-8 w-8 text-blue-400" />
          <div>
            <p className="font-semibold text-gray-800">Complete your investor profile</p>
            <p className="text-sm text-gray-500 mt-1">
              Get personalised stock recommendations and AI analysis tailored to your risk appetite.
            </p>
          </div>
          <Link href="/profile">
            <Button size="sm" className="gap-1 mt-1">
              Set Up Profile <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  const gaugeValue = profile.riskScore ? scoreToPercent(profile.riskScore) : 50
  const isIncomplete =
    !profile.riskScore || profile.investmentGoals.length === 0 || !profile.investmentHorizon

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            Investor Profile
          </CardTitle>
          <Link href="/profile">
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 gap-1 h-8 text-xs">
              Edit preferences <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isIncomplete && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            Profile incomplete — some preferences are missing.
            <Link href="/profile" className="underline font-medium">Complete now</Link>
          </div>
        )}

        {/* Risk gauge */}
        <div className="flex items-center gap-4">
          <RiskGauge value={gaugeValue} size={120} />
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-500">Risk Tolerance</p>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold mt-0.5 ${RISK_COLOURS[profile.riskTolerance]}`}>
                {profile.riskTolerance}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500">Experience</p>
              <p className="text-sm font-medium text-gray-900 capitalize">{profile.experience.toLowerCase()}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Goals */}
          <div className="rounded-lg bg-gray-50 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <Target className="h-3.5 w-3.5" /> Goals
            </div>
            <div className="flex flex-wrap gap-1">
              {profile.investmentGoals.slice(0, 3).map((g) => (
                <Badge key={g} variant="secondary" className="text-[10px] py-0">
                  {GOAL_LABELS[g] ?? g}
                </Badge>
              ))}
              {profile.investmentGoals.length > 3 && (
                <Badge variant="outline" className="text-[10px] py-0">
                  +{profile.investmentGoals.length - 3}
                </Badge>
              )}
            </div>
          </div>

          {/* Sectors */}
          <div className="rounded-lg bg-gray-50 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <LayoutGrid className="h-3.5 w-3.5" /> Sectors
            </div>
            <div className="flex flex-wrap gap-1">
              {profile.sectorPreferences.slice(0, 3).map((s) => (
                <Badge key={s} variant="secondary" className="text-[10px] py-0">
                  {s}
                </Badge>
              ))}
              {profile.sectorPreferences.length > 3 && (
                <Badge variant="outline" className="text-[10px] py-0">
                  +{profile.sectorPreferences.length - 3}
                </Badge>
              )}
            </div>
          </div>

          {/* SIP */}
          <div className="rounded-lg bg-gray-50 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <IndianRupee className="h-3.5 w-3.5" /> Monthly SIP
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {profile.sipBudget
                ? `₹${profile.sipBudget.toLocaleString('en-IN')}`
                : <span className="text-gray-400 font-normal text-xs">Not set</span>}
            </p>
          </div>

          {/* Horizon */}
          <div className="rounded-lg bg-gray-50 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <Clock className="h-3.5 w-3.5" /> Horizon
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {profile.investmentHorizon
                ? HORIZON_LABELS[profile.investmentHorizon]
                : <span className="text-gray-400 font-normal text-xs">Not set</span>}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
