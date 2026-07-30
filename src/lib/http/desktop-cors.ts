const DESKTOP_PRODUCTION_ORIGINS = new Set([
  "http://tauri.localhost",
  "https://tauri.localhost",
  "tauri://localhost",
]);

function isAllowedDesktopOrigin(origin: string) {
  if (DESKTOP_PRODUCTION_ORIGINS.has(origin)) return true;

  const configuredOrigin = process.env.DESKTOP_DEV_ORIGIN;
  if (configuredOrigin && origin === configuredOrigin) return true;

  return (
    process.env.NODE_ENV !== "production" &&
    (origin === "http://127.0.0.1:1420" || origin === "http://localhost:1420")
  );
}

export function withDesktopCors(request: Request, response: Response) {
  const origin = request.headers.get("origin");
  if (!origin || !isAllowedDesktopOrigin(origin)) return response;

  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  headers.set("Access-Control-Max-Age", "86400");
  headers.append("Vary", "Origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function desktopCorsPreflight(request: Request) {
  return withDesktopCors(request, new Response(null, { status: 204 }));
}
