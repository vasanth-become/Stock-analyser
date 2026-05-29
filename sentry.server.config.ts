import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_ENV ?? 'development',
    tracesSampleRate: process.env.NEXT_PUBLIC_ENV === 'production' ? 0.1 : 1.0,
    enabled: process.env.NEXT_PUBLIC_ENV === 'production',

    integrations: [
      Sentry.prismaIntegration(), // trace Prisma queries
    ],

    beforeSend(event) {
      // Never leak database credentials in error payloads
      if (event.extra?.DATABASE_URL) delete event.extra.DATABASE_URL
      return event
    },
  })
}
