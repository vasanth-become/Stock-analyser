'use client'

import { useEffect, useState } from 'react'
import { Zap, CreditCard, AlertTriangle, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlanBadge } from '@/components/subscription/PlanBadge'
import { UpgradeModal } from '@/components/subscription/UpgradeModal'

interface Invoice {
  id: string
  date: string
  amount: string | null
  status: string
  plan: string
}

interface BillingData {
  currentPlan: string
  subscriptionStatus: string | null
  billingCycle: string | null
  planExpiresAt: string | null
  isPro: boolean
  limits: Record<string, number | boolean>
  prices: {
    monthly: { amount: string; period: string }
    yearly: { amount: string; period: string; savings: string }
  }
  invoices: Invoice[]
}

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [cancelSuccess, setCancelSuccess] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)

  async function load() {
    const res = await fetch('/api/billing')
    if (res.ok) setData(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCancel() {
    if (!confirm('Cancel your Pro subscription? You keep access until the current period ends.')) return
    setCancelling(true)
    setCancelError('')
    const res = await fetch('/api/subscription', { method: 'DELETE' })
    if (res.ok) {
      setCancelSuccess(true)
      await load()
    } else {
      const d = await res.json()
      setCancelError(d.error ?? 'Failed to cancel subscription')
    }
    setCancelling(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!data) return null

  const expiresDate = data.planExpiresAt
    ? new Date(data.planExpiresAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  const isCancelled = data.subscriptionStatus === 'CANCELLED'

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your plan and view payment history.</p>
      </div>

      {/* Current plan card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Current plan</p>
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold text-gray-900">{data.isPro ? 'Pro' : 'Free'}</p>
              <PlanBadge plan={data.currentPlan} />
            </div>

            {data.isPro && data.billingCycle && (
              <p className="text-sm text-gray-500 mt-1">
                Billed {data.billingCycle === 'YEARLY' ? 'annually' : 'monthly'}
                {expiresDate && (
                  <span className="ml-1">
                    · {isCancelled ? 'Access until' : 'Renews'} {expiresDate}
                  </span>
                )}
              </p>
            )}

            {isCancelled && (
              <div className="flex items-center gap-1.5 mt-2 text-amber-600 text-sm">
                <AlertTriangle className="h-4 w-4" />
                Subscription cancelled — will not renew
              </div>
            )}

            {cancelSuccess && (
              <div className="flex items-center gap-1.5 mt-2 text-green-600 text-sm">
                <Check className="h-4 w-4" />
                Subscription cancelled successfully
              </div>
            )}
          </div>

          <div className="shrink-0">
            {data.isPro ? (
              !isCancelled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Cancel plan'}
                </Button>
              )
            ) : (
              <Button
                size="sm"
                onClick={() => setShowUpgrade(true)}
                className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white"
              >
                <Zap className="h-3.5 w-3.5 mr-1.5 fill-yellow-300 text-yellow-300" />
                Upgrade to Pro
              </Button>
            )}
          </div>
        </div>

        {cancelError && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{cancelError}</p>
        )}
      </div>

      {/* Limits */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Your limits</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: 'AI analyses / day',
              value: data.limits.dailyAnalyses === -1 || data.limits.dailyAnalyses === Infinity
                ? 'Unlimited'
                : String(data.limits.dailyAnalyses),
            },
            {
              label: 'Watchlist stocks',
              value: data.limits.watchlistStocks === -1 || data.limits.watchlistStocks === Infinity
                ? 'Unlimited'
                : String(data.limits.watchlistStocks),
            },
            {
              label: 'Price alerts',
              value: data.limits.priceAlerts === 0 ? 'Not available' : String(data.limits.priceAlerts),
            },
            {
              label: 'Weekly digest',
              value: data.limits.weeklyDigest ? 'Included' : 'Not available',
            },
            {
              label: 'XIRR calculator',
              value: data.limits.xirr ? 'Included' : 'Not available',
            },
            {
              label: 'Priority AI model',
              value: data.limits.priorityModel ? 'Included' : 'Standard',
            },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Invoice history */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Payment history
        </h2>

        {data.invoices.length === 0 ? (
          <p className="text-sm text-gray-500">No payments yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {inv.plan} plan
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(inv.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900">
                    {inv.amount ?? '—'}
                  </span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  )
}
