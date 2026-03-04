/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@midforge/db', '@midforge/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com',
      },
    ],
  },
};

module.exports = nextConfig;
