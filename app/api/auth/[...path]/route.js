const FALLBACK_AUTH_BASE_URL = "https://ep-tiny-field-b31qe8hd.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth";

function authBaseUrl() {
  const value =
    process.env.NEON_AUTH_BASE_URL ||
    process.env.NEXT_PUBLIC_NEON_AUTH_URL ||
    FALLBACK_AUTH_BASE_URL;
  return value.trim().replace(/\/$/, "");
}

async function proxy(request, context) {
  const { path = [] } = await context.params;
  const upstream = new URL(`${authBaseUrl()}/${path.join("/")}`);

  // Preserve query parameters used by Better Auth callbacks/session flows.
  const incoming = new URL(request.url);
  incoming.searchParams.forEach((value, key) => upstream.searchParams.append(key, value));

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.delete("connection");
  headers.set("accept-encoding", "identity");

  const init = {
    method: request.method,
    headers,
    redirect: "manual",
    cache: "no-store",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  try {
    const response = await fetch(upstream, init);
    const responseHeaders = new Headers(response.headers);

    // Never expose an upstream host in redirects; keep auth navigation same-origin.
    const location = responseHeaders.get("location");
    if (location) {
      try {
        const redirectUrl = new URL(location, upstream);
        if (redirectUrl.origin === upstream.origin) {
          responseHeaders.set("location", `/api/auth${redirectUrl.pathname.replace(authBaseUrl().replace(upstream.origin, ""), "")}${redirectUrl.search}`);
        }
      } catch {}
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[gd-auth-proxy]", {
      path: path.join("/"),
      message: error instanceof Error ? error.message : String(error),
      upstreamHost: upstream.host,
    });
    return Response.json({ error: { message: "Authentication service temporarily unavailable" } }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
