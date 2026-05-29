'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { Users, Zap, TrendingUp, IndianRupee, BarChart2, Activity } from 'lucide-react'

interface StatsData {
  users: {
    totalUsers: number
    newToday: number
    newThisWeek: number
    activeProCount: number
    dau: number
    mau: number
  }
  analyses: {
    today: number
    thisWeek: number
    thisMonth: number
    last14: { date: string; count: number }[]
  }
  topStocks: { symbol: string; count: number }[]
  apiUsage: {
    currentMonth: string
    totalCalls: number
    estimatedCost: number
    limit: number
    history: { month: string; totalCalls: number; estimatedCost: number }[]
  }
  revenue: {
    mrr: number
    arr: number
    activeMonthly: number
    activeYearly: number
    churnRate: number
    revenueChart: { month: string; amount: number }[]
  }
}

function StatCard({
  label, value, sub, icon: Icon, accent = 'blue',
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  accent?: 'blue' | 'violet' | 'green' | 'orange'
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`rounded-xl p-2.5 ${colors[accent]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-gray-800 mb-3">{children}</h2>
}

export default function AdminDashboard() {
  const [data, setData] = useState<StatsData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.ok ? r.json() : r.json().then((d) => Promise.reject(d.error)))
      .then(setData)
      .catch((e) => setError(String(e)))
  }, [])

  if (error) {
    return (
      <div className="p-8 text-red-600 font-medium">
        Failed to load stats: {error}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8 space-y-4 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-2xl" />
        ))}
      </div>
    )
  }

  const { users, analyses, topStocks, revenue, apiUsage } = data

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Overview</h1>
        <p className="text-gray-500 text-sm mt-1">Live metrics — refreshed on page load.</p>
      </div>

      {/* Users */}
      <section>
        <SectionTitle>Users</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Total users" value={users.totalUsers.toLocaleString()} icon={Users} accent="blue" />
          <StatCard
            label="Active Pro"
            value={users.activeProCount.toLocaleString()}
            sub={`${Math.round((users.activeProCount / Math.max(users.totalUsers, 1)) * 100)}% of total`}
            icon={Zap}
            accent="violet"
          />
          <StatCard
            label="DAU / MAU"
            value={`${users.dau} / ${users.mau}`}
            sub="Unique analysts today / 30d"
            icon={Activity}
            accent="green"
          />
          <StatCard label="New today" value={users.newToday} icon={Users} accent="orange" />
          <StatCard label="New this week" value={users.newThisWeek} icon={Users} accent="blue" />
        </div>
      </section>

      {/* Analyses */}
      <section>
        <SectionTitle>AI Analyses</SectionTitle>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <StatCard label="Today" value={analyses.today} icon={BarChart2} accent="blue" />
          <StatCard label="This week" value={analyses.thisWeek} icon={BarChart2} accent="violet" />
          <StatCard label="This month" value={analyses.thisMonth} icon={BarChart2} accent="green" />
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-600 mb-4">Daily analyses — last 14 days</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analyses.last14} margin={{ top: 0, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => v.slice(5)}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
              />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                labelFormatter={(v) => `Date: ${v}`}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Analyses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* API Usage & Spend */}
      <section>
        <SectionTitle>API Usage &amp; Spend</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard
            label="Calls this month"
            value={apiUsage.totalCalls.toLocaleString()}
            icon={BarChart2}
            accent="blue"
          />
          <StatCard
            label="Estimated cost"
            value={`$${apiUsage.estimatedCost.toFixed(2)}`}
            sub={`of $${apiUsage.limit} limit`}
            icon={Zap}
            accent={apiUsage.estimatedCost >= apiUsage.limit * 0.8 ? 'orange' : 'green'}
          />
        </div>
        {apiUsage.history.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-600 mb-4">Monthly API calls (last 6 months)</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={apiUsage.history} margin={{ top: 0, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="totalCalls" fill="#6366f1" radius={[4, 4, 0, 0]} name="API Calls" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Top stocks + Revenue grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top recommended stocks */}
        <section>
          <SectionTitle>Most analysed stocks (30d)</SectionTitle>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            {topStocks.length === 0 ? (
              <p className="text-sm text-gray-400">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={topStocks}
                  layout="vertical"
                  margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="symbol"
                    tick={{ fontSize: 12, fill: '#374151' }}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Analyses" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Revenue */}
        <section>
          <SectionTitle>Revenue</SectionTitle>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <StatCard
              label="MRR"
              value={`₹${revenue.mrr.toLocaleString('en-IN')}`}
              icon={IndianRupee}
              accent="green"
            />
            <StatCard
              label="ARR"
              value={`₹${revenue.arr.toLocaleString('en-IN')}`}
              icon={TrendingUp}
              accent="blue"
            />
            <StatCard label="Monthly subs" value={revenue.activeMonthly} icon={Zap} accent="orange" />
            <StatCard label="Yearly subs" value={revenue.activeYearly} icon={Zap} accent="violet" />
          </div>
          {revenue.revenueChart.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-sm font-medium text-gray-600 mb-4">Monthly revenue (₹)</p>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart
                  data={revenue.revenueChart}
                  margin={{ top: 4, right: 8, bottom: 0, left: -16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                    formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#10b981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">
            Churn rate: <span className="font-semibold text-gray-700">{revenue.churnRate}%</span>
          </p>
        </section>
      </div>
    </div>
  )
}
