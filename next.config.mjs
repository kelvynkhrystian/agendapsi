import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {
    resolveAlias: {
      "motion/react": "./src/lib/safe-motion-react.ts",
    },
  },
  webpack(config) {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "motion/react": path.resolve(__dirname, "src/lib/safe-motion-react.ts"),
    };
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/site',
        destination: '/',
      },
    ];
  },
};

export default nextConfig;
