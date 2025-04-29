/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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