import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Makes `href` values compile-checked against the real route tree, so a typo
  // in a link fails the build instead of shipping a dead link.
  typedRoutes: true,
  // Without this, Next.js finds the sibling lockfile in ../ (the main app)
  // and infers *that* directory as the workspace root, which resolves
  // "@/..." imports and route conventions (e.g. proxy.ts) against the main
  // app's src/ instead of this one.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
