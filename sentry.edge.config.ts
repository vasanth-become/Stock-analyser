import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_ENV ?? 'development',
    tracesSampleRate: 0.05, // lower sample rate for Edge — high volume
    enabled: process.env.NEXT_PUBLIC_ENV === 'production',
  })
}
