'use client'

import { useState } from 'react'
import { X, Zap, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UpgradeModalProps {
  onClose: () => void
  feature?: string   // which gated feature triggered this
}

const FEATURE_LABELS: Record<string, string> = {
  alerts: 'Price Alerts',
  xirr: 'XIRR Calculator',
  digest: 'Weekly Email Digest',
  analysis: 'Unlimited AI Analyses',
  watchlist: 'Unlimited Watchlist',
}

export function UpgradeModal({ onClose, feature }: UpgradeModalProps) {
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('yearly')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const featureLabel = feature ? FEATURE_LABELS[feature] ?? feature : null

  async function handleUpgrade() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycle }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create subscription')

      // Open Razorpay checkout
      const options = {
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: 'StockAnalyser Pro',
        description: cycle === 'yearly' ? '₹2,499/year — Save 30%' : '₹299/month',
        image: '/logo.png',
        handler: async (response: {
          razorpay_payment_id: string
          razorpay_subscription_id: string
          razorpay_signature: string
        }) => {
          const verify = await fetch('/api/subscription/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...response, cycle }),
          })
          if (verify.ok) {
            window.location.reload()
          } else {
            setError('Payment verification failed. Contact support.')
          }
        },
        prefill: {},
        theme: { color: '#1d4ed8' },
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-violet-600 rounded-t-2xl px-6 py-5 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-5 w-5 fill-yellow-300 text-yellow-300" />
            <span className="text-sm font-semibold uppercase tracking-wide">Pro Feature</span>
          </div>
          <h2 className="text-xl font-bold">
            {featureLabel ? `Unlock ${featureLabel}` : 'Upgrade to StockAnalyser Pro'}
          </h2>
          <p className="text-blue-100 text-sm mt-1">
            Get unlimited AI analyses, alerts, XIRR, and weekly digests.
          </p>
        </div>

        <div className="px-6 py-5">
          {/* Billing toggle */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 mb-5">
            {(['monthly', 'yearly'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={`flex-1 py-1.5 rounded-md text-sm font-semibold transition-all ${
                  cycle === c ? 'bg-white shadow text-blue-700' : 'text-gray-500'
                }`}
              >
                {c === 'monthly' ? '₹299 / month' : '₹2,499 / year'}
                {c === 'yearly' && (
                  <span className="ml-1.5 bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full">
                    Save 30%
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Feature list */}
          <ul className="space-y-2 mb-5">
            {[
              'Unlimited AI analyses every day',
              'Price alerts (up to 20 active)',
              'Unlimited watchlist stocks',
              'Weekly email market digest',
              'Portfolio XIRR calculator',
              'Priority AI model (deeper reasoning)',
            ].map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="h-4 w-4 text-green-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          {error && (
            <p className="text-red-600 text-sm mb-3 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <Button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold h-11"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing…</>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2 fill-yellow-300 text-yellow-300" />
                Upgrade to Pro
              </>
            )}
          </Button>

          <p className="text-center text-xs text-gray-400 mt-3">
            Secured by Razorpay · Cancel anytime · GST included
          </p>
        </div>
      </div>
    </div>
  )
}
