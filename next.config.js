/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    if (process.env.NEXT_PUBLIC_SUPABASE_PROXY_ENABLED !== 'true') return []
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) return []
    return [
      {
        source: '/supabase-proxy/:path*',
        destination: `${supabaseUrl}/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
