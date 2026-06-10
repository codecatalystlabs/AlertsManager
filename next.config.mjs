/** @type {import('next').NextConfig} */
// Rewrite target must be an absolute upstream URL — never use NEXT_PUBLIC (/api/v1).
// Defaults to the deployed backend; set API_BASE_URL in .env to use a local API.
const apiBaseUrl = (
  process.env.API_BASE_URL || "https://alerts.health.go.ug/api/v1"
).replace(/\/$/, "")

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Turbopack is the default bundler in Next 16. The dynamically-imported `xlsx`
  // library references Node built-ins (fs/path/crypto) that are never executed
  // in the browser; alias them to an empty module so the client bundle resolves.
  // (Replaces the old webpack `resolve.fallback: { fs: false, ... }`.)
  turbopack: {
    resolveAlias: {
      fs: { browser: "./lib/empty-module.ts" },
      path: { browser: "./lib/empty-module.ts" },
      crypto: { browser: "./lib/empty-module.ts" },
    },
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
