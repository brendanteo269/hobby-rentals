import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Makes `href` values compile-checked against the real route tree, so a typo
  // in a link fails the build instead of shipping a dead link.
  typedRoutes: true,
};

export default nextConfig;
