/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@altrex/core', '@altrex/shared'],
  experimental: {
    serverComponentsExternalPackages: ['@altrex/core'],
  },
};

module.exports = nextConfig;
