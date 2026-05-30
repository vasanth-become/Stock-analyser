import Link from 'next/link'
import { TrendingUp, BarChart2, Shield, Zap, IndianRupee, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Footer } from '@/components/layout/Footer'

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
            <span className="text-lg font-bold text-gray-900">ARIA Research</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <Link href="/disclaimer" className="hover:text-gray-900 transition-colors">Disclaimer</Link>
            <Link href="/terms" className="hover:text-gray-900 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy</Link>
            <Link href="/login"><Button variant="ghost">Sign In</Button></Link>
            <Link href="/register"><Button>Start your free research</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 bg-gradient-to-b from-blue-50 to-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm text-blue-700 font-medium mb-6">
            <Zap className="h-4 w-4" />
            AI-powered investment research engine
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Institutional-grade stock research.<br />
            <span className="text-blue-600">Built for every Indian investor.</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-4">
            ARIA analyses NSE and BSE markets using AI to surface research insights personalised
            to your goals, risk profile, and budget — so you can make more informed decisions.
          </p>
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg inline-block px-4 py-2 mb-8">
            Research tool only — not a SEBI-registered adviser.{' '}
            <Link href="/disclaimer" className="underline font-medium">Learn what that means →</Link>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="px-8">Start your free research →</Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="px-8">View Demo</Button>
            </Link>
          </div>
          {/* Trust bar */}
          <p className="mt-10 text-xs text-gray-400 tracking-wide">
            Used by investors across India &nbsp;·&nbsp; AI-powered research engine &nbsp;·&nbsp; NSE &amp; BSE data &nbsp;·&nbsp; Not SEBI-registered advisory
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How it works</h2>
            <p className="text-gray-600">Four steps from profile to research insight</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Build your research profile', desc: 'Tell us your risk appetite, investment goals, budget, and time horizon.' },
              { step: '2', title: 'ARIA analyses live market data', desc: 'ARIA analyses live NSE/BSE data against your profile in real time.' },
              { step: '3', title: 'Get personalised research insights', desc: 'Receive AI-screened research picks and insights tailored to your profile.' },
              { step: '4', title: 'You stay in control', desc: 'Track, learn, and make informed decisions — the final call is always yours.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-lg mx-auto mb-4">
                  {step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything you need to research smarter</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Built specifically for Indian retail investors navigating NSE and BSE markets</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: BarChart2, title: 'AI Research Engine', desc: 'ARIA analyses technical and fundamental data for NSE/BSE stocks against your investor profile.' },
              { icon: IndianRupee, title: 'Portfolio Tracker', desc: 'Track all your holdings, P&L, and performance metrics in one place with real-time updates.' },
              { icon: Shield, title: 'Research Watchlist', desc: 'Build a watchlist of stocks you are researching. Add personal notes and track with live prices.' },
              { icon: TrendingUp, title: 'Market Overview', desc: 'Monitor NIFTY 50, SENSEX, sector indices and top movers at a glance every trading day.' },
              { icon: Zap, title: 'Personalised Research Insights', desc: 'AI-screened research picks calibrated to your risk profile, goals, and investment horizon.' },
              { icon: CheckCircle2, title: 'SIP Research Planner', desc: 'Plan your mutual fund SIP strategy with the PRIYA research engine. Projections are illustrative.' },
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
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Research Plans</h2>
          <p className="text-gray-600 mb-12">Start free — upgrade for unlimited research access</p>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {[
              {
                name: 'Research Starter',
                price: '₹0',
                period: 'forever',
                desc: 'Access AI-powered research insights, live market data, and your personalised research dashboard — free forever.',
                features: ['3 AI research runs/day', 'Research Watchlist (10 stocks)', 'Basic market data', 'Portfolio tracker'],
                cta: 'Start your free research',
                highlight: false,
              },
              {
                name: 'Research Pro',
                price: '₹299',
                period: 'per month',
                desc: 'Unlimited research runs, advanced SIP analysis, price alerts, and your weekly personalised market digest.',
                features: ['Unlimited AI research runs', 'Unlimited watchlist', 'Price alerts (up to 20)', 'Weekly MERCURY digest', 'Portfolio XIRR', 'Priority AI model'],
                cta: 'Upgrade to Research Pro',
                highlight: true,
              },
            ].map(({ name, price, period, desc, features, cta, highlight }) => (
              <div key={name} className={`rounded-2xl p-8 text-left ${highlight ? 'bg-blue-600 text-white ring-4 ring-blue-200' : 'bg-white border border-gray-200'}`}>
                <h3 className={`text-lg font-semibold mb-1 ${highlight ? 'text-white' : 'text-gray-900'}`}>{name}</h3>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className={`text-4xl font-bold ${highlight ? 'text-white' : 'text-gray-900'}`}>{price}</span>
                  <span className={`text-sm ${highlight ? 'text-blue-200' : 'text-gray-500'}`}>/{period}</span>
                </div>
                <p className={`text-sm mb-6 ${highlight ? 'text-blue-100' : 'text-gray-500'}`}>{desc}</p>
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
          <p className="mt-8 text-xs text-gray-400">
            ARIA Research subscription gives you access to AI-generated research tools. It does not constitute a SEBI-registered research or advisory service. All research is for informational purposes only.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  )
}
