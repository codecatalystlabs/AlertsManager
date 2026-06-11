/** @type {import('next').NextConfig} */
// /api/v1/* is proxied by app/api/v1/[...path]/route.ts (which forwards only an
// allowlist of headers); a rewrite here would shadow nothing but, if it ever
// fired, would forward the full browser header set and re-trigger 431 errors.
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
}

export default nextConfig
