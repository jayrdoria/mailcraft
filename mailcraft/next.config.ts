import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  basePath: '/mailcraft',
  assetPrefix: '/mailcraft',
  output: 'standalone',
  devIndicators: false,
  env: {
    NEXT_PUBLIC_BASE_PATH: '/mailcraft',
  },
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
