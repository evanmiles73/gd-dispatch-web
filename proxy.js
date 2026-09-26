import { auth } from "./lib/auth/server";

// Keep public machine-to-machine LINE endpoints out of the interactive sign-in flow.
// Webhook requests are authenticated with X-Line-Signature in the route itself.
// Status/process are operational endpoints and must return API responses rather than HTML sign-in pages.
export default auth.middleware({ loginUrl: "/auth/sign-in" });

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/line/webhook|api/line/status|api/line/process|auth).*)",
  ],
};
