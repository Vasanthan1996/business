import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page here depends on the signed-in user and live sheet data, so the
  // app renders on request. Cache Components (on by default in new Next 16
  // apps) is left off to keep data fresh and the code simple.
  serverExternalPackages: ["googleapis"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  poweredByHeader: false,
};

export default nextConfig;
