const RESERVED_PROFILE_SLUGS = new Set([
  "events",
  "explore",
  "feed",
  "help",
  "login",
  "me",
  "messages",
  "notifications",
  "post",
  "register",
  "settings",
  "shop",
]);

export type AppRouteLayout = {
  routeKind: "standard" | "profile" | "messages";
  contentClassName: string;
  fixedViewport: boolean;
};

export function isAppProfilePath(pathname: string) {
  if (pathname === "/me") return true;
  const match = pathname.match(/^\/([a-z0-9_]+)$/i);
  return Boolean(match && !RESERVED_PROFILE_SLUGS.has(match[1].toLowerCase()));
}

export function isAppMessagesPath(pathname: string) {
  return pathname === "/messages" || pathname.startsWith("/messages/");
}

/** One geometry policy shared by the Next.js and Tauri route adapters. */
export function getAppRouteLayout(pathname: string): AppRouteLayout {
  if (isAppMessagesPath(pathname)) {
    return {
      routeKind: "messages",
      contentClassName: "max-w-none",
      fixedViewport: true,
    };
  }

  if (isAppProfilePath(pathname)) {
    return {
      routeKind: "profile",
      contentClassName: "max-w-6xl",
      fixedViewport: false,
    };
  }

  if (["/feed", "/explore", "/notifications", "/events", "/shop"].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )) {
    return {
      routeKind: "standard",
      contentClassName: "max-w-[1440px]",
      fixedViewport: false,
    };
  }

  if (pathname === "/settings" || pathname === "/help") {
    return {
      routeKind: "standard",
      contentClassName: "max-w-6xl",
      fixedViewport: false,
    };
  }

  return {
    routeKind: "standard",
    contentClassName: "max-w-2xl",
    fixedViewport: false,
  };
}
