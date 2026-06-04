/** UUID диалога из `/messages/[chatId]`, иначе `null`. */
export function activeMessagesChatId(pathname: string): string | null {
  const match = pathname.match(/^\/messages\/([^/]+)$/);
  return match?.[1] ?? null;
}

export function isMessagesThreadPath(pathname: string): boolean {
  return activeMessagesChatId(pathname) !== null;
}

export function isMessagesInboxPath(pathname: string): boolean {
  return pathname === "/messages";
}
