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
  async rewrites() {
    return [
      {
        source: '/policy&privacy',
        destination: '/privacy&policy',
      },
    ];
  },
};

module.exports = nextConfig;
