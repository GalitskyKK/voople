"use client";

import type { Room } from "livekit-client";
import type { Dispatch, RefObject, SetStateAction } from "react";

import type { useVoiceMediaConnection } from "./useVoiceMediaConnection";

export function useVoiceRoomAudioActions(
  roomRef: RefObject<Room | null>,
  setAudioBlocked: Dispatch<SetStateAction<boolean>>,
  inside: boolean,
  mediaConnection: Pick<ReturnType<typeof useVoiceMediaConnection>, "connect" | "disconnect">,
) {
  const resumeAudio = async () => {
    const liveRoom = roomRef.current;
    if (!liveRoom) return;
    await liveRoom.startAudio();
    setAudioBlocked(!liveRoom.canPlaybackAudio);
  };
  const reconnectMedia = async () => {
    const wasInside = inside;
    mediaConnection.disconnect();
    if (wasInside) await mediaConnection.connect();
  };
  return { resumeAudio, reconnectMedia };
}
