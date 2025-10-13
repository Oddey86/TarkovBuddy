/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    domains: ['assets.tarkov.dev', 'tarkov.dev'],
  },
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
