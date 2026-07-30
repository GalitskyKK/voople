import { NextResponse, type NextRequest } from "next/server";

const ALLOWED_PREFIXES = new Set(["auth", "rest", "storage", "functions"]);
const FORWARDED_REQUEST_HEADERS = [
  "accept",
  "accept-profile",
  "apikey",
  "authorization",
  "content-profile",
  "content-type",
  "prefer",
  "range",
  "x-client-info",
] as const;
const FORWARDED_RESPONSE_HEADERS = [
  "content-length",
  "content-range",
  "content-type",
  "location",
  "range",
  "x-supabase-api-version",
] as const;
const MAX_PROXY_BODY_BYTES = 12 * 1024 * 1024;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getUpstreamUrl(request: NextRequest, path: string[]) {
  const base = process.env.SUPABASE_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !path.length || !ALLOWED_PREFIXES.has(path[0]!)) return null;

  const url = new URL(path.map(encodeURIComponent).join("/"), `${base.replace(/\/$/, "")}/`);
  url.search = request.nextUrl.search;
  return url;
}

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const upstreamUrl = getUpstreamUrl(request, path);
  if (!upstreamUrl) {
    return NextResponse.json({ error: "Unsupported Supabase endpoint" }, { status: 404 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_PROXY_BODY_BYTES) {
    return NextResponse.json({ error: "Proxy request is too large" }, { status: 413 });
  }

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (!headers.has("apikey") && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    headers.set("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : undefined;
  if (body && body.byteLength > MAX_PROXY_BODY_BYTES) {
    return NextResponse.json({ error: "Proxy request is too large" }, { status: 413 });
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const responseHeaders = new Headers({ "cache-control": "private, no-store" });
    for (const name of FORWARDED_RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[supabase-proxy]", error);
    return NextResponse.json(
      { error: "Supabase upstream is temporarily unavailable" },
      { status: 503, headers: { "cache-control": "private, no-store" } },
    );
  }
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
export const HEAD = forward;
