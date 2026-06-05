'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, BarChart2, Target, Bell, Sparkles,
  CreditCard, Settings, HelpCircle, ShieldAlert, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard',             label: 'Home',           icon: LayoutDashboard, exact: true },
  { href: '/dashboard/investments', label: 'My Investments', icon: BarChart2,        exact: false },
  { href: '/dashboard/plan',        label: 'Plan',           icon: Target,           exact: false },
  { href: '/dashboard/alerts',      label: 'Alerts',         icon: Bell,             exact: false },
  { href: '/dashboard/aria',        label: 'ARIA',           icon: Sparkles,         exact: false },
]

const bottomItems = [
  { href: '/billing',  label: 'Billing',  icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/help',     label: 'Help',     icon: HelpCircle },
]

const legalItems = [
  { href: '/disclaimer', label: 'Disclaimer', icon: ShieldAlert },
  { href: '/terms',      label: 'Terms',      icon: FileText },
  { href: '/privacy',    label: 'Privacy',    icon: FileText },
]

export function Sidebar() {
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetch('/api/alerts/unread-count')
      .then((r) => r.json())
      .then((d) => setUnreadCount(d.count ?? 0))
      .catch(() => {})
  }, [])

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen border-r border-gray-200 bg-white">
      <div className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact)
            const isAlerts = href === '/dashboard/alerts'
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                )}
              >
                <span className="relative shrink-0">
                  <Icon className="h-4 w-4" />
                  {isAlerts && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="px-3 py-4 border-t border-gray-200 space-y-1">
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
        <div className="pt-2 border-t border-gray-100">
          {legalItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  )
}
