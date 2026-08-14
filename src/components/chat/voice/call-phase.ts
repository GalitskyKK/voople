import type { ChatRoomView } from "@/types/chat";

export type DirectCallPhase = "idle" | "dialing" | "ringing" | "connected" | "ended";

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
