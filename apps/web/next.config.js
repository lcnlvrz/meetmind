/** @type {import('next').NextConfig} */
const nextConfig = {
  redirects: async () => [
    {
      source: '/',
      destination: '/meetings',
      permanent: false,
    },
  ],
}

export default nextConfig
