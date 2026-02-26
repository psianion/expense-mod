/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Always expose /supabase-proxy on Vercel so it can act as a relay for local dev.
    // NEXT_PUBLIC_SUPABASE_URL must be the real Supabase URL here (not the proxy URL).
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
