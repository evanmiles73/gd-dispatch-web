import { createNeonAuth } from "@neondatabase/auth/next/server";

const baseUrl = (
  process.env.NEON_AUTH_BASE_URL ||
  process.env.NEXT_PUBLIC_NEON_AUTH_URL ||
  "https://ep-tiny-field-b31qe8hd.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth"
).trim();

// Session caching is optional. Do not make the entire auth route depend on a
// cookie secret: Neon Auth can still proxy sign-up/sign-in without it.
const configuredSecret = (process.env.NEON_AUTH_COOKIE_SECRET || "").trim();

const config = {
  baseUrl,
  logLevel: "warn",
};

if (configuredSecret.length >= 32) {
  config.cookies = {
    secret: configuredSecret,
    sessionDataTtl: 300,
    sameSite: "lax",
  };
}

export const auth = createNeonAuth(config);
