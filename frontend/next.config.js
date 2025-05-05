/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer, nextRuntime }) => {
    // Fix for the missing vendor-chunks
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        stream: false,
        crypto: false,
        zlib: false,
        http: false,
        https: false,
        path: false,
        os: false,
        // Add any other modules that might be causing issues
      };
    }

    // Add aliases for problematic dependencies
    config.resolve.alias = {
      ...config.resolve.alias,
      'get-nonce': path.resolve(__dirname, 'node_modules/get-nonce'),
      'detect-node-es': path.resolve(__dirname, 'node_modules/detect-node-es'),
      'use-sidecar': path.resolve(__dirname, 'node_modules/use-sidecar'),
      'react-style-singleton': path.resolve(__dirname, 'node_modules/react-style-singleton'),
      'react-remove-scroll': path.resolve(__dirname, 'node_modules/react-remove-scroll')
    };

    // Improve handling of Radix UI components
    config.module = {
      ...config.module,
      exprContextCritical: false,
    };

    // Ensure we're not trying to bundle node modules on server
    if (isServer && nextRuntime === 'nodejs') {
      config.externals = [...(config.externals || [])];
    }

    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '**.google.com',
      },
      {
        protocol: 'http',
        hostname: 'books.google.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'images.aeonmedia.co',
      },
      {
        protocol: 'https',
        hostname: 'media.newyorker.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.theatlantic.com',
      },
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      }
    ]
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        // Allow direct access to public images regardless of auth status
        source: '/:path*.(png|jpg|jpeg|svg|gif|webp)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig; 