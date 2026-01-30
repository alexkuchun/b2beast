import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["lucide-react"],
  experimental: {
    swcPlugins: [["@lingui/swc-plugin", {}]],
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.po$/,
      use: "@lingui/loader",
    });
    return config;
  },
};

// added by create cloudflare to enable calling `getCloudflareContext()` in `next dev`
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();

export default nextConfig;
