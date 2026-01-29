/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  reactStrictMode: true,
  
  experimental: {
    // Speed up compilation of your large dependencies
    optimizePackageImports: [
      'lucide-react',
      '@react-pdf/renderer',
      'firebase',
      '@anthropic-ai/sdk',
      '@google/generative-ai',
      'date-fns',
      'jspdf',
      'html2canvas',
      'twilio'
    ],
  },
};

// Only wrap with PWA in production to avoid dev overhead
if (process.env.NODE_ENV === 'production') {
  const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    buildExcludes: [/middleware-manifest\.json$/],
    publicExcludes: ['!robots.txt', '!sitemap.xml'],
  });
  
  module.exports = withPWA(nextConfig);
} else {
  module.exports = nextConfig;
}