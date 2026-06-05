import { TrendingUp, TrendingDown, Activity, IndianRupee, Sparkles, Target, Bell } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProfileSummaryCard } from '@/components/dashboard/ProfileSummaryCard'
import { calculateGoalProjection } from '@/lib/goalClock/goalCalculator'

// ─── Static market data ────────────────────────────────────────────────────────

const marketIndices = [
  { name: 'NIFTY 50', value: '22,456.80', change: '+234.50', pct: '+1.05%', up: true },
  { name: 'SENSEX', value: '73,961.31', change: '+745.21', pct: '+1.02%', up: true },
  { name: 'NIFTY BANK', value: '48,201.05', change: '-123.45', pct: '-0.26%', up: false },
  { name: 'NIFTY IT', value: '34,567.90', change: '+456.78', pct: '+1.34%', up: true },
]

const topGainers = [
  { symbol: 'TATAMOTORS', name: 'Tata Motors', price: '942.35', change: '+4.82%' },
  { symbol: 'WIPRO', name: 'Wipro Ltd', price: '478.90', change: '+3.21%' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance', price: '6,892.00', change: '+2.94%' },
]

const topLosers = [
  { symbol: 'COALINDIA', name: 'Coal India', price: '412.50', change: '-2.15%' },
  { symbol: 'NTPC', name: 'NTPC Ltd', price: '267.80', change: '-1.87%' },
  { symbol: 'ONGC', name: 'ONGC', price: '198.45', change: '-1.54%' },
]

// ─── Market status helper ──────────────────────────────────────────────────────

function isMarketOpen(): boolean {
  const now = new Date()
  // IST = UTC+5:30
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000
  const istMs = utcMs + 5.5 * 60 * 60_000
  const ist = new Date(istMs)
  const day = ist.getDay() // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false
  const h = ist.getHours(), m = ist.getMinutes()
  const mins = h * 60 + m
  return mins >= 555 && mins < 930 // 9:15–15:30 IST
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await auth()
  const [profile, primaryGoal] = await Promise.all([
    session?.user?.id
      ? prisma.investorProfile.findUnique({ where: { userId: session.user.id } })
      : null,
    session?.user?.id
      ? (prisma.financialGoal as typeof prisma.financialGoal | undefined)
          ?.findFirst({ where: { userId: session.user.id, isActive: true, isPrimary: true } })
          .catch(() => null) ?? null
      : null,
  ])

  const greeting = profile?.displayName || session?.user?.name?.split(' ')[0] || 'Investor'
  const goalProjection = primaryGoal ? calculateGoalProjection(primaryGoal) : null
  const marketOpen = isMarketOpen()

  return (
    <div className="space-y-6">

      {/* ── Section A: Market Pulse Bar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge
          variant={marketOpen ? 'default' : 'secondary'}
          className={marketOpen ? 'bg-green-600 hover:bg-green-600' : ''}
        >
          {marketOpen ? '● Market Open' : '○ Market Closed'}
        </Badge>
        <div className="flex items-center gap-4 flex-wrap">
          {marketIndices.map((idx) => (
            <div key={idx.name} className="flex items-center gap-1.5 text-sm">
              <span className="text-gray-500 font-medium">{idx.name}</span>
              <span className="font-bold text-gray-900">{idx.value}</span>
              <span className={`text-xs font-medium ${idx.up ? 'text-green-600' : 'text-red-600'}`}>
                {idx.pct}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section B: Personal Greeting ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Good morning, {greeting} 👋</h1>
          <p className="text-gray-500 text-sm mt-1">Here is your personalised research for today.</p>
        </div>
        <Link href="/dashboard/aria">
          <Button className="gap-2">
            <Sparkles className="h-4 w-4" />
            Run AI Research
          </Button>
        </Link>
      </div>

      {/* ── Section C: Research Summary ── */}
      <Card className="border-blue-100 bg-blue-50/40">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-blue-600" />
            Today&apos;s Research Summary
          </CardTitle>
          <CardDescription>AI-powered stock picks based on your investor profile</CardDescription>
        </CardHeader>
        <CardContent>
          {/* No live /api/analysis call on server — show CTA that links to ARIA hub */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-gray-600">
              Get AI analysis personalised to your risk profile and goals.
            </p>
            <Link href="/dashboard/aria">
              <Button size="sm" className="gap-2">
                <Sparkles className="h-3.5 w-3.5" />
                Run today&apos;s research →
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* ── Section D + E: Market Snapshot & Top Movers ── */}
      {/* Market Indices Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {marketIndices.map((idx) => (
          <Card key={idx.name}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-gray-500 mb-1">{idx.name}</p>
              <p className="text-xl font-bold text-gray-900">{idx.value}</p>
              <div className={`flex items-center gap-1 mt-1 text-sm font-medium ${idx.up ? 'text-green-600' : 'text-red-600'}`}>
                {idx.up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                <span>{idx.change}</span>
                <span className="text-xs">({idx.pct})</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Investor Profile Summary */}
        <ProfileSummaryCard profile={profile} />

        {/* Top Gainers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Top Gainers
            </CardTitle>
            <CardDescription>NSE top performers today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topGainers.map((stock) => (
                <div key={stock.symbol} className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-md px-2 -mx-2 transition-colors">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{stock.symbol}</p>
                    <p className="text-xs text-gray-500">{stock.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 text-sm">₹{stock.price}</p>
                    <Badge variant="success">{stock.change}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Losers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              Top Losers
            </CardTitle>
            <CardDescription>NSE bottom performers today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topLosers.map((stock) => (
                <div key={stock.symbol} className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-md px-2 -mx-2 transition-colors">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{stock.symbol}</p>
                    <p className="text-xs text-gray-500">{stock.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 text-sm">₹{stock.price}</p>
                    <Badge variant="destructive">{stock.change}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Section F: Discipline Score ── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Bell className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Discipline Score</p>
                <p className="text-xs text-gray-500">Track your alerts and investing habits</p>
              </div>
            </div>
            <Link href="/dashboard/alerts">
              <Button variant="outline" size="sm">View Alerts →</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* ── Section G: Goal Clock Widget ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Goal Clock
            </CardTitle>
            <Link href="/dashboard/plan?tab=goals" className="text-sm text-blue-600 hover:underline">View all goals →</Link>
          </div>
        </CardHeader>
        <CardContent>
          {primaryGoal && goalProjection ? (
            <div className="flex items-center gap-6">
              {/* Mini ring — static SVG, no client JS needed */}
              {(() => {
                const pct = Math.min(100, goalProjection.percentComplete)
                const r = 36, sw = 8, dim = 88
                const circ = 2 * Math.PI * r
                const filled = pct / 100 * circ
                const colour = pct >= 100 ? '#16a34a' : goalProjection.onTrack ? '#2563eb' : '#f59e0b'
                return (
                  <div className="relative shrink-0" style={{ width: dim, height: dim }}>
                    <svg width={dim} height={dim} style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx={44} cy={44} r={r} fill="none" stroke="#e2e8f0" strokeWidth={sw} />
                      <circle cx={44} cy={44} r={r} fill="none" stroke={colour} strokeWidth={sw}
                        strokeLinecap="round"
                        strokeDasharray={`${filled} ${circ - filled}`} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span style={{ fontSize: 20 }}>{primaryGoal.emoji}</span>
                      <span className="text-[11px] font-bold text-gray-700">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                )
              })()}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate">{primaryGoal.name}</p>
                <p className="text-sm text-gray-500">
                  {goalProjection.onTrack ? '✅ On track' : '⚠️ Behind schedule'}
                  {' · '}
                  {(() => {
                    const m = goalProjection.monthsRemaining
                    if (m <= 0) return 'Due'
                    const y = Math.floor(m / 12), mo = m % 12
                    if (y === 0) return `${mo}mo left`
                    if (mo === 0) return `${y}yr left`
                    return `${y}yr ${mo}mo left`
                  })()}
                </p>
                {goalProjection.sipGap > 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Need ₹{Math.round(goalProjection.sipGap).toLocaleString('en-IN')}/mo more to stay on track
                  </p>
                )}
              </div>
              <Link href={`/dashboard/plan?tab=goals`}>
                <Button variant="outline" size="sm">View</Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">No financial goals set yet. Start tracking your dreams.</p>
              <Link href="/dashboard/plan?tab=goals">
                <Button size="sm" className="gap-1.5">
                  <Target className="h-3.5 w-3.5" />
                  Set your first goal
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section H: Quick Actions ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: '/dashboard/aria', label: 'Run Research', icon: '🤖' },
              { href: '/dashboard/investments?tab=watchlist', label: 'Add to Watchlist', icon: '👀' },
              { href: '/dashboard/plan?tab=goals', label: 'Check Goals', icon: '🎯' },
              { href: '/dashboard/aria', label: 'Ask ARIA', icon: '💬' },
            ].map(({ href, label, icon }) => (
              <Link key={`${href}-${label}`} href={href}>
                <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
                  <span className="text-2xl">{icon}</span>
                  <span className="text-sm font-medium text-gray-700 text-center">{label}</span>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Research Banner */}
      <Card className="bg-gradient-to-r from-blue-600 to-indigo-700 border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white text-lg">Get AI-powered research insights</p>
                <p className="text-blue-100 text-sm">ARIA analyses NSE/BSE market data against your investor profile</p>
              </div>
            </div>
            <Link href="/dashboard/aria">
              <Button variant="secondary" className="bg-white text-blue-700 hover:bg-blue-50">
                Run Research →
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Tracker card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-blue-600" />
            Portfolio Tracker
          </CardTitle>
          <CardDescription>Your holdings summary — tracking tool only</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Total Value</p>
            <p className="text-2xl font-bold text-gray-900">₹4,82,340.50</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Invested</p>
              <p className="font-semibold text-gray-900">₹4,20,000</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Gain/Loss</p>
              <p className="font-semibold text-green-600">+₹62,340 (+14.8%)</p>
            </div>
          </div>
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500">Today&apos;s Change</p>
            <p className="font-semibold text-green-600">+₹3,421 (+0.71%)</p>
          </div>
          <p className="text-[10px] text-gray-400">P&L based on manually entered prices and live data. ARIA Research does not execute trades.</p>
          <Link href="/dashboard/investments">
            <Button variant="outline" className="w-full mt-2">View Portfolio Tracker</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
