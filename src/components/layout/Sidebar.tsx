'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, TrendingUp, BookOpen, BriefcaseBusiness,
  Bell, Search, Settings, HelpCircle, BarChart2, Star, PiggyBank, CreditCard,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/markets', label: 'Markets', icon: TrendingUp },
  { href: '/search', label: 'Stock Search', icon: Search },
  { href: '/watchlist', label: 'Watchlist', icon: BookOpen },
  { href: '/portfolio', label: 'Portfolio', icon: BriefcaseBusiness },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/analysis', label: 'AI Analysis', icon: BarChart2 },
  { href: '/recommendations', label: 'Recommendations', icon: Star },
  { href: '/sip-planner', label: 'SIP Planner', icon: PiggyBank },
]

const bottomItems = [
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/help', label: 'Help', icon: HelpCircle },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen border-r border-gray-200 bg-white">
      <div className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                pathname.startsWith(href)
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="px-3 py-4 border-t border-gray-200">
        {bottomItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>
    </aside>
  )
}
