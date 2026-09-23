import { createNeonAuth } from "@neondatabase/auth/next/server";

const baseUrl = (
  process.env.NEON_AUTH_BASE_URL ||
  process.env.NEXT_PUBLIC_NEON_AUTH_URL ||
  "https://ep-tiny-field-b31qe8hd.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth"
).trim();

// Neon Auth requires a cookie signing secret of at least 32 characters.
// Prefer the dedicated secret. For this existing deployment, DATABASE_URL is
// a server-only secret and provides a safe fallback so auth does not crash
// when NEON_AUTH_COOKIE_SECRET was never configured in Vercel.
const cookieSecret = (
  process.env.NEON_AUTH_COOKIE_SECRET ||
  process.env.DATABASE_URL ||
  process.env.NEON_DATABASE_URL ||
  ""
).trim();

if (cookieSecret.length < 32) {
  throw new Error(
    "Auth configuration error: set NEON_AUTH_COOKIE_SECRET (32+ characters) or DATABASE_URL"
  );
}

export const auth = createNeonAuth({
  baseUrl,
  cookies: {
    secret: cookieSecret,
    sessionDataTtl: 300,
    sameSite: "lax",
  },
  logLevel: "warn",
});
