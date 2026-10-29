import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { publicAssetUrl } from "@/lib/object-storage/urls";
import { defaultRoomCover, type RoomCover } from "@/lib/chat/room-cover";

export type StoredRoomCover = { preset: RoomCover["preset"]; mediaKey: string | null };

export async function loadRoomCoversRest(roomIds: string[]): Promise<Map<string, RoomCover>> {
  if (!roomIds.length) return new Map();
  const { data, error } = await getAdminClient().from("group_room_covers")
    .select("room_id, preset, media_key").in("room_id", roomIds);
  // Existing Groups remain usable during an additive migration rollout.
  if (error?.code === "42P01" || error?.code === "PGRST205") return new Map();
  if (error) throw new Error("Не удалось загрузить обложки комнат");
  return new Map((data ?? []).map((row) => [String(row.room_id), {
    preset: ["orbit", "arcade", "wave", "dusk"].includes(row.preset) ? row.preset : defaultRoomCover(String(row.room_id)).preset,
    imageUrl: row.media_key ? publicAssetUrl(String(row.media_key)) : null,
  } as RoomCover]));
}

export async function saveRoomCoverRest(roomId: string, userId: string, cover: StoredRoomCover) {
  const { data, error } = await getAdminClient().rpc("set_group_room_cover", {
    p_room_id: roomId, p_user_id: userId, p_preset: cover.preset, p_media_key: cover.mediaKey,
  });
  if (error?.code === "42P01" || error?.code === "PGRST205" || error?.code === "PGRST202") throw new Error("Обложки пока недоступны. Попробуйте позже.");
  if (error?.message.includes("ROOM_FORBIDDEN")) throw new Error("Недостаточно прав для изменения обложки");
  if (error?.message.includes("ROOM_NOT_FOUND")) throw new Error("Комната больше недоступна");
  if (error || data !== true) throw new Error("Не удалось сохранить обложку комнаты");
  return { ok: true as const };
}
