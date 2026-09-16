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
      // a time-limited presigned GET URL, since the bucket has no public/CDN
      // read path - path-style, so the bucket sits in the pathname rather
      // than as a hostname subdomain
      { protocol: "https", hostname: "s3.*.amazonaws.com" },
    ],
  },
};

export default nextConfig;
