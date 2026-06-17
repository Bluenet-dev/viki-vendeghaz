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
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },

  // node-ical nem bundlelhető Turbopack-kel (BigInt compat)
  serverExternalPackages: ["node-ical"],

  experimental: {},
};

export default nextConfig;
