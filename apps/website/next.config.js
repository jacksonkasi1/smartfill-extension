/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [],
  typedRoutes: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig