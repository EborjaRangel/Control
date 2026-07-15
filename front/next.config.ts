import type { NextConfig } from "next";

const apiProxy =
  process.env.API_PROXY_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${apiProxy}/api/:path*` },
      { source: "/uploads/:path*", destination: `${apiProxy}/uploads/:path*` },
      { source: "/health", destination: `${apiProxy}/health` },
    ];
  },
};

export default nextConfig;
