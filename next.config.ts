import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  webpack: (config) => {
    config.resolve.fallback = {
      ...(config.resolve.fallback ?? {}),
      fs: false,
      net: false,
      tls: false,
    };
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      buffer: "buffer",
    };
    const extra = ["pino-pretty", "lokijs", "encoding"];
    if (Array.isArray(config.externals)) config.externals.push(...extra);
    else config.externals = [config.externals, ...extra];
    return config;
  },
};

export default nextConfig;
