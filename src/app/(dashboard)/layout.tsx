import { Navbar } from '@/components/layout/Navbar'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Footer } from '@/components/layout/Footer'
import { Disclaimer } from '@/components/ui/Disclaimer'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 min-w-0 p-4 lg:p-6 space-y-4 pb-20 lg:pb-6">
          <Disclaimer variant="banner" />
          {children}
        </main>
      </div>
      <BottomNav />
      <Footer />
    </div>
  )
}
