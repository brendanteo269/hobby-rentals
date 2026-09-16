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
      // Real listing photos: storage_service.photo_url (API repo) hands back
      // the bucket's public URL - virtual-hosted-style, so the bucket name
      // is a subdomain of the hostname rather than sitting in the pathname.
      { protocol: "https", hostname: "*.s3.*.amazonaws.com" },
    ],
  },
};

export default nextConfig;
