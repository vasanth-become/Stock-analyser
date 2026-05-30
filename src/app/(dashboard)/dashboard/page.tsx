import { TrendingUp, TrendingDown, Activity, IndianRupee, BarChart2, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProfileSummaryCard } from '@/components/dashboard/ProfileSummaryCard'

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

export default async function DashboardPage() {
  const session = await auth()
  const profile = session?.user?.id
    ? await prisma.investorProfile.findUnique({ where: { userId: session.user.id } })
    : null
  const greeting = profile?.displayName || session?.user?.name?.split(' ')[0] || 'Investor'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Good morning, {greeting} 👋</h1>
          <p className="text-gray-500 text-sm mt-1">Here is your personalised research for today.</p>
        </div>
        <Link href="/analysis">
          <Button className="gap-2">
            <Sparkles className="h-4 w-4" />
            Run AI Research
          </Button>
        </Link>
      </div>

      {/* Market Indices */}
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

        {/* Portfolio Summary */}
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
            <Link href="/portfolio">
              <Button variant="outline" className="w-full mt-2">View Portfolio Tracker</Button>
            </Link>
          </CardContent>
        </Card>

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
                <Link key={stock.symbol} href={`/stock/${stock.symbol}`}>
                  <div className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-md px-2 -mx-2 transition-colors">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{stock.symbol}</p>
                      <p className="text-xs text-gray-500">{stock.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 text-sm">₹{stock.price}</p>
                      <Badge variant="success">{stock.change}</Badge>
                    </div>
                  </div>
                </Link>
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
                <Link key={stock.symbol} href={`/stock/${stock.symbol}`}>
                  <div className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-md px-2 -mx-2 transition-colors">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{stock.symbol}</p>
                      <p className="text-xs text-gray-500">{stock.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 text-sm">₹{stock.price}</p>
                      <Badge variant="destructive">{stock.change}</Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
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
              { href: '/search', label: 'Search Stocks', icon: '🔍' },
              { href: '/analysis', label: 'Run AI Research', icon: '🤖' },
              { href: '/portfolio', label: 'Update Holdings', icon: '📊' },
              { href: '/alerts', label: 'Set Price Alert', icon: '🔔' },
            ].map(({ href, label, icon }) => (
              <Link key={href} href={href}>
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
                <BarChart2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white text-lg">Get AI-powered research insights</p>
                <p className="text-blue-100 text-sm">ARIA analyses NSE/BSE market data against your investor profile</p>
              </div>
            </div>
            <Link href="/analysis">
              <Button variant="secondary" className="bg-white text-blue-700 hover:bg-blue-50">
                Run Research →
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
