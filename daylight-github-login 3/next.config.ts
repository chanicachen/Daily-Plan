import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.BUILD_STANDALONE === "true" ? { output: "standalone" as const } : {}),
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
};

export default nextConfig;
