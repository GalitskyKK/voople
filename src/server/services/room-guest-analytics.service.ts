import "server-only";

import { requestIp } from "@/lib/http/request-ip";
import { createClient } from "@/lib/supabase/server";
import { roomGuestInviteAudienceRest } from "@/server/data/room-guests-rest";
import { recordServerProductEvent } from "@/server/services/client-telemetry.service";
import type { RoomGuestInvitePreview } from "@/types/room-guests";

async function guestAudience(request: Request, inviteToken: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const state = await roomGuestInviteAudienceRest(inviteToken, user.id)
        .catch(() => "existing" as const);
      return { actorId: user.id, state };
    }
  } catch {
    // Preview remains available when optional account classification is down.
  }
  const userAgent = request.headers.get("user-agent")?.slice(0, 240) || "unknown";
  return {
    actorId: `anonymous:${requestIp(request)}:${userAgent}`,
    state: "new" as const,
  };
}

export async function recordRoomGuestPreview(
  request: Request,
  inviteToken: string,
  result: RoomGuestInvitePreview["reason"] | "service_error",
) {
  const audience = await guestAudience(request, inviteToken);
  return recordServerProductEvent({
    name: "room_guest_preview_opened",
    actorId: audience.actorId,
    dedupeId: `${inviteToken}:${audience.actorId}`,
    route: "/api/room-guests/invites/[token]",
    properties: { state: audience.state, result },
  });
}

export async function recordRoomGuestJoined(
  request: Request,
  inviteToken: string,
  guestId: string,
) {
  const audience = await guestAudience(request, inviteToken);
  return recordServerProductEvent({
    name: "room_guest_joined",
    actorId: guestId,
    dedupeId: guestId,
    route: "/api/room-guests/invites/[token]",
    properties: { source: "room_guest_link", state: audience.state },
  });
}
