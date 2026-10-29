import "server-only";

import sharp from "sharp";
import { roomCoverDraftSchema, type RoomCoverDraft } from "@/lib/chat/room-cover";
import { readObjectBytes } from "@/lib/object-storage";
import { getChatMembershipRest } from "@/server/data/chat-access-rest";
import { getGroupRoomRecordRest } from "@/server/data/group-room-mutations-rest";
import { saveRoomCoverRest, type StoredRoomCover } from "@/server/data/room-covers-rest";
import { resolvePublicMediaKey } from "./upload.service";

export async function resolveRoomCover(draft: RoomCoverDraft, userId: string): Promise<StoredRoomCover> {
  const value = roomCoverDraftSchema.parse(draft);
  if (value.kind === "preset") return { preset: value.preset, mediaKey: null };
  const mediaKey = await resolvePublicMediaKey(value.mediaKey, userId, "room-cover");
  const bytes = await readObjectBytes({ key: mediaKey!, bucket: "public" });
  if (!bytes) throw new Error("Изображение не найдено");
  // Decode the actual image, not just the caller's MIME declaration.
  const image = await sharp(bytes, { limitInputPixels: 16_777_216 }).metadata();
  if (!image.width || !image.height || !["jpeg", "png", "webp", "gif"].includes(image.format ?? "")) {
    throw new Error("Выберите изображение JPEG, PNG, WebP или GIF");
  }
  return { preset: "orbit", mediaKey: mediaKey! };
}

export async function updateRoomCover(input: { roomId: string; userId: string; cover: RoomCoverDraft }) {
  const room = await getGroupRoomRecordRest(input.roomId);
  const membership = await getChatMembershipRest(room.groupId, input.userId);
  if (membership.type !== "group" || membership.parentChatId ||
    (membership.role !== "owner" && membership.role !== "admin" && room.createdBy !== input.userId)) {
    throw new Error("Недостаточно прав для изменения обложки");
  }
  const cover = await resolveRoomCover(input.cover, input.userId);
  return saveRoomCoverRest(input.roomId, input.userId, cover);
}
