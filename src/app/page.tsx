import Link from 'next/link'
import { TrendingUp, BarChart2, Shield, Zap, IndianRupee, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">StockSage India</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login"><Button variant="ghost">Sign In</Button></Link>
            <Link href="/register"><Button>Get Started Free</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 bg-gradient-to-b from-blue-50 to-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm text-blue-700 font-medium mb-6">
            <Zap className="h-4 w-4" />
            Powered by Claude AI
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Smart Stock Analysis<br />
            <span className="text-blue-600">for Indian Investors</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            AI-powered insights for NSE &amp; BSE stocks. Get personalised analysis, manage your portfolio,
            and make smarter investment decisions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="px-8">Start for Free →</Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="px-8">View Demo</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything you need to invest smarter</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Built specifically for Indian retail investors navigating NSE and BSE markets</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: BarChart2, title: 'AI Stock Analysis', desc: 'Get Claude AI-powered technical and fundamental analysis for any NSE/BSE stock in seconds.' },
              { icon: IndianRupee, title: 'Portfolio Tracking', desc: 'Track all your holdings, P&L, and performance metrics in one place with real-time updates.' },
              { icon: Shield, title: 'Smart Alerts', desc: 'Set price alerts and get notified when stocks hit your target levels. Never miss an opportunity.' },
              { icon: TrendingUp, title: 'Market Overview', desc: 'Monitor NIFTY 50, SENSEX, sector indices and top movers at a glance every trading day.' },
              { icon: Zap, title: 'Personalised Insights', desc: 'Get AI recommendations tailored to your risk profile, investment goals and portfolio composition.' },
              { icon: CheckCircle2, title: 'Watchlist Management', desc: 'Build and manage multiple watchlists. Track stocks you are researching or planning to buy.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-gray-100 p-6 hover:border-blue-200 hover:shadow-md transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 mb-4">
                  <Icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
          <p className="text-gray-600 mb-12">Start free, upgrade when you need more</p>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { name: 'Free', price: '₹0', period: 'forever', features: ['5 AI analyses/month', '1 Watchlist (10 stocks)', 'Basic market data', 'Portfolio tracking (5 holdings)'], cta: 'Get Started', highlight: false },
              { name: 'Pro', price: '₹499', period: 'per month', features: ['Unlimited AI analyses', 'Unlimited watchlists', 'Real-time data', 'Unlimited portfolio holdings', 'Price alerts', 'Export reports'], cta: 'Start Pro Trial', highlight: true },
              { name: 'Enterprise', price: '₹1,999', period: 'per month', features: ['Everything in Pro', 'API access', 'Custom reports', 'Priority support', 'Multiple sub-accounts', 'Advanced analytics'], cta: 'Contact Sales', highlight: false },
            ].map(({ name, price, period, features, cta, highlight }) => (
              <div key={name} className={`rounded-2xl p-8 text-left ${highlight ? 'bg-blue-600 text-white ring-4 ring-blue-200' : 'bg-white border border-gray-200'}`}>
                <h3 className={`text-lg font-semibold mb-1 ${highlight ? 'text-white' : 'text-gray-900'}`}>{name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className={`text-4xl font-bold ${highlight ? 'text-white' : 'text-gray-900'}`}>{price}</span>
                  <span className={`text-sm ${highlight ? 'text-blue-200' : 'text-gray-500'}`}>/{period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {features.map((f) => (
                    <li key={f} className={`flex items-start gap-2 text-sm ${highlight ? 'text-blue-100' : 'text-gray-600'}`}>
                      <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${highlight ? 'text-white' : 'text-green-500'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <Button className="w-full" variant={highlight ? 'secondary' : 'default'}>{cta}</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">StockSage India</span>
            </div>
            <p className="text-sm text-gray-500">
              © 2024 StockSage India. Investment decisions are your own responsibility.
              Past performance does not guarantee future results.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
