import { playProductSound } from "@/lib/sound/sound-playback";

type VoiceRoomSound = "join" | "leave" | "mute" | "unmute" | "deafen" | "undeafen";

export function advanceLocalRoomSound(joined: boolean, event: "connected" | "left") {
  if (event === "connected") return { joined: true, cue: joined ? null : "join" } as const;
  return { joined: false, cue: joined ? "leave" : null } as const;
}

export function playVoiceRoomSound(sound: VoiceRoomSound, enabled: boolean) {
  if (!enabled) return Promise.resolve();
  return playProductSound(`room.${sound}`);
}
