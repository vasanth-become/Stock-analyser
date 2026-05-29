import Link from 'next/link'
import { LayoutDashboard, Users, Megaphone, ChevronRight } from 'lucide-react'

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/broadcast', label: 'Broadcast', icon: Megaphone },
]

export const metadata = { title: 'Admin — StockAnalyser' }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-gray-900 text-gray-100 shrink-0">
        <div className="px-4 py-5 border-b border-gray-700">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">StockAnalyser</p>
          <p className="text-sm font-semibold mt-0.5">Admin Panel</p>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-gray-700">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            Back to app <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
