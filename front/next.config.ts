import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import path from "path";
import { fileURLToPath } from "url";

const frontDir = path.dirname(fileURLToPath(import.meta.url));
loadEnvConfig(frontDir);

function apiBaseUrl() {
  return (
    process.env.API_PROXY_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
    "http://localhost:4000"
  );
}

const apiHost = (() => {
  try {
    return new URL(apiBaseUrl()).hostname;
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
              protocol: "http",
              hostname: apiHost,
              pathname: "/uploads/**",
              search: "",
            },
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
    const apiProxy = apiBaseUrl();
    return [{ source: "/uploads/:path*", destination: `${apiProxy}/uploads/:path*` }];
  },
};

export default nextConfig;
