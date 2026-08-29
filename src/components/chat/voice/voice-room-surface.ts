import type { MediaStatus } from "./voice-room-config";

export type VoiceRoomSurfacePhase =
  | "loading"
  | "preview"
  | "connecting"
  | "inside"
  | "reconnecting"
  | "leaving"
  | "post-leave"
  | "error";

export type VoiceRoomSessionTransition =
  | "connecting"
  | "leaving"
  | "post-leave"
  | null;

export const VOICE_ROOM_LIFECYCLE_TIMEOUT_MS = 10_000;

export async function waitForVoiceRoomLifecycle<T>(
  operation: Promise<T>,
  timeoutMs = VOICE_ROOM_LIFECYCLE_TIMEOUT_MS,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("Не удалось подтвердить изменение комнаты вовремя")),
      timeoutMs,
    );
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId);
  }
}

export function resolveVoiceRoomSurfacePhase({
  transition,
  loading,
  inside,
  mediaStatus,
  hasError,
}: {
  transition: VoiceRoomSessionTransition;
  loading: boolean;
  inside: boolean;
  mediaStatus: MediaStatus;
  hasError: boolean;
}): VoiceRoomSurfacePhase {
  if (transition === "leaving") return "leaving";
  if (transition === "post-leave") return "post-leave";
  if (transition === "connecting") return "connecting";
  if (loading) return "loading";
  if (inside && mediaStatus === "reconnecting") return "reconnecting";
  if (mediaStatus === "connecting") return "connecting";
  if (inside && mediaStatus === "connected") return "inside";
  if (hasError || mediaStatus === "error" || mediaStatus === "unavailable") return "error";
  if (inside) return "connecting";
  return "preview";
}
