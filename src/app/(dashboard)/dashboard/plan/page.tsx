'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import GoalsPage from '../../goals/page'
import SipPlannerPage from '../../sip-planner/page'
import ReportsPage from '../../reports/page'

type Tab = 'goals' | 'sip' | 'reports'

const TABS: { id: Tab; label: string }[] = [
  { id: 'goals', label: 'Goals' },
  { id: 'sip', label: 'SIP Planner' },
  { id: 'reports', label: 'Reports' },
]

interface PrimaryGoal {
  name: string
  progressPct: number
}

function GoalSkeleton() {
  return (
    <div className="flex flex-col gap-1 animate-pulse">
      <div className="h-3 w-40 bg-gray-200 rounded" />
      <div className="h-2 w-32 bg-gray-300 rounded-full mt-1" />
    </div>
  )
}

function HeaderGoal() {
  const [goal, setGoal] = useState<PrimaryGoal | null | undefined>(undefined) // undefined = loading

  useEffect(() => {
    fetch('/api/goals?primary=true')
      .then((r) => r.json())
      .then((data) => {
        if (data?.name) {
          setGoal({ name: data.name, progressPct: data.progressPct ?? 0 })
        } else {
          setGoal(null)
        }
      })
      .catch(() => setGoal(null))
  }, [])

  if (goal === undefined) {
    return <GoalSkeleton />
  }

  if (goal === null) {
    return (
      <p className="text-sm text-gray-500 italic">Your primary financial goal</p>
    )
  }

  const pct = Math.min(100, Math.max(0, Math.round(goal.progressPct)))

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-700">{goal.name}</span>
      <div className="flex items-center gap-2">
        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-gray-500">{pct}%</span>
      </div>
    </div>
  )
}

function PlanInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const rawTab = searchParams.get('tab') as Tab | null
  const activeTab: Tab = TABS.some((t) => t.id === rawTab) ? (rawTab as Tab) : 'goals'

  const handleTabClick = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Shared header strip */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-xl font-bold text-gray-900">Plan</h1>
          <HeaderGoal />
        </div>

        {/* Tab navigation */}
        <div className="mt-4 flex gap-0 border-b border-gray-200 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors focus:outline-none',
                activeTab === tab.id
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1">
        {activeTab === 'goals' && <GoalsPage />}
        {activeTab === 'sip' && <SipPlannerPage />}
        {activeTab === 'reports' && <ReportsPage />}
      </div>
    </div>
  )
}

export default function PlanPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading…</div>}>
      <PlanInner />
    </Suspense>
  )
}
