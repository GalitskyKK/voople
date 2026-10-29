import { z } from "zod";

export const ROOM_COVER_PRESETS = [
  { id: "orbit", label: "Орбита" },
  { id: "arcade", label: "Аркада" },
  { id: "wave", label: "Волна" },
  { id: "dusk", label: "Сумерки" },
] as const;

export const roomCoverDraftSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("preset"), preset: z.enum(["orbit", "arcade", "wave", "dusk"]) }),
  z.strictObject({ kind: z.literal("upload"), mediaKey: z.string().min(1).max(500) }),
]);

export type RoomCoverDraft = z.infer<typeof roomCoverDraftSchema>;
export type RoomCover = { preset: typeof ROOM_COVER_PRESETS[number]["id"]; imageUrl: string | null };

export function defaultRoomCover(id: string): RoomCover {
  const hash = [...id].reduce((value, char) => (value + char.charCodeAt(0)) % ROOM_COVER_PRESETS.length, 0);
  return { preset: ROOM_COVER_PRESETS[hash].id, imageUrl: null };
}
