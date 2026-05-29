import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      onboarded: boolean
      plan: string
      role: string
    }
  }

  interface User {
    onboarded?: boolean
    plan?: string
    role?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    onboarded?: boolean
    plan?: string
    role?: string
  }
}
