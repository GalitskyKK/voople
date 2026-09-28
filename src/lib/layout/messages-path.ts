/** UUID диалога из `/messages/[chatId]`, иначе `null`. */
export function activeMessagesChatId(pathname: string): string | null {
  const match = pathname.match(/^\/messages\/([^/?#]+)(?:[/?#]|$)/);
  return match?.[1] === "saved" ? null : match?.[1] ?? null;
}

export function isSavedMessagesPath(pathname: string): boolean {
  return /^\/messages\/saved(?:[?#]|$)/.test(pathname);
}

export function groupSurfaceFromPath(pathname: string): "chat" | "now" | "people" {
  const query = pathname.split("?", 2)[1]?.split("#", 1)[0];
  const surface = query ? new URLSearchParams(query).get("surface") : null;
  return surface === "chat" || surface === "people" ? surface : "now";
}

export function isMessagesThreadPath(pathname: string): boolean {
  return activeMessagesChatId(pathname) !== null || isSavedMessagesPath(pathname);
}

export function isMessagesInboxPath(pathname: string): boolean {
  return pathname === "/messages";
}
