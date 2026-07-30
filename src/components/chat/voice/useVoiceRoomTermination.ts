"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef } from "react";

import type { ChatRoomView } from "@/types/chat";
import { getCallEndMessage } from "./voice-room-config";

export function useVoiceRoomTermination(
  inside: boolean,
  fetching: boolean,
  endReason: ChatRoomView["endReason"],
  disconnect: () => void,
  setError: Dispatch<SetStateAction<string | null>>,
) {
  const joinedRef = useRef(false);

  useEffect(() => {
    if (inside) {
      joinedRef.current = true;
      return;
    }
    if (!joinedRef.current || fetching) return;
    joinedRef.current = false;
    disconnect();
    setError(getCallEndMessage(endReason));
  }, [disconnect, endReason, fetching, inside, setError]);
}
