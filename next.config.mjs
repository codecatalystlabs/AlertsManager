/** @type {import('next').NextConfig} */
// Rewrite target must be an absolute upstream URL — never use NEXT_PUBLIC (/api/v1).
// Defaults to the deployed backend; set API_BASE_URL in .env to use a local API.
const apiBaseUrl = (
  process.env.API_BASE_URL || "https://alerts.health.go.ug/api/v1"
).replace(/\/$/, "")

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      }
    }
    return config
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiBaseUrl}/:path*`,
      },
    ]
  },
}

export default nextConfig
