import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Makes `href` values compile-checked against the real route tree, so a typo
  // in a link fails the build instead of shipping a dead link.
  typedRoutes: true,
  images: {
    remotePatterns: [
      // Mock listing photos (lib/marketplace-data.ts). The homepage hero's
      // photos are bundled under public/landing and need no remote host.
      { protocol: "https", hostname: "images.unsplash.com" },
      // Real listing photos: storage_service.photo_url (API repo) hands back
      // the bucket's public URL - virtual-hosted-style, so the bucket name
      // is a subdomain of the hostname rather than sitting in the pathname.
      { protocol: "https", hostname: "*.s3.*.amazonaws.com" },
    ],
  },
};

export default nextConfig;
