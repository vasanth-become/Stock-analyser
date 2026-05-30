import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthSessionProvider } from '@/components/providers/SessionProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'ARIA Research — AI-Powered Investment Research for Indian Investors',
    template: '%s | ARIA Research',
  },
  description: 'AI-powered investment research platform for Indian investors. Research insights for NSE and BSE stocks. Not SEBI-registered advisory.',
  keywords: ['stock research', 'NSE', 'BSE', 'India', 'AI research', 'investment research', 'ARIA Research'],
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
