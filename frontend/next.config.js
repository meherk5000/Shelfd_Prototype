/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['date-fns', 'date-fns-tz'],
  experimental: {
    esmExternals: false // This will force Next.js to handle all ESM imports as CommonJS
  },
  images: {
    domains: [
      'localhost',
      'books.google.com',
      'image.tmdb.org',
      'avatars.githubusercontent.com',
      'lh3.googleusercontent.com',
      'www.themoviedb.org',
      'images-na.ssl-images-amazon.com',
      'storage.googleapis.com',
      'images.aeonmedia.co',
      'i.imgur.com',
      'media.newyorker.com'
    ],
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