import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthSessionProvider } from '@/components/providers/SessionProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'StockSage India - AI-Powered Stock Analysis',
    template: '%s | StockSage India',
  },
  description: 'AI-powered stock market analyser for Indian retail investors. Get personalised insights for NSE and BSE stocks.',
  keywords: ['stock market', 'NSE', 'BSE', 'India', 'stock analysis', 'AI', 'investment'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  )
}
