'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Target, Loader2, Sparkles, TrendingUp, Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GoalRing } from '@/components/goals/GoalRing'
import type { GoalProjection } from '@/lib/goalClock/goalCalculator'

interface GoalWithProjection {
  id: string
  name: string
  emoji: string
  goalType: string
  targetAmount: number
  targetDate: string
  currentCorpus: number
  monthlySIP: number
  isPrimary: boolean
  projection: GoalProjection
}

function fmtINR(n: number): string {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalWithProjection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/goals')
      .then((r) => r.ok ? r.json() : [])
      .then(setGoals)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const primary = goals.find((g) => g.isPrimary) ?? goals[0]
  const secondary = goals.filter((g) => g.id !== primary?.id)

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  )

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="h-6 w-6 text-blue-600" />
            Goal Clock
          </h1>
          <p className="text-gray-500 text-sm mt-1">Track your financial goals — live, visual, emotionally real</p>
        </div>
        <Link href="/goals/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Goal
          </Button>
        </Link>
      </div>

      {goals.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
            <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center">
              <Target className="h-8 w-8 text-blue-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-800">No goals yet</p>
              <p className="text-sm text-gray-500 mt-1 max-w-sm">Create your first financial goal — college fund, home, retirement — and watch the Goal Clock count you down.</p>
            </div>
            <Link href="/goals/new">
              <Button className="gap-2 mt-2">
                <Plus className="h-4 w-4" />
                Create my first goal
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Primary Goal Clock */}
          {primary && (
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8">
                  <div className="flex flex-col lg:flex-row gap-8 items-center">
                    {/* Ring */}
                    <GoalRing
                      percent={primary.projection.percentComplete}
                      emoji={primary.emoji}
                      name={primary.name}
                      currentCorpus={primary.currentCorpus}
                      targetAmount={primary.targetAmount}
                      onTrack={primary.projection.onTrack}
                      monthsRemaining={primary.projection.monthsRemaining}
                      size="lg"
                    />

                    {/* Metrics */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <h2 className="text-xl font-extrabold text-gray-900">{primary.name}</h2>
                        <p className="text-gray-500 text-sm capitalize">{primary.goalType} goal</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Monthly SIP', value: fmtINR(primary.monthlySIP), icon: TrendingUp },
                          { label: 'Target Date', value: new Date(primary.targetDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }), icon: Calendar },
                          { label: 'Projected Corpus', value: fmtINR(primary.projection.projectedCorpus), icon: Sparkles },
                          { label: 'Expected Rate', value: `${primary.monthlySIP > 0 ? '12' : '—'}% p.a.`, icon: TrendingUp },
                        ].map(({ label, value }) => (
                          <div key={label} className="bg-white rounded-xl p-3 border border-gray-100">
                            <p className="text-xs text-gray-500">{label}</p>
                            <p className="text-sm font-bold text-gray-900 mt-0.5">{value}</p>
                          </div>
                        ))}
                      </div>

                      {/* AI Insight box */}
                      {primary.projection.sipGap > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                          <p className="text-xs font-semibold text-blue-600 mb-1">💡 ARIA Insight</p>
                          <p className="text-sm text-blue-900">
                            Increase SIP by {fmtINR(primary.projection.sipGap)}/month to close the {fmtINR(primary.projection.projectedShortfall)} shortfall.
                          </p>
                          <p className="text-xs text-blue-600 mt-1.5">
                            Or a 10% annual step-up adds {fmtINR(primary.projection.stepUpImpact.extraCorpus)} extra.
                          </p>
                        </div>
                      )}
                      {primary.projection.onTrack && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                          <p className="text-xs font-semibold text-green-700 mb-1">✅ ARIA Insight</p>
                          <p className="text-sm text-green-800">You're on track! Keep your SIP going and you'll hit {fmtINR(primary.targetAmount)} by {new Date(primary.targetDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}.</p>
                        </div>
                      )}

                      <Link href={`/goals/${primary.id}`}>
                        <Button variant="outline" className="w-full mt-2">View full Goal Clock →</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Secondary goals grid */}
          {secondary.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Other Goals</h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {secondary.map((g) => (
                  <Link key={g.id} href={`/goals/${g.id}`}>
                    <Card className="hover:shadow-md hover:border-blue-200 transition-all cursor-pointer">
                      <CardContent className="p-4 flex flex-col items-center gap-3">
                        <GoalRing
                          percent={g.projection.percentComplete}
                          emoji={g.emoji}
                          name={g.name}
                          currentCorpus={g.currentCorpus}
                          targetAmount={g.targetAmount}
                          onTrack={g.projection.onTrack}
                          monthsRemaining={g.projection.monthsRemaining}
                          size="sm"
                        />
                        <div className="text-center">
                          <p className="text-sm font-bold text-gray-900 truncate max-w-[140px]">{g.name}</p>
                          <Badge variant={g.projection.onTrack ? 'success' : 'outline'} className="text-[10px] mt-1">
                            {g.projection.onTrack ? 'On track' : 'Behind'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
                <Link href="/goals/new">
                  <Card className="hover:shadow-md border-dashed border-2 cursor-pointer h-full flex items-center justify-center min-h-[160px]">
                    <CardContent className="flex flex-col items-center gap-2 text-gray-400 p-4">
                      <Plus className="h-8 w-8" />
                      <p className="text-sm font-medium">Add goal</p>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
