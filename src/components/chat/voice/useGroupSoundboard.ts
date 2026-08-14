"use client";

import { useCallback, useMemo, useRef, type RefObject } from "react";
import type { RemoteParticipant, Room } from "livekit-client";

import { trpc } from "@/lib/trpc/client";
import type { GroupSoundView } from "@/types/chat";

const TOPIC = "voople.group-sound.v1";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function playSoundUrl(url: string) {
  const audio = new Audio(url);
  audio.volume = 0.8;
  return audio.play();
}

export function useGroupSoundboard(
  chatId: string,
  enabled: boolean,
  roomRef: RefObject<Room | null>,
) {
  const soundsQuery = trpc.chat.groupSounds.useQuery(
    { chatId },
    { enabled, staleTime: 60_000 },
  );
  const sounds = useMemo(() => soundsQuery.data?.items ?? [], [soundsQuery.data?.items]);
  const byId = useMemo(() => new Map(sounds.map((sound) => [sound.id, sound])), [sounds]);
  const lastLocalPlayRef = useRef(0);
  const lastRemotePlayRef = useRef(new Map<string, number>());

  const play = useCallback(async (sound: GroupSoundView) => {
    const now = Date.now();
    if (now - lastLocalPlayRef.current < 1_000) return;
    lastLocalPlayRef.current = now;
    await playSoundUrl(sound.url).catch(() => undefined);
    await roomRef.current?.localParticipant.publishData(
      encoder.encode(JSON.stringify({ soundId: sound.id })),
      { reliable: true, topic: TOPIC },
    );
  }, [roomRef]);

  const onDataReceived = useCallback((payload: Uint8Array, participant?: RemoteParticipant, topic?: string) => {
    if (topic !== TOPIC || !participant) return;
    const now = Date.now();
    const previous = lastRemotePlayRef.current.get(participant.identity) ?? 0;
    if (now - previous < 1_000) return;
    try {
      const parsed = JSON.parse(decoder.decode(payload)) as { soundId?: string };
      const sound = parsed.soundId ? byId.get(parsed.soundId) : null;
      if (!sound) return;
      lastRemotePlayRef.current.set(participant.identity, now);
      void playSoundUrl(sound.url).catch(() => undefined);
    } catch {
      // Ignore malformed or obsolete data packets.
    }
  }, [byId]);

  return { sounds, play, onDataReceived };
}
