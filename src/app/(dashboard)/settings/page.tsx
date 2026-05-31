import { auth, signOut } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { User, Shield, Bell, CreditCard, LogOut, Crown, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { SettingsForm } from '@/components/settings/SettingsForm'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      plan: true,
      role: true,
      onboarded: true,
      createdAt: true,
    },
  })

  if (!user) redirect('/login')

  const planLabel = user.plan === 'ENTERPRISE' ? 'Enterprise' : user.plan === 'PRO' ? 'Pro' : 'Free'
  const planColor = user.plan === 'ENTERPRISE' ? 'bg-amber-100 text-amber-800' : user.plan === 'PRO' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account, preferences, and subscription.</p>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Account
          </CardTitle>
          <CardDescription>Your profile and login details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt={user.name ?? 'User'} className="h-14 w-14 rounded-full object-cover border border-gray-200" />
            ) : (
              <div className="h-14 w-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold">
                {(user.name ?? user.email ?? 'U')[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900">{user.name ?? '—'}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
              <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${planColor}`}>{planLabel} plan</span>
            </div>
          </div>
          <SettingsForm name={user.name ?? ''} email={user.email ?? ''} />
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-600" />
            Subscription
          </CardTitle>
          <CardDescription>Your current plan and billing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user.plan !== 'PRO' && user.plan !== 'ENTERPRISE' ? (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-blue-900">You&apos;re on the Free plan</p>
                <p className="text-sm text-blue-700 mt-1">Upgrade to unlock AI research reports, quarterly reviews, and unlimited goals.</p>
              </div>
              <Link href="/pricing">
                <Button size="sm" className="shrink-0 gap-1.5">
                  <Crown className="h-3.5 w-3.5" />
                  Upgrade
                </Button>
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 flex items-center gap-3">
              <Crown className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-semibold text-amber-900">{planLabel} — active</p>
                <p className="text-sm text-amber-700 mt-0.5">All features unlocked. Thank you for supporting ARIA Research.</p>
              </div>
              <CheckCircle className="h-5 w-5 text-amber-600 ml-auto shrink-0" />
            </div>
          )}
          <div className="text-xs text-gray-500 flex items-center gap-1">
            Member since {new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            Notifications
          </CardTitle>
          <CardDescription>Choose what emails ARIA Research sends you</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-700">
            {[
              { label: 'Price alerts', desc: 'When a watchlist stock crosses your set price' },
              { label: 'Thesis reviews', desc: 'Weekly digest of thesis status changes' },
              { label: 'Goal updates', desc: 'Monthly progress on your financial goals' },
              { label: 'Quarterly report', desc: 'Your personalised portfolio health report' },
            ].map(({ label, desc }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
                <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">On</Badge>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">Email preferences coming soon — notifications are currently on by default.</p>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Security
          </CardTitle>
          <CardDescription>Account security options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b">
            <div>
              <p className="font-medium text-sm">Password</p>
              <p className="text-xs text-gray-500">Change your account password</p>
            </div>
            <Button variant="outline" size="sm" disabled>Change password</Button>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-sm">Two-factor authentication</p>
              <p className="text-xs text-gray-500">Add an extra layer of security</p>
            </div>
            <Badge variant="outline" className="text-gray-500">Coming soon</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <Card className="border-red-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <LogOut className="h-5 w-5" />
            Sign out
          </CardTitle>
          <CardDescription>Sign out of your ARIA Research account on this device</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/login' })
            }}
          >
            <Button type="submit" variant="destructive" className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
