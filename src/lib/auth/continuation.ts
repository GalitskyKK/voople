const CONTINUATION_ORIGIN = "https://continuation.invalid";

/** A navigation hint only. The destination must still authorize the viewer. */
export function safeAuthContinuation(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith("/") || value.startsWith("//")) return null;
  if (/[\\\u0000-\u0020\u007f]/.test(value)) return null;
  try {
    const url = new URL(value, CONTINUATION_ORIGIN);
    if (url.origin !== CONTINUATION_ORIGIN) return null;
    // Reject encoded separators/control characters, including nested encodings,
    // before a router or proxy can interpret the path differently.
    let pathname = url.pathname;
    for (let depth = 0; depth < 5; depth += 1) {
      if (pathname.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(pathname) || /%(?:2f|5c)/i.test(pathname)) return null;
      const decoded = decodeURIComponent(pathname);
      if (decoded === pathname) return `${url.pathname}${url.search}${url.hash}`;
      pathname = decoded;
    }
  } catch {
    return null;
  }
  return null;
}

export function authEntryHref(entry: "/login" | "/register", requested: unknown) {
  const destination = safeAuthContinuation(requested);
  return destination ? `${entry}?redirect=${encodeURIComponent(destination)}` : entry;
}

export function onboardingHref(username: string, requested: unknown) {
  const destination = safeAuthContinuation(requested);
  return `/onboarding?username=${encodeURIComponent(username)}${destination ? `&redirect=${encodeURIComponent(destination)}` : ""}`;
}
