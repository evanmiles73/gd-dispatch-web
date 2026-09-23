import { createNeonAuth } from "@neondatabase/auth/next/server";

const baseUrl=(process.env.NEON_AUTH_BASE_URL||process.env.NEXT_PUBLIC_NEON_AUTH_URL||"https://ep-tiny-field-b31qe8hd.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth").trim();
const cookieSecret=(process.env.NEON_AUTH_COOKIE_SECRET||"").trim();

export const auth = createNeonAuth({
  baseUrl,
  cookies: {
    secret: cookieSecret,
    sessionDataTtl: 300,
    sameSite: "lax",
  },
  logLevel: "warn",
});
