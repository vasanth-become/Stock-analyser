'use client'

import { useState } from 'react'
import { Loader2, Zap, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface AnalyseButtonProps {
  /** User's role from session — 'ADMIN' | 'USER' */
  role?: string
  /** User's plan from session — 'FREE' | 'PRO' | 'ENTERPRISE' */
  plan?: string
  /** Called when analysis is complete; receives the API response */
  onResult?: (result: unknown) => void
  /** Optional className for the button */
  className?: string
}

export function AnalyseButton({ role, plan, onResult, className }: AnalyseButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [remainingToday, setRemainingToday] = useState<number | null>(null)

  const isPaidUser = role === 'ADMIN' || plan === 'PRO' || plan === 'ENTERPRISE'

  async function handleAnalyse() {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/analyse', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 429) {
          setError(data.reason ?? 'Daily limit reached')
          setRemainingToday(0)
        } else if (res.status === 503) {
          setError(data.message ?? 'Service temporarily unavailable')
        } else {
          setError(data.error ?? 'Analysis failed')
        }
        return
      }

      if (typeof data.remainingToday === 'number') {
        setRemainingToday(data.remainingToday)
      }

      onResult?.(data)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        onClick={handleAnalyse}
        disabled={loading}
        className={className}
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" />Analysing…</>
        ) : (
          <><TrendingUp className="h-4 w-4 mr-2" />Run AI Analysis</>
        )}
      </Button>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Usage pill — only shown for free users */}
      {!isPaidUser && remainingToday !== null && (
        <UsagePill remaining={remainingToday} />
      )}
    </div>
  )
}

function UsagePill({ remaining }: { remaining: number }) {
  if (remaining >= 2) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-green-50 text-green-700 px-2.5 py-1 rounded-full">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        {remaining} {remaining === 1 ? 'analysis' : 'analyses'} remaining today
      </span>
    )
  }

  if (remaining === 1) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        1 analysis remaining today
      </span>
    )
  }

  return (
    <Link
      href="/pricing"
      className="inline-flex items-center gap-1.5 text-xs font-semibold bg-red-50 text-red-700 px-2.5 py-1 rounded-full hover:bg-red-100 transition-colors"
    >
      <Zap className="h-3 w-3" />
      0 analyses remaining — Upgrade to Pro
    </Link>
  )
}
