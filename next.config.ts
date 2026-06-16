import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. React Compiler
  reactCompiler: true,

  // 2. Naplózás
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // 4. Képkezelés
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
    ],
  },

  experimental: {},
};

export default nextConfig;
