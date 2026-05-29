'use client'

import { useState } from 'react'
import { Megaphone, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Audience = 'all' | 'pro' | 'free'

const AUDIENCE_OPTIONS: { value: Audience; label: string; desc: string }[] = [
  { value: 'all', label: 'All users', desc: 'Everyone with an account' },
  { value: 'pro', label: 'Pro subscribers', desc: 'Active Pro and Enterprise users only' },
  { value: 'free', label: 'Free users', desc: 'Users on the Free plan' },
]

export default function BroadcastPage() {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<Audience>('all')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null)
  const [error, setError] = useState('')

  async function handleSend() {
    if (!subject.trim() || !body.trim()) return
    if (
      !confirm(
        `Send "${subject}" to ${audience === 'all' ? 'ALL users' : audience + ' users'}? This cannot be undone.`,
      )
    )
      return

    setLoading(true)
    setError('')
    setResult(null)

    const res = await fetch('/api/admin/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, body, audience }),
    })

    if (res.ok) {
      setResult(await res.json())
      setSubject('')
      setBody('')
    } else {
      const d = await res.json()
      setError(d.error ?? 'Failed to send broadcast')
    }
    setLoading(false)
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2 bg-orange-50 rounded-xl text-orange-600">
          <Megaphone className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Broadcast Announcement</h1>
          <p className="text-gray-500 text-sm">Send an email to a segment of users via Resend.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        {/* Audience */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Audience</label>
          <div className="grid grid-cols-3 gap-2">
            {AUDIENCE_OPTIONS.map(({ value, label, desc }) => (
              <button
                key={value}
                onClick={() => setAudience(value)}
                className={`text-left p-3 rounded-xl border-2 transition-all text-sm ${
                  audience === value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
            Subject line
          </label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. New feature: Portfolio XIRR is here 🎉"
            maxLength={200}
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{subject.length}/200</p>
        </div>

        {/* Body */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
            Message body
            <span className="font-normal text-gray-400 ml-1">
              (plain text; use <code className="bg-gray-100 px-1 rounded">{'{{name}}'}</code> for personalisation)
            </span>
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            maxLength={10000}
            placeholder={`Hi {{name}},\n\nWe have exciting news…`}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{body.length}/10000</p>
        </div>

        {/* Error / success */}
        {error && (
          <div className="flex items-center gap-2 text-red-700 bg-red-50 rounded-xl px-4 py-3 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-green-800">Broadcast sent!</p>
              <p className="text-green-700 mt-0.5">
                {result.sent} sent · {result.failed} failed · {result.total} total recipients
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-400">
            Emails are sent in batches of 100 via Resend.
          </p>
          <Button
            onClick={handleSend}
            disabled={loading || !subject.trim() || !body.trim()}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sending…</>
            ) : (
              <><Megaphone className="h-4 w-4 mr-2" />Send broadcast</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
