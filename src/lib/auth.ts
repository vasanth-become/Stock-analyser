import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { authConfig } from './auth.config'

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    // Re-declare all providers with full Node.js implementations
    ...authConfig.providers.filter((p) => {
      // Keep Google; replace Credentials stub with the full version below
      const id = typeof p === 'function' ? undefined : (p as { id?: string }).id
      return id !== 'credentials'
    }),
    Credentials({
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        })

        if (!user || !user.password) return null

        const valid = await bcrypt.compare(parsed.data.password, user.password)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          onboarded: user.onboarded,
          plan: user.plan,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.onboarded = (user as { onboarded?: boolean }).onboarded ?? false
        token.plan = (user as { plan?: string }).plan ?? 'FREE'
        token.role = (user as { role?: string }).role ?? 'USER'
      }
      if (trigger === 'update' && session?.onboarded !== undefined) {
        token.onboarded = session.onboarded
      }
      // Re-read mutable fields from DB on every token refresh
      if (token.id && trigger === undefined) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { onboarded: true, plan: true, role: true },
        })
        if (dbUser) {
          token.onboarded = dbUser.onboarded
          token.plan = dbUser.plan
          token.role = dbUser.role
        }
      }
      return token
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      if (token.onboarded !== undefined) session.user.onboarded = token.onboarded as boolean
      session.user.plan = (token.plan as string) ?? 'FREE'
      session.user.role = (token.role as string) ?? 'USER'
      return session
    },
  },
  events: {
    async createUser({ user }) {
      void user
    },
  },
})
