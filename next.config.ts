import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @vercel/blob kliens-feltöltés: ne próbálkozzon újra 10x exponenciális
  // backoff-fal nem-átmeneti (pl. hálózat által blokkolt) hibák esetén –
  // így a feltöltési hiba azonnal látszik, nem percekig "lóg" a kérés.
  env: {
    VERCEL_BLOB_RETRIES: "0",
  },

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
