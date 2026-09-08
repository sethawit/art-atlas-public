import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Phase 1 sources only (docs/adr/0001-phase-1-stack.md); widen when ticket 05 adds
    // sources beyond the Met + AIC.
    remotePatterns: [
      { protocol: "https", hostname: "images.metmuseum.org" },
      { protocol: "https", hostname: "www.artic.edu" },
    ],
  },
};

export default nextConfig;
