import type { ChatRoomView } from "@/types/chat";

export type DirectCallPhase = "idle" | "dialing" | "ringing" | "connected" | "ended";

/** Legacy terminal reasons are only sounded when this client observed the call. */
export function directCallResolutionSound(
  reason: ChatRoomView["endReason"],
  observed: boolean,
  connected: boolean,
): "call.ended" | "call.declined" | null {
  if (!observed && !connected) return null;
  if (reason === "declined") return "call.declined";
  if (reason === "ended" && connected) return "call.ended";
  return null;
}

export function getDirectCallPhase({
  direct,
  room,
  starter,
}: {
  direct: boolean;
  room: ChatRoomView | null | undefined;
  starter: boolean;
}): DirectCallPhase | null {
  if (!direct) return null;
  if (room?.status === "ringing") return starter ? "dialing" : "ringing";
  if (room?.status === "active") return "connected";
  return room?.endReason ? "ended" : "idle";
}
