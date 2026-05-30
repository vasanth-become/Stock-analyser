import Link from 'next/link'
import { TrendingUp, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Privacy Policy — ARIA Research',
  description: 'Privacy Policy for ARIA Research — what data we collect and how we use it.',
}

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-500">Last updated: May 2026</p>
        </div>

        {[
          {
            title: 'What personal data we collect',
            content: `When you create an account and use ARIA Research, we collect:

Account data:
• Full name and email address (required to create an account)
• Authentication method (Google OAuth or email/password)

Investment profile (entered by you during onboarding):
• Risk tolerance preference (Conservative / Moderate / Aggressive)
• Investment goals (wealth creation, retirement, etc.)
• Monthly income bracket
• Investment experience level
• Age

Usage data:
• Research runs and AI analysis history
• Watchlist stocks you add
• Portfolio holdings you enter manually (symbol, quantity, buy price, buy date)
• Price alert configurations
• Subscription status and billing history

We do NOT collect or access any external financial account data, brokerage data, bank account information, or PAN/Aadhaar details.`,
          },
          {
            title: 'How we use your data',
            content: `Your data is used exclusively to provide and improve the ARIA Research service:

• To personalise the research insights and stock analysis you see (your profile shapes what ARIA highlights)
• To send your weekly MERCURY research digest (if you opt in)
• To send price alert notifications you configure
• To track your subscription status and provide Pro features
• To improve the AI models and research quality (anonymised, aggregated)
• To comply with legal obligations

We do not use your data for advertising, profiling for third-party purposes, or any purpose beyond operating ARIA Research.`,
          },
          {
            title: 'Data sharing and third parties',
            content: `Your personal data is never sold to third parties.

We share data only with the following service providers who are necessary to operate ARIA Research:

• Anthropic (Claude AI): Your investor profile and anonymised market data are sent to generate research. No personally identifiable information is sent beyond what is required for personalisation.
• Resend: Your email address is used to send alert and digest emails you request.
• Razorpay: Your billing details are handled by Razorpay for payment processing. We do not store card details.
• Neon / PostgreSQL hosting: Your account and usage data is stored in an encrypted database.
• Sentry: Anonymised error and performance data for platform reliability.

All service providers are contractually required to handle your data securely and only for the purposes we specify.`,
          },
          {
            title: 'Data retention',
            content: `We retain your data for as long as your account is active. If you delete your account, your personal data is deleted within 30 days. Anonymised, aggregated usage data (with no link to your identity) may be retained for platform improvement.

Research analysis history is retained for up to 12 months to show your past analyses in the dashboard.`,
          },
          {
            title: 'Your rights',
            content: `You have the right to:

• Access a copy of the personal data we hold about you
• Correct any inaccurate data
• Request deletion of your account and associated data
• Opt out of marketing emails (the weekly digest can be disabled in your profile settings)
• Withdraw consent at any time

To exercise any of these rights, contact us at the email address in your account settings or use the in-app account deletion option. We will respond within 30 days.`,
          },
          {
            title: 'Security',
            content: `We take reasonable technical measures to protect your data, including:

• Encrypted database storage
• Secure HTTPS connections
• Password hashing (bcrypt) — we never store plain text passwords
• Environment-level secrets management for API keys

No system is perfectly secure. In the event of a data breach that affects your personal data, we will notify you as required by applicable law.`,
          },
          {
            title: 'Contact',
            content: `For privacy-related questions, data requests, or to report a concern, contact us at the email address displayed in your ARIA Research account settings page.`,
          },
        ].map(({ title, content }) => (
          <section key={title} className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">{title}</h2>
            <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{content}</div>
          </section>
        ))}

        <p className="text-xs text-gray-400 text-center">
          <Link href="/disclaimer" className="underline">Disclaimer</Link> · <Link href="/terms" className="underline">Terms of Service</Link>
        </p>
      </main>
    </div>
  )
}
