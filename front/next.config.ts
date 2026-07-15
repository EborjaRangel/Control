import type { NextConfig } from "next";

const apiProxy =
  process.env.API_PROXY_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

const apiHost = (() => {
  try {
    return new URL(apiProxy).hostname;
  } catch {
    return undefined;
  }
})();

const nextConfig: NextConfig = {
  images: {
    localPatterns: [{ pathname: "/uploads/**", search: "" }],
    ...(apiHost
      ? {
          remotePatterns: [
            {
              protocol: "https",
              hostname: apiHost,
              pathname: "/uploads/**",
              search: "",
            },
          ],
        }
      : {}),
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${apiProxy}/api/:path*` },
      { source: "/uploads/:path*", destination: `${apiProxy}/uploads/:path*` },
      { source: "/health", destination: `${apiProxy}/health` },
    ];
  },
};

export default nextConfig;
