import type { CoreRoomInvitePreview } from "../../types/room-invitations";

const INVITE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCoreRoomInviteId(value: string) {
  return INVITE_ID.test(value);
}

export function roomInviteIdFromPath(pathname: string) {
  const id = /^\/room-invites\/([^/]+)\/?$/.exec(pathname)?.[1];
  return id && isCoreRoomInviteId(id) ? id : null;
}

export type CoreRoomInvitePreviewState =
  | { kind: "loading" | "offline" | "error" | "unavailable" }
  | { kind: "ready"; invite: CoreRoomInvitePreview };

export function resolveCoreRoomInvitePreview(input: {
  valid: boolean;
  online: boolean;
  loading: boolean;
  error: boolean;
  invite: CoreRoomInvitePreview | null | undefined;
  now: number;
}): CoreRoomInvitePreviewState {
  if (!input.valid) return { kind: "unavailable" };
  if (!input.online) return { kind: "offline" };
  if (input.error) return { kind: "error" };
  if (input.loading) return { kind: "loading" };
  if (!input.invite) return { kind: "unavailable" };
  const deadline = Date.parse(input.invite.expiresAt);
  if (input.invite.status === "pending" && (!Number.isFinite(deadline) || deadline <= input.now)) {
    return { kind: "ready", invite: {
      ...input.invite, status: "expired", room: null, groupId: null, groupName: null, inviter: null,
    } };
  }
  return { kind: "ready", invite: input.invite };
}
