import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @vercel/blob kliens-feltöltés: alapból 10x próbálkozik exponenciális
  // backoff-fal (percekig tarthat) – 3-ra csökkentve gyorsabb visszajelzés,
  // de az átmeneti (pl. "service_unavailable") hibákra így is van pár
  // automatikus újrapróbálkozás.
  env: {
    VERCEL_BLOB_RETRIES: "3",
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
