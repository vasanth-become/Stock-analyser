import { withSentryConfig } from '@sentry/nextjs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output creates a self-contained server bundle — required for Docker
  output: 'standalone',

  // Enable server instrumentation (cron init + Sentry + env validation)
  experimental: {
    instrumentationHook: true,
  },

  images: {
    domains: ['avatars.githubusercontent.com'],
  },

  webpack(config) {
    config.ignoreWarnings = [{ module: /node_modules\/punycode/ }]

    // Webpack treats '.prisma/client/default' as a relative path (starts with '.'),
    // but Node.js treats it as a package name and finds node_modules/.prisma/client/default.
    // This alias tells webpack where to find it.
    config.resolve.alias = {
      ...config.resolve.alias,
      '.prisma/client/default': require.resolve('.prisma/client/default'),
    }

    return config
  },

  // Security headers applied to every response
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      {
        // Allow Razorpay checkout iframe on payment pages
        source: '/pricing',
        headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: false,
})
