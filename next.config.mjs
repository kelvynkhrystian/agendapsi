/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: '/site',
        destination: '/',
      },
    ];
  },
};

export default nextConfig;
