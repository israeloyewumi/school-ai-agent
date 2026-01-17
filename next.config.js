/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/],
  // Updated for Next.js 16 compatibility
  publicExcludes: ['!robots.txt', '!sitemap.xml'],
});

const nextConfig = {
  reactCompiler: true,
  reactStrictMode: true,
  
  // ✅ Add empty turbopack config to silence the warning
  turbopack: {},
  
  // ✅ Explicitly tell Next.js we're aware of the webpack config
  webpack: (config, { isServer }) => {
    // Return the config as-is (next-pwa handles it)
    return config;
  },
};

module.exports = withPWA(nextConfig);