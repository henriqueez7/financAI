import type { NextConfig } from "next";

import { resolvePublicApiUrl } from "./config/public-api-url";

const isProduction =
  process.env.NODE_ENV === "production";
const apiOrigin = new URL(
  resolvePublicApiUrl(),
).origin;

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin}${isProduction ? "" : " ws: wss:"}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  isProduction ? "upgrade-insecure-requests" : "",
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

const privateDataHeaders = [
  {
    key: "Cache-Control",
    value:
      "no-store, private, max-age=0, must-revalidate",
  },
  {
    key: "Pragma",
    value: "no-cache",
  },
];

const authenticatedRouteSources = [
  "/dashboard/:path*",
  "/entries/:path*",
  "/accounts/:path*",
  "/categories/:path*",
  "/budgets/:path*",
  "/goals/:path*",
  "/reports/:path*",
  "/ai/:path*",
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      ...authenticatedRouteSources.map((source) => ({
        source,
        headers: privateDataHeaders,
      })),
      ...(isProduction
        ? [
            {
              source: "/:path*",
              has: [
                {
                  type: "header" as const,
                  key: "x-forwarded-proto",
                  value: "https",
                },
              ],
              missing: [
                {
                  type: "host" as const,
                  value:
                    "localhost(?::\\d+)?",
                },
                {
                  type: "host" as const,
                  value:
                    "127\\.0\\.0\\.1(?::\\d+)?",
                },
              ],
              headers: [
                {
                  key: "Strict-Transport-Security",
                  value:
                    "max-age=31536000; includeSubDomains",
                },
              ],
            },
          ]
        : []),
    ];
  },
};

export default nextConfig;
