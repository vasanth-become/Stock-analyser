'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, ChevronLeft, ChevronRight, Loader2, ShieldCheck, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlanBadge } from '@/components/subscription/PlanBadge'

interface UserRow {
  id: string
  email: string
  name: string | null
  role: string
  plan: string
  effectivePlan: string
  billingCycle: string | null
  subscriptionStatus: string | null
  createdAt: string
  analysesCount: number
}

interface PageData {
  users: UserRow[]
  total: number
  pages: number
}

export default function AdminUsersPage() {
  const [data, setData] = useState<PageData | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)

  const load = useCallback(async (p: number, s: string) => {
    setLoading(true)
    const res = await fetch(`/api/admin/users?page=${p}&search=${encodeURIComponent(s)}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => load(1, search), 300)
    setPage(1)
    return () => clearTimeout(t)
  }, [search, load])

  useEffect(() => { load(page, search) }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  async function togglePlan(user: UserRow) {
    setTogglingId(user.id)
    const newPlan = user.effectivePlan === 'FREE' ? 'PRO' : 'FREE'
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: newPlan }),
    })
    if (res.ok) {
      await load(page, search)
      if (selectedUser?.id === user.id) {
        const updated = await res.json()
        setSelectedUser((prev) => prev ? { ...prev, plan: updated.plan, effectivePlan: updated.plan } : null)
      }
    }
    setTogglingId(null)
  }

  async function toggleRole(user: UserRow) {
    setTogglingId(user.id)
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN'
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    if (res.ok) await load(page, search)
    setTogglingId(null)
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 text-sm mt-1">
          {data ? `${data.total.toLocaleString()} users total` : 'Loading…'}
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email or name…"
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['User', 'Plan', 'Role', 'Analyses', 'Joined', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && !data ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500 mx-auto" />
                  </td>
                </tr>
              ) : (
                data?.users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedUser(selectedUser?.id === user.id ? null : user)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 truncate max-w-[200px]">
                        {user.name ?? '—'}
                      </p>
                      <p className="text-xs text-gray-400 truncate max-w-[200px]">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <PlanBadge plan={user.effectivePlan} />
                      {user.billingCycle && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {user.billingCycle.toLowerCase()}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.role === 'ADMIN' ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                          Admin
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">User</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{user.analysesCount}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(user.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => togglePlan(user)}
                          disabled={togglingId === user.id}
                          className="text-xs h-7 px-2"
                        >
                          {togglingId === user.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : user.effectivePlan === 'FREE' ? (
                            <>
                              <Zap className="h-3 w-3 mr-1 text-blue-500" /> Grant Pro
                            </>
                          ) : (
                            <>
                              <UserX className="h-3 w-3 mr-1 text-red-500" /> Revoke
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleRole(user)}
                          disabled={togglingId === user.id}
                          className="text-xs h-7 px-2"
                          title={user.role === 'ADMIN' ? 'Remove admin' : 'Make admin'}
                        >
                          <ShieldCheck className={`h-3 w-3 ${user.role === 'ADMIN' ? 'text-red-500' : 'text-gray-400'}`} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Page {page} of {data.pages}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= data.pages}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Expanded profile drawer */}
      {selectedUser && (
        <div className="mt-4 bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">
            Profile — {selectedUser.name ?? selectedUser.email}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {[
              { label: 'Email', value: selectedUser.email },
              { label: 'Plan', value: selectedUser.effectivePlan },
              { label: 'Status', value: selectedUser.subscriptionStatus ?? '—' },
              { label: 'Billing', value: selectedUser.billingCycle ?? '—' },
              { label: 'Analyses run', value: selectedUser.analysesCount },
              { label: 'Role', value: selectedUser.role },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="font-medium text-gray-900 mt-0.5">{String(value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Zap({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  )
}
