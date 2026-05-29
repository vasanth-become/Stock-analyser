import Link from 'next/link'
import { Check, X, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

const FREE_FEATURES = [
  { label: '3 AI analyses per day', included: true },
  { label: 'Watchlist up to 10 stocks', included: true },
  { label: 'Basic portfolio tracker', included: true },
  { label: 'Market data & charts', included: true },
  { label: 'Price alerts', included: false },
  { label: 'Unlimited AI analyses', included: false },
  { label: 'Unlimited watchlist', included: false },
  { label: 'Weekly email digest', included: false },
  { label: 'Portfolio XIRR calculator', included: false },
  { label: 'Priority AI model', included: false },
]

const PRO_FEATURES = [
  { label: 'Everything in Free', included: true },
  { label: 'Unlimited AI analyses every day', included: true },
  { label: 'Unlimited watchlist stocks', included: true },
  { label: 'Price alerts (up to 20 active)', included: true },
  { label: 'Weekly email market digest', included: true },
  { label: 'Portfolio XIRR calculator', included: true },
  { label: 'Priority AI model (deeper reasoning)', included: true },
  { label: 'Early access to new features', included: true },
]

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/" className="text-xl font-bold text-blue-700">
          StockAnalyser
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
            Sign in
          </Link>
          <Link href="/register">
            <Button size="sm">Get started free</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center pt-16 pb-12 px-4">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto">
          Start free — no credit card required. Upgrade when you need unlimited AI-powered
          insights.
        </p>
      </section>

      {/* Cards */}
      <section className="max-w-4xl mx-auto px-4 pb-24 grid md:grid-cols-2 gap-8">
        {/* Free */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 flex flex-col">
          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Free</p>
            <p className="text-4xl font-extrabold text-gray-900">
              ₹0
              <span className="text-base font-normal text-gray-500 ml-1">/ forever</span>
            </p>
          </div>

          <ul className="space-y-3 flex-1 mb-8">
            {FREE_FEATURES.map(({ label, included }) => (
              <li key={label} className="flex items-center gap-2.5 text-sm">
                {included ? (
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <X className="h-4 w-4 text-gray-300 shrink-0" />
                )}
                <span className={included ? 'text-gray-700' : 'text-gray-400'}>{label}</span>
              </li>
            ))}
          </ul>

          <Link href="/register" className="block">
            <Button variant="outline" className="w-full">
              Get started free
            </Button>
          </Link>
        </div>

        {/* Pro */}
        <div className="rounded-2xl border-2 border-blue-600 bg-white p-8 flex flex-col relative shadow-xl shadow-blue-100">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-gradient-to-r from-blue-600 to-violet-600 text-white text-xs font-bold uppercase tracking-wide px-4 py-1 rounded-full">
              Most popular
            </span>
          </div>

          <div className="mb-6">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 fill-blue-600" /> Pro
            </p>
            <div className="flex items-end gap-2">
              <p className="text-4xl font-extrabold text-gray-900">
                ₹299
                <span className="text-base font-normal text-gray-500 ml-1">/ month</span>
              </p>
            </div>
            <p className="text-sm text-green-600 font-medium mt-1">
              or ₹2,499 / year — save 30%
            </p>
          </div>

          <ul className="space-y-3 flex-1 mb-8">
            {PRO_FEATURES.map(({ label }) => (
              <li key={label} className="flex items-center gap-2.5 text-sm">
                <Check className="h-4 w-4 text-green-500 shrink-0" />
                <span className="text-gray-700">{label}</span>
              </li>
            ))}
          </ul>

          <Link href="/register?plan=pro" className="block">
            <Button className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold h-11">
              <Zap className="h-4 w-4 mr-2 fill-yellow-300 text-yellow-300" />
              Upgrade to Pro
            </Button>
          </Link>
          <p className="text-center text-xs text-gray-400 mt-3">
            Secured by Razorpay · Cancel anytime · GST included
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-2xl mx-auto px-4 pb-24">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          Frequently asked questions
        </h2>
        <div className="space-y-6">
          {[
            {
              q: 'Can I cancel anytime?',
              a: 'Yes. Cancelling stops future renewals. You keep Pro access until the end of the billing period.',
            },
            {
              q: 'Is there a trial?',
              a: 'The Free tier lets you explore all core features before upgrading. No credit card required.',
            },
            {
              q: 'Which payment methods are accepted?',
              a: 'All major Indian cards, UPI, net banking, and wallets via Razorpay.',
            },
            {
              q: 'Are prices inclusive of GST?',
              a: 'Yes — ₹299/month and ₹2,499/year are final prices with 18% GST included.',
            },
          ].map(({ q, a }) => (
            <div key={q}>
              <p className="font-semibold text-gray-900 mb-1">{q}</p>
              <p className="text-gray-500 text-sm">{a}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
