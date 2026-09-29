export const PRODUCT_SOUND_IDS = [
  "room.join", "room.leave", "room.mute", "room.unmute", "room.deafen", "room.undeafen",
  "notification.message", "notification.mention", "notification.social",
  "call.incoming", "call.outgoing", "call.connected", "call.ended", "call.declined",
] as const;

export type ProductSoundId = (typeof PRODUCT_SOUND_IDS)[number];
export type LoopSoundId = "call.incoming" | "call.outgoing";
export const SOUND_PACK_IDS = ["default", "halo", "velvet"] as const;
export type SoundPackId = (typeof SOUND_PACK_IDS)[number];
export type SoundCategory = "room" | "notification" | "call" | "soundboard";

export function normalizeSoundPack(value: unknown): SoundPackId {
  return typeof value === "string" && (SOUND_PACK_IDS as readonly string[]).includes(value)
    ? value as SoundPackId : "default";
}

const ASSET_NAMES: Record<ProductSoundId, string> = {
  "room.join": "room-join", "room.leave": "room-leave",
  "room.mute": "room-mute", "room.unmute": "room-unmute",
  "room.deafen": "room-deafen", "room.undeafen": "room-undeafen",
  "notification.message": "notification-message",
  "notification.mention": "notification-mention",
  "notification.social": "notification-social",
  "call.incoming": "call-incoming", "call.outgoing": "call-outgoing",
  "call.connected": "call-connected", "call.ended": "call-ended",
  "call.declined": "call-declined",
};

export function productSoundAsset(pack: SoundPackId, id: ProductSoundId) {
  return `/sounds/packs/${pack}/${ASSET_NAMES[id]}.wav`;
}

export type SoundPolicy = {
  category: Exclude<SoundCategory, "soundboard">;
  gain: number;
  cooldownMs: number;
  group: string;
  coalesce: "group" | "same" | "priority";
  priority?: number;
  maxDurationMs: number;
  repeatMs?: number;
};

/** Behavioral policy is shared by every pack. Only the asset identity changes. */
export const SOUND_POLICY: Record<ProductSoundId, SoundPolicy> = {
  "room.join": { category: "room", gain: 0.29, cooldownMs: 350, group: "room.presence", coalesce: "group", maxDurationMs: 250 },
  "room.leave": { category: "room", gain: 0.28, cooldownMs: 350, group: "room.presence", coalesce: "group", maxDurationMs: 240 },
  "room.mute": { category: "room", gain: 0.32, cooldownMs: 90, group: "room.mic", coalesce: "same", maxDurationMs: 140 },
  "room.unmute": { category: "room", gain: 0.32, cooldownMs: 90, group: "room.mic", coalesce: "same", maxDurationMs: 150 },
  "room.deafen": { category: "room", gain: 0.31, cooldownMs: 120, group: "room.output", coalesce: "same", maxDurationMs: 210 },
  "room.undeafen": { category: "room", gain: 0.31, cooldownMs: 120, group: "room.output", coalesce: "same", maxDurationMs: 230 },
  "notification.message": { category: "notification", gain: 0.34, cooldownMs: 800, group: "notification", coalesce: "priority", priority: 2, maxDurationMs: 180 },
  "notification.mention": { category: "notification", gain: 0.36, cooldownMs: 800, group: "notification", coalesce: "priority", priority: 3, maxDurationMs: 240 },
  "notification.social": { category: "notification", gain: 0.22, cooldownMs: 800, group: "notification", coalesce: "priority", priority: 1, maxDurationMs: 150 },
  "call.incoming": { category: "call", gain: 0.36, cooldownMs: 0, group: "call.ring", coalesce: "same", maxDurationMs: 1400, repeatMs: 3000 },
  "call.outgoing": { category: "call", gain: 0.29, cooldownMs: 0, group: "call.ring", coalesce: "same", maxDurationMs: 1100, repeatMs: 2600 },
  "call.connected": { category: "call", gain: 0.34, cooldownMs: 200, group: "call.resolution", coalesce: "same", maxDurationMs: 260 },
  "call.ended": { category: "call", gain: 0.30, cooldownMs: 200, group: "call.resolution", coalesce: "same", maxDurationMs: 260 },
  "call.declined": { category: "call", gain: 0.31, cooldownMs: 200, group: "call.resolution", coalesce: "same", maxDurationMs: 320 },
};
