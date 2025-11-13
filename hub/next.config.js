/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbopack: {
      root: __dirname,
    },
  },
  // Mark pdf-parse and its dependencies as external for server-side routes
  serverExternalPackages: ['pdf-parse', 'pdf-parse/node', '@napi-rs/canvas', 'canvas', 'pdfjs-dist'],
  // Webpack configuration as fallback for non-Turbopack builds
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Configure externals
      config.externals = config.externals || [];
      config.externals.push('pdf-parse', 'pdf-parse/node', '@napi-rs/canvas', 'canvas', 'pdfjs-dist');

      // Ignore pdf-parse test files to prevent ENOENT errors
      config.resolve = config.resolve || {};
      config.resolve.alias = config.resolve.alias || {};

      // Fallback for missing modules (test files)
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };

      // Add IgnorePlugin to ignore pdf-parse test directory
      const webpack = require('webpack');
      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^\.\/test\/data/,
          contextRegExp: /pdf-parse/,
        })
      );
    }
    return config;
  },
};

module.exports = nextConfig;
