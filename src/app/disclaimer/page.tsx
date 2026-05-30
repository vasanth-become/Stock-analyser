import Link from 'next/link'
import { TrendingUp, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Disclaimer — ARIA Research',
  description: 'What ARIA Research is and what it is not. SEBI registration status and legal disclosures.',
}

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">ARIA Research</span>
          </Link>
          <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            What ARIA Research is — and what it is not
          </h1>
          <p className="text-gray-500">Understanding the nature and limitations of this platform.</p>
        </div>

        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">What we are</h2>
          <p className="text-gray-700 leading-relaxed">
            ARIA Research is an AI-powered platform that analyses publicly available market data and
            generates research insights to help you make more informed investment decisions. Think of
            us as a smart research assistant — like having access to institutional-grade data analysis
            tools without the institutional price tag.
          </p>
          <ul className="space-y-2 text-gray-700 text-sm">
            <li className="flex gap-2"><span className="text-green-500 font-bold">✓</span> A software tool that aggregates publicly available market data from third-party sources</li>
            <li className="flex gap-2"><span className="text-green-500 font-bold">✓</span> An AI-powered interface that generates informational research summaries</li>
            <li className="flex gap-2"><span className="text-green-500 font-bold">✓</span> A personal finance organiser for tracking watchlists, portfolios, and SIP projections</li>
          </ul>
        </section>

        <section className="bg-white rounded-xl border border-red-100 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">What we are not</h2>
          <ul className="space-y-2 text-gray-700 text-sm">
            <li className="flex gap-2"><span className="text-red-500 font-bold">✗</span> A SEBI-registered Research Analyst (RA) under SEBI (Research Analysts) Regulations, 2014</li>
            <li className="flex gap-2"><span className="text-red-500 font-bold">✗</span> A SEBI-registered Investment Adviser (IA) under SEBI (Investment Advisers) Regulations, 2013</li>
            <li className="flex gap-2"><span className="text-red-500 font-bold">✗</span> A portfolio manager, fund manager, or discretionary adviser</li>
            <li className="flex gap-2"><span className="text-red-500 font-bold">✗</span> A stockbroker or trading platform</li>
          </ul>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-3 font-semibold text-gray-700 border border-gray-200">Regulator</th>
                  <th className="text-left p-3 font-semibold text-gray-700 border border-gray-200">Registration</th>
                  <th className="text-left p-3 font-semibold text-gray-700 border border-gray-200">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border border-gray-200 text-gray-700">SEBI (Investment Adviser)</td>
                  <td className="p-3 border border-gray-200 text-gray-700">IA Registration</td>
                  <td className="p-3 border border-gray-200 text-red-600 font-semibold">Not registered</td>
                </tr>
                <tr>
                  <td className="p-3 border border-gray-200 text-gray-700">SEBI (Research Analyst)</td>
                  <td className="p-3 border border-gray-200 text-gray-700">RA Registration</td>
                  <td className="p-3 border border-gray-200 text-red-600 font-semibold">Not registered</td>
                </tr>
                <tr>
                  <td className="p-3 border border-gray-200 text-gray-700">AMFI (Mutual Fund Distributor)</td>
                  <td className="p-3 border border-gray-200 text-gray-700">ARN Number</td>
                  <td className="p-3 border border-gray-200 text-red-600 font-semibold">Not registered</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">How to use ARIA Research safely</h2>
          <p className="text-gray-700 leading-relaxed">
            Use our research as one input among many. Cross-check with other sources. Understand the
            risks before investing. Never invest more than you can afford to lose. For personalised
            advice tailored to your full financial situation, always consult a SEBI-registered adviser.
          </p>
          <ul className="space-y-2 text-gray-700 text-sm">
            <li>• All research is AI-generated and for informational purposes only</li>
            <li>• Investments in securities are subject to market risk</li>
            <li>• Past performance is not indicative of future results</li>
            <li>• Mutual fund investments are subject to market risks — read scheme documents carefully</li>
            <li>• SIP projections are illustrative estimates only</li>
          </ul>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">How to verify a SEBI-registered adviser</h2>
          <p className="text-gray-700 leading-relaxed">
            Visit <strong>sebi.gov.in</strong> → Intermediaries → Registered Entities → Search under
            Research Analyst or Investment Adviser. Any legitimate adviser will display their SEBI
            registration number prominently.
          </p>
        </section>

        <p className="text-xs text-gray-400 text-center">
          Last updated: May 2026 · <Link href="/terms" className="underline">Terms of Service</Link> · <Link href="/privacy" className="underline">Privacy Policy</Link>
        </p>
      </main>
    </div>
  )
}
