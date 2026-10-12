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

  // node-ical nem bundlelhető Turbopack-kel (BigInt compat); a react-pdf natív
  // függőségei (fontkit, yoga) szintén szerveroldalon, bundle nélkül futnak.
  serverExternalPackages: ["node-ical", "@react-pdf/renderer"],

  // Az ajánlat PDF betűtípusai futáskor fájlból töltődnek be – kerüljenek a függvénybe.
  // (~60 KB, ezért minden függvénybe – így a server action útvonalától sem függ.)
  outputFileTracingIncludes: {
    "/**": ["./src/modules/offers/fonts/**"],
  },

  experimental: {},
};

export default nextConfig;
