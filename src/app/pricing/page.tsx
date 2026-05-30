import Link from 'next/link'
import { Check, X, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Footer } from '@/components/layout/Footer'

const FREE_FEATURES = [
  { label: '3 AI research runs per day', included: true },
  { label: 'Research Watchlist up to 10 stocks', included: true },
  { label: 'Basic portfolio tracker', included: true },
  { label: 'Market data & charts', included: true },
  { label: 'Price alerts', included: false },
  { label: 'Unlimited AI research runs', included: false },
  { label: 'Unlimited watchlist', included: false },
  { label: 'Weekly MERCURY research digest', included: false },
  { label: 'Portfolio XIRR calculator', included: false },
  { label: 'Priority AI model', included: false },
]

const PRO_FEATURES = [
  { label: 'Everything in Research Starter', included: true },
  { label: 'Unlimited AI research runs every day', included: true },
  { label: 'Unlimited watchlist stocks', included: true },
  { label: 'Price alerts (up to 20 active)', included: true },
  { label: 'Weekly MERCURY research digest email', included: true },
  { label: 'Portfolio XIRR calculator', included: true },
  { label: 'Priority AI model (deeper analysis)', included: true },
  { label: 'Early access to new features', included: true },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
        <Link href="/" className="text-xl font-bold text-blue-700">
          ARIA Research
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/disclaimer" className="text-sm text-gray-500 hover:text-gray-900">Disclaimer</Link>
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
            Sign in
          </Link>
          <Link href="/register">
            <Button size="sm">Start your free research</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center pt-16 pb-12 px-4">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
          Research Plans
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto">
          Start free — no credit card required. Upgrade when you need unlimited AI-powered
          research access.
        </p>
      </section>

      {/* Cards */}
      <section className="max-w-4xl mx-auto px-4 pb-16 grid md:grid-cols-2 gap-8 w-full">
        {/* Research Starter */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 flex flex-col">
          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Research Starter</p>
            <p className="text-4xl font-extrabold text-gray-900">
              ₹0
              <span className="text-base font-normal text-gray-500 ml-1">/ forever</span>
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Access AI-powered research insights, live market data, and your personalised research dashboard — free forever.
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
              Start your free research
            </Button>
          </Link>
        </div>

        {/* Research Pro */}
        <div className="rounded-2xl border-2 border-blue-600 bg-white p-8 flex flex-col relative shadow-xl shadow-blue-100">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-gradient-to-r from-blue-600 to-violet-600 text-white text-xs font-bold uppercase tracking-wide px-4 py-1 rounded-full">
              Most popular
            </span>
          </div>

          <div className="mb-6">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 fill-blue-600" /> Research Pro
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
            <p className="text-sm text-gray-500 mt-2">
              Unlimited research runs, advanced SIP analysis, price alerts, and your weekly personalised market digest.
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
              Upgrade to Research Pro
            </Button>
          </Link>
          <p className="text-center text-xs text-gray-400 mt-3">
            Secured by Razorpay · Cancel anytime · GST included
          </p>
        </div>
      </section>

      {/* Pricing disclaimer */}
      <div className="max-w-4xl mx-auto px-4 pb-12 w-full">
        <p className="text-xs text-gray-400 text-center bg-gray-50 rounded-lg p-4 border border-gray-200">
          ARIA Research subscription gives you access to AI-generated research tools. It does not constitute a SEBI-registered research or advisory service. All research is for informational purposes only.
          {' '}<Link href="/disclaimer" className="underline">Learn more about what ARIA Research is and is not.</Link>
        </p>
      </div>

      {/* FAQ */}
      <section className="max-w-2xl mx-auto px-4 pb-24 w-full">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          Frequently asked questions
        </h2>
        <div className="space-y-6">
          {[
            {
              q: 'Is ARIA Research a SEBI-registered adviser?',
              a: 'No. ARIA Research is an AI-powered research tool, not a SEBI-registered Research Analyst or Investment Adviser. All research output is for informational and educational purposes only.',
            },
            {
              q: 'Can I cancel anytime?',
              a: 'Yes. Cancelling stops future renewals. You keep Research Pro access until the end of the billing period.',
            },
            {
              q: 'Is there a refund policy?',
              a: 'Yes — if you upgrade to Research Pro and are not satisfied, request a full refund within 7 days of your first payment.',
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

      <Footer />
    </div>
  )
}
