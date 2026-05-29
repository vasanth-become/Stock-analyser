/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable server instrumentation (used for cron job initialisation)
  experimental: {
    instrumentationHook: true,
  },
  images: {
    domains: ['avatars.githubusercontent.com'],
  },
  // Suppress yahoo-finance2 punycode deprecation warning
  webpack(config) {
    config.ignoreWarnings = [{ module: /node_modules\/punycode/ }]
    return config
  },
}

export default nextConfig
