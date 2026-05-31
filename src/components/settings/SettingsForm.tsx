'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle, Loader2 } from 'lucide-react'

interface Props {
  name: string
  email: string
}

export function SettingsForm({ name, email }: Props) {
  const [displayName, setDisplayName] = useState(name)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!displayName.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: displayName.trim() }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4 pt-2 border-t">
      <div className="grid gap-1.5">
        <label htmlFor="name" className="text-sm font-medium text-gray-700">Display name</label>
        <Input
          id="name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
          maxLength={60}
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
        <Input id="email" value={email} disabled className="bg-gray-50 text-gray-500" />
        <p className="text-xs text-gray-400">Email cannot be changed</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={saving || displayName === name} className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle className="h-4 w-4" /> : null}
        {saved ? 'Saved!' : 'Save changes'}
      </Button>
    </form>
  )
}
