export const PRODUCT_SOUND_IDS = [
  "room.join", "room.leave", "room.mute", "room.unmute", "room.deafen", "room.undeafen",
  "notification.message", "notification.mention", "notification.social",
] as const;

export type ProductSoundId = (typeof PRODUCT_SOUND_IDS)[number];
export type SoundCategory = "room" | "notification" | "soundboard";

export type ProductSound = {
  src: string;
  category: "room" | "notification";
  gain: number;
  cooldownMs: number;
  group: string;
  maxDurationMs: number;
};

export const SOUND_CATALOG: Record<ProductSoundId, ProductSound> = {
  "room.join": { src: "/sounds/ui/room-join.wav", category: "room", gain: 0.29, cooldownMs: 350, group: "room.presence", maxDurationMs: 230 },
  "room.leave": { src: "/sounds/ui/room-leave.wav", category: "room", gain: 0.28, cooldownMs: 350, group: "room.presence", maxDurationMs: 220 },
  "room.mute": { src: "/sounds/ui/room-mute.wav", category: "room", gain: 0.32, cooldownMs: 90, group: "room.mic", maxDurationMs: 120 },
  "room.unmute": { src: "/sounds/ui/room-unmute.wav", category: "room", gain: 0.32, cooldownMs: 90, group: "room.mic", maxDurationMs: 130 },
  "room.deafen": { src: "/sounds/ui/room-deafen.wav", category: "room", gain: 0.31, cooldownMs: 120, group: "room.output", maxDurationMs: 190 },
  "room.undeafen": { src: "/sounds/ui/room-undeafen.wav", category: "room", gain: 0.31, cooldownMs: 120, group: "room.output", maxDurationMs: 210 },
  "notification.message": { src: "/sounds/ui/notification-message.wav", category: "notification", gain: 0.34, cooldownMs: 800, group: "notification", maxDurationMs: 160 },
  "notification.mention": { src: "/sounds/ui/notification-mention.wav", category: "notification", gain: 0.36, cooldownMs: 800, group: "notification", maxDurationMs: 220 },
  "notification.social": { src: "/sounds/ui/notification-social.wav", category: "notification", gain: 0.22, cooldownMs: 800, group: "notification", maxDurationMs: 130 },
};
