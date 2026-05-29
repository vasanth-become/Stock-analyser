import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProfileForm } from './ProfileForm'

export const metadata = { title: 'Investor Profile' }

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const profile = await prisma.investorProfile.findUnique({
    where: { userId: session.user.id },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Investor Profile</h1>
        <p className="text-gray-500 text-sm mt-1">
          Complete your profile so we can personalise stock recommendations and AI analysis for you.
        </p>
      </div>
      <ProfileForm profile={profile} />
    </div>
  )
}
