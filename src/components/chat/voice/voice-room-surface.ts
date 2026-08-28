import type { MediaStatus } from "./voice-room-config";

export type VoiceRoomSurfacePhase =
  | "loading"
  | "preview"
  | "connecting"
  | "inside"
  | "reconnecting"
  | "leaving"
  | "error";

export function resolveVoiceRoomSurfacePhase({
  transition,
  loading,
  inside,
  mediaStatus,
  hasError,
}: {
  transition: "connecting" | "leaving" | null;
  loading: boolean;
  inside: boolean;
  mediaStatus: MediaStatus;
  hasError: boolean;
}): VoiceRoomSurfacePhase {
  if (transition === "leaving") return "leaving";
  if (transition === "connecting") return "connecting";
  if (loading) return "loading";
  if (inside && mediaStatus === "reconnecting") return "reconnecting";
  if (mediaStatus === "connecting") return "connecting";
  if (inside && mediaStatus === "connected") return "inside";
  if (hasError || mediaStatus === "error" || mediaStatus === "unavailable") return "error";
  if (inside) return "connecting";
  return "preview";
}
