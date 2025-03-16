/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  redirects: async () => [
    {
      source: '/',
      destination: '/dashboard/meetings',
      permanent: false,
    },
  ],
}

export default nextConfig
