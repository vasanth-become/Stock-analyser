import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL
  if (!email) {
    console.error('❌ ADMIN_EMAIL env var not set')
    process.exit(1)
  }

  // Upsert admin user
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: 'ADMIN',
      plan: 'PRO',
      subscriptionStatus: 'ACTIVE',
      planExpiresAt: null,      // never expires
      isTestAccount: true,
      digestEnabled: true,
    },
    create: {
      email,
      role: 'ADMIN',
      plan: 'PRO',
      subscriptionStatus: 'ACTIVE',
      planExpiresAt: null,
      isTestAccount: true,
      digestEnabled: true,
      onboarded: true,
    },
  })

  console.log(`✅ Admin account set up for: ${user.email}`)

  // Seed initial MonthlyApiUsage for current month
  const month = new Date().toISOString().slice(0, 7) // "2025-06"
  await prisma.monthlyApiUsage.upsert({
    where: { month },
    update: {},
    create: { month, totalCalls: 0, estimatedCost: 0 },
  })

  console.log(`✅ MonthlyApiUsage seeded for: ${month}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
