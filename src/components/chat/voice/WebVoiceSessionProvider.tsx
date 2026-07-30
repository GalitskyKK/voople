"use client";

import { useCallback, useMemo } from "react";

import { createClient } from "@/lib/supabase/client";
import { VoiceSessionProvider } from "./VoiceSessionProvider";
import type { SubscribeToVoiceRooms } from "./useIncomingVoiceCalls";

export function WebVoiceSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const realtimeClient = useMemo(() => createClient(), []);
  const subscribeToVoiceRooms = useCallback<SubscribeToVoiceRooms>(
    (onChange) => {
      const channel = realtimeClient.channel(`voice-calls:${crypto.randomUUID()}`);
      channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "chat_rooms",
          },
          onChange,
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") onChange();
        });
      return () => {
        void realtimeClient.removeChannel(channel);
      };
    },
    [realtimeClient],
  );
  return (
    <VoiceSessionProvider subscribeToVoiceRooms={subscribeToVoiceRooms}>
      {children}
    </VoiceSessionProvider>
  );
}
