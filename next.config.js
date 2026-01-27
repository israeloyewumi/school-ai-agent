/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/],
  publicExcludes: ['!robots.txt', '!sitemap.xml'],
});

const nextConfig = {
  reactCompiler: true,
  reactStrictMode: true,
  
  turbopack: {},
};

module.exports = withPWA(nextConfig);