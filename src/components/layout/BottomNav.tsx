'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, BarChart2, Target, Bell, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard',             label: 'Home',    icon: LayoutDashboard, exact: true },
  { href: '/dashboard/investments', label: 'Invest',  icon: BarChart2,        exact: false },
  { href: '/dashboard/plan',        label: 'Plan',    icon: Target,           exact: false },
  { href: '/dashboard/alerts',      label: 'Alerts',  icon: Bell,             exact: false },
  { href: '/dashboard/aria',        label: 'ARIA',    icon: Sparkles,         exact: false },
]

export function BottomNav() {
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-200 pb-4 safe-area-pb">
      <div className="flex items-stretch">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          const isAlerts = href === '/dashboard/alerts'
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                active ? 'text-blue-600' : 'text-gray-500',
              )}
            >
              <span className="relative">
                <Icon className={cn('h-5 w-5', active && 'fill-blue-100')} />
                {isAlerts && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
                )}
              </span>
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
