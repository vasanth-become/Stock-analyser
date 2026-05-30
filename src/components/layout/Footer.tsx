import Link from 'next/link'
import { TrendingUp } from 'lucide-react'
import { Disclaimer } from '@/components/ui/Disclaimer'

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white mt-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-6 justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="font-semibold text-gray-900 block text-sm">ARIA Research</span>
              <span className="text-xs text-gray-500">AI-powered investment research</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-900 transition-colors">Home</Link>
            <Link href="/pricing" className="hover:text-gray-900 transition-colors">Research Plans</Link>
            <Link href="/disclaimer" className="hover:text-gray-900 transition-colors">Disclaimer</Link>
            <Link href="/terms" className="hover:text-gray-900 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy</Link>
          </div>
        </div>
        <Disclaimer variant="footer" />
      </div>
    </footer>
  )
}
