const STATIC_ROOTS = new Set([
  "admin", "events", "explore", "feed", "help", "legal", "login", "me",
  "messages", "notifications", "onboarding", "register", "settings", "shop",
  "api", "trpc",
]);

/** Converts a navigation path into a privacy-safe product surface template. */
export function telemetryRouteTemplate(pathname: string) {
  const segments = pathname
    .split("?")[0]
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.replace(/[^a-zA-Z0-9_-]/g, ""));
  if (segments.length === 0) return "/";

  const root = segments[0].toLowerCase();
  if (["messages", "post"].includes(root) && segments.length > 1) return `/${root}/_id`;
  if (root === "invite" && segments.length > 1) return "/invite/_token";
  if (root === "group" && segments.length > 1) return "/group/_slug";
  if (root === "hashtag" && segments.length > 1) return "/hashtag/_tag";
  if (!STATIC_ROOTS.has(root)) return "/_profile";
  return `/${segments.slice(0, 4).join("/")}`.slice(0, 160);
}
