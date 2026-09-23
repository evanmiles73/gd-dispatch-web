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
  const base = authBaseUrl();
  const incoming = new URL(request.url);

  // Neon Auth exposes the Better Auth API below /api/auth.
  // The local route is also /api/auth/*, so forward the complete API path.
  const upstream = new URL(`${base}/api/auth/${path.join("/")}`);
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

    const location = responseHeaders.get("location");
    if (location) {
      try {
        const redirectUrl = new URL(location, upstream);
        if (redirectUrl.origin === upstream.origin) {
          const marker = "/api/auth/";
          const i = redirectUrl.pathname.indexOf(marker);
          const localPath = i >= 0 ? redirectUrl.pathname.slice(i + marker.length) : redirectUrl.pathname.replace(/^\//, "");
          responseHeaders.set("location", `/api/auth/${localPath}${redirectUrl.search}`);
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
      upstreamPath: upstream.pathname,
    });
    return Response.json(
      { error: { message: "Authentication service temporarily unavailable" } },
      { status: 502 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
