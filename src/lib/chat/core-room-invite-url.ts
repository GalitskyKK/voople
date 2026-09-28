import { isCoreRoomInviteId } from "./core-room-invite-preview.ts";

/** Build on the server: the desktop renderer origin is not a public website. */
export function coreRoomInviteUrl(inviteId: string, baseUrl: string) {
  if (!isCoreRoomInviteId(inviteId)) return null;
  try {
    const base = new URL(baseUrl);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname);
    if ((base.protocol !== "https:" && !(base.protocol === "http:" && local))
      || base.username || base.password || base.search || base.hash || base.pathname !== "/") return null;
    return new URL(`/room-invites/${inviteId}`, base.origin).href;
  } catch {
    return null;
  }
}
