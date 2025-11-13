/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbopack: {
      root: __dirname,
    },
  },
  // Mark pdf-parse and its dependencies as external for server-side routes
  serverExternalPackages: ['pdf-parse', '@napi-rs/canvas', 'canvas'],
  // Webpack configuration as fallback for non-Turbopack builds
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('pdf-parse', '@napi-rs/canvas', 'canvas');
    }
    return config;
  },
};

module.exports = nextConfig;
