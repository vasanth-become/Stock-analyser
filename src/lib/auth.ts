import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
      // Allow client-side session update to refresh onboarded flag
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
  pages: {
    signIn: '/login',
    error: '/login',
    newUser: '/onboarding',
  },
  events: {
    async createUser({ user }) {
      // New Google OAuth users land on /onboarding via newUser page
      // Credentials users are handled post-register
      void user
    },
  },
})
