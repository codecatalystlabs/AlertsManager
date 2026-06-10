/**
 * Empty stub used by `turbopack.resolveAlias` in next.config.mjs to satisfy
 * `fs`/`path`/`crypto` imports that the dynamically-imported `xlsx` library
 * references but never executes in the browser. Replaces the old webpack
 * `resolve.fallback: { fs: false, ... }` config, which Turbopack ignores.
 */
export default {};
