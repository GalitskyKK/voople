import { playProductSound } from "@/lib/sound/sound-playback";

type VoiceRoomSound = "join" | "leave" | "mute" | "unmute" | "deafen" | "undeafen";

export function playVoiceRoomSound(sound: VoiceRoomSound, enabled: boolean) {
  if (!enabled) return Promise.resolve();
  return playProductSound(`room.${sound}`);
}
