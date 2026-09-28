const GUEST_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function isRoomGuestInviteToken(value: string) {
  return GUEST_TOKEN_PATTERN.test(value);
}

/** Build on the server so a desktop WebView origin can never leak into an invite. */
export function roomGuestInviteUrl(token: string, baseUrl: string) {
  if (!isRoomGuestInviteToken(token)) return null;
  try {
    const base = new URL(baseUrl);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname);
    if ((base.protocol !== "https:" && !(base.protocol === "http:" && local))
      || base.username || base.password || base.search || base.hash || base.pathname !== "/") return null;
    return new URL(`/room-guest/${token}`, base.origin).href;
  } catch {
    return null;
  }
}
