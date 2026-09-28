const PUBLIC_PATHS = [
  "/login", "/register", "/auth", "/feed", "/group", "/explore",
  "/hashtag", "/post", "/shop", "/legal", "/invite",
  "/room-guest", "/download", "/api",
];

export function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/favicon.ico" || pathname.startsWith("/favicon/")) return true;
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return true;
  const segments = pathname.split("/").filter(Boolean);
  return segments.length === 1 && !["messages", "notifications"].includes(segments[0]!);
}
