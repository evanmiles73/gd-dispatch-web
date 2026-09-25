import { createNeonAuth } from "@neondatabase/auth/next/server";

const baseUrl = (
  process.env.NEON_AUTH_BASE_URL ||
  process.env.NEXT_PUBLIC_NEON_AUTH_URL ||
  "https://ep-tiny-field-b31qe8hd.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth"
).trim();

// Neon Auth's server helper expects a cookies object during module
// initialization, including while Next.js collects route configuration.
// Keep session caching optional by disabling it explicitly when no valid
// secret is configured instead of omitting cookies entirely.
const configuredSecret = (process.env.NEON_AUTH_COOKIE_SECRET || "").trim();

const config = {
  baseUrl,
  logLevel: "warn",
  cookies: configuredSecret.length >= 32
    ? {
        secret: configuredSecret,
        sessionDataTtl: 300,
        sameSite: "lax",
      }
    : {
        enabled: false,
      },
};

export const auth = createNeonAuth(config);
