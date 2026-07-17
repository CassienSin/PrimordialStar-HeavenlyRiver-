import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  allowedDevOrigins: ['*.trycloudflare.com'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10gb',
    },
  },
}

export default nextConfig