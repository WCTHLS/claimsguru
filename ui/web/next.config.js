/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: { unoptimized: true },
  output: 'standalone',
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'wct-health.com',
          },
        ],
        destination: 'https://www.wct-health.com/:path*',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/policy&privacy',
        destination: '/privacy&policy',
      },
      {
        source: '/privacy-policy',
        destination: '/privacy&policy',
      },
      {
        source: '/privacy',
        destination: '/privacy&policy',
      },
      {
        source: '/policy',
        destination: '/privacy&policy',
      },
    ];
  },
};

module.exports = nextConfig;
