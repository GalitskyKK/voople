import type { ChatRoomView } from "@/types/chat";

export type DirectCallPhase = "idle" | "dialing" | "ringing" | "connected" | "ended";

export type DirectCallSoundProgress = {
  key: string;
  observed: boolean;
  connected: boolean;
  resolved: boolean;
};

export function advanceDirectCallSound(
  previous: DirectCallSoundProgress,
  input: {
    key: string | null;
    phase: DirectCallPhase | null;
    mediaReady: boolean;
    endReason: ChatRoomView["endReason"];
  },
): { progress: DirectCallSoundProgress; cue: "call.connected" | "call.ended" | "call.declined" | null } {
  const progress = input.key && input.key !== previous.key
    ? { key: input.key, observed: false, connected: false, resolved: false }
    : { ...previous };
  if (!progress.key) return { progress, cue: null };
  if (input.phase === "dialing") progress.observed = true;
  if (input.phase === "connected" && input.mediaReady && !progress.connected && !progress.resolved) {
    progress.connected = true;
    return { progress, cue: "call.connected" };
  }
  if (input.phase === "ended" && input.endReason && !progress.resolved) {
    progress.resolved = true;
    return { progress, cue: directCallResolutionSound(input.endReason, progress.observed, progress.connected) };
  }
  return { progress, cue: null };
}

export function hasOutgoingCallLoop(phase: DirectCallPhase | null): boolean {
  return phase === "dialing";
}

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
