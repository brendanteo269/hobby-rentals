import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Makes `href` values compile-checked against the real route tree, so a typo
  // in a link fails the build instead of shipping a dead link.
  typedRoutes: true,
  images: {
    remotePatterns: [
      // Mock listing/hero photos, used as a stand-in for listings with no
      // uploaded photos of their own (see lib/mock-images.ts).
      { protocol: "https", hostname: "images.unsplash.com" },
      // Real listing photos, served from the S3 bucket's virtual-hosted-style
      // URL (see storage_service.photo_url in the API repo, which builds
      // exactly this hostname shape: <bucket>.s3.<region>.amazonaws.com).
      { protocol: "https", hostname: "*.s3.*.amazonaws.com" },
    ],
  },
};

export default nextConfig;
