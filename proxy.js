import { auth } from "./lib/auth/server";

// Keep public machine-to-machine endpoints out of the interactive sign-in flow.
// LINE authenticates webhook requests with X-Line-Signature in the route itself.
export default auth.middleware({ loginUrl: "/auth/sign-in" });

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/line/webhook|auth).*)",
  ],
};