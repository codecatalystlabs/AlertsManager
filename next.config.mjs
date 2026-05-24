/** @type {import('next').NextConfig} */
// Rewrite target must be an absolute upstream URL — never use NEXT_PUBLIC (/api/v1).
const apiBaseUrl = (
  process.env.API_BASE_URL || "http://127.0.0.1:8089/api/v1"
).replace(/\/$/, "")

// Surface the proxy target at boot so misconfigured environments are obvious.
// (Next.js loads .env once at process start — restart `next dev` after edits.)
console.log(`[api proxy] /api/v1/* → ${apiBaseUrl}/*`)

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
  // Pipe the upstream URL through to the browser so error messages can show
  // the real target (instead of inventing "127.0.0.1:8089"). Only enabled in
  // development — production should rely on same-origin proxying.
  env:
    process.env.NODE_ENV === "development"
      ? { NEXT_PUBLIC_API_UPSTREAM_HINT: apiBaseUrl }
      : undefined,
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
