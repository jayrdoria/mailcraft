import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  basePath: '/mailcraft',
  assetPrefix: '/mailcraft',
  output: 'standalone',
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

export default nextConfig
