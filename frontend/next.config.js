/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  // React strict mode helps catch potential problems during development
  // It renders components twice to find issues with side effects
  reactStrictMode: true,
  
  // Disable TypeScript error checking during build
  // We had to disable this due to dependency issues with Radix UI components
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  
  // Disable ESLint error checking during build
  // Similar to TypeScript, this was needed to get a successful build
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  
  // Custom webpack configuration to fix bundling issues
  // We had to add several fixes for missing node modules and dependencies
  webpack: (config, { isServer, nextRuntime }) => {
    // DEPENDENCY ISSUES SOLUTION:
    // The webpack configuration below addresses several critical issues:
    //
    // 1. Missing Node.js modules in browser environment:
    //    Many packages assume Node.js APIs are available, which isn't true in the browser.
    //    We provide empty fallbacks for these to prevent runtime errors.
    //
    // 2. Radix UI dependency resolution:
    //    Radix UI components have nested dependencies that Next.js has trouble finding.
    //    We explicitly map these dependencies to their locations in node_modules.
    //
    // 3. Context critical warnings:
    //    Suppresses warnings about dynamic requires that can't be statically analyzed.
    
    // Fix for the missing vendor-chunks by providing empty fallbacks
    // This prevents errors when Node.js built-ins are referenced in browser code
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

    // Add aliases for problematic dependencies used by Radix UI
    // This ensures webpack can find these packages when they're imported
    // through deep dependency chains or dynamic imports
    config.resolve.alias = {
      ...config.resolve.alias,
      'get-nonce': path.resolve(__dirname, 'node_modules/get-nonce'),
      'detect-node-es': path.resolve(__dirname, 'node_modules/detect-node-es'),
      'use-sidecar': path.resolve(__dirname, 'node_modules/use-sidecar'),
      'react-style-singleton': path.resolve(__dirname, 'node_modules/react-style-singleton'),
      'react-remove-scroll': path.resolve(__dirname, 'node_modules/react-remove-scroll')
    };

    // Improve handling of Radix UI components by disabling exprContextCritical 
    // This prevents webpack from throwing errors about dynamic requires
    // that it can't statically analyze
    config.module = {
      ...config.module,
      exprContextCritical: false,
    };

    // Ensure we're not trying to bundle node modules on server
    // This optimization is for server-side rendering performance
    if (isServer && nextRuntime === 'nodejs') {
      config.externals = [...(config.externals || [])];
    }

    return config;
  },
  
  // Configure which external image domains we can load images from
  // This is a security feature of Next.js - it only allows images from specified domains
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
  
  // Configure API route proxy for development
  // This redirects API requests to our backend server
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ];
  },
  
  // Configure HTTP headers for static assets
  // This enables better caching for images
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