import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_ENV ?? 'development',

    // Capture 10% of transactions in production, 100% in dev
    tracesSampleRate: process.env.NEXT_PUBLIC_ENV === 'production' ? 0.1 : 1.0,

    // Session replay: capture all error sessions, 10% of normal sessions
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,   // mask PII in replays
        blockAllMedia: true,
      }),
      Sentry.browserTracingIntegration(),
    ],

    // Don't send errors for localhost
    enabled: process.env.NEXT_PUBLIC_ENV === 'production',

    beforeSend(event) {
      // Strip anything that looks like an API key from error events
      if (event.request?.headers) {
        delete event.request.headers['authorization']
        delete event.request.headers['cookie']
      }
      return event
    },
  })
}
