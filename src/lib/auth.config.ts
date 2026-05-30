import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'

/**
 * Edge-safe auth config — no Prisma, no bcrypt, no Node.js-only modules.
 * Used by middleware.ts which runs in the Edge runtime.
 * Full auth (with PrismaAdapter + bcrypt) lives in auth.ts.
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // Credentials provider with no authorize logic here —
    // real authorize runs in auth.ts (Node.js only).
    Credentials({}),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.onboarded = (user as { onboarded?: boolean }).onboarded ?? false
        token.plan = (user as { plan?: string }).plan ?? 'FREE'
        token.role = (user as { role?: string }).role ?? 'USER'
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
}
