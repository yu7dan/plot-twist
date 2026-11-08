import type { NextConfig } from "next";

// Link-preview images read these at runtime; make sure they ship with the server functions.
const ogFiles = ["src/assets/fonts/*.ttf", "public/assets/logo-head.png", "public/assets/m-secret.png", "public/assets/m-surprise.png"];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  outputFileTracingIncludes: {
    "/opengraph-image": ogFiles,
    "/g/[code]/opengraph-image": ogFiles,
  },
};

export default nextConfig;
