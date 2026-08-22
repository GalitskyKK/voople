import sharp from "sharp";

import { groupEmojiLimit } from "@/lib/group-perks";
import {
  deleteObject,
  publicAssetUrl,
  putObject,
  readObjectBytes,
} from "@/lib/object-storage";
import { getAdminClient } from "@/lib/supabase/admin";
import { assertChatMemberRest } from "@/server/data/chat-access-rest";
import { getGroupCommunityRest } from "@/server/data/chat-community-rest";
import { resolvePublicMediaKey } from "@/server/services/upload.service";
import type { GroupEmojiView } from "@/types/chat";

const EMOJI_NAME = /^[a-z0-9_]{2,32}$/;

function mapEmoji(row: Record<string, unknown>): GroupEmojiView {
  const key = row.storage_key as string;
  const url = publicAssetUrl(key);
  if (!url) throw new Error("Не удалось сформировать адрес эмодзи");
  return {
    id: row.id as string,
    name: row.name as string,
    url,
    animated: Boolean(row.animated),
    createdBy: row.created_by as string,
  };
}

async function assertGroupAdmin(chatId: string, userId: string) {
  const membership = await assertChatMemberRest(chatId, userId);
  if (membership.type !== "group" || membership.parentChatId) throw new Error("Эмодзи принадлежат основной группе");
  if (membership.role !== "owner" && membership.role !== "admin") throw new Error("Управлять эмодзи могут владелец и администраторы");
}

export async function listGroupEmojisRest(chatId: string, userId: string) {
  const membership = await assertChatMemberRest(chatId, userId);
  const groupChatId = membership.accessChatId;
  const [{ data, error }, community] = await Promise.all([
    getAdminClient().from("group_emojis").select("id, name, storage_key, animated, created_by").eq("chat_id", groupChatId).eq("moderation_status", "automated_approved").order("created_at"),
    getGroupCommunityRest(groupChatId, userId),
  ]);
  if (error && error.code !== "42P01") throw new Error(error.message);
  return {
    items: ((data ?? []) as Record<string, unknown>[]).map(mapEmoji),
    limit: groupEmojiLimit(community.groupLevel, community.emojiSoundEnabled),
  };
}

export async function createGroupEmojiRest(input: {
  chatId: string;
  userId: string;
  name: string;
  uploadKey: string;
  rightsConfirmed: boolean;
}) {
  await assertGroupAdmin(input.chatId, input.userId);
  const name = input.name.trim().toLowerCase();
  if (!EMOJI_NAME.test(name)) throw new Error("Имя: 2–32 латинских символа, цифры или подчёркивания");
  if (!input.rightsConfirmed) throw new Error("Подтвердите права на загружаемый файл");
  const sourceKey = await resolvePublicMediaKey(input.uploadKey, input.userId, "group-emoji");
  const source = await readObjectBytes({ key: sourceKey!, bucket: "public" });
  if (!source) throw new Error("Загруженный файл не найден");
  let destinationKey: string | null = null;
  try {
    const image = sharp(source, { animated: true, limitInputPixels: 16_777_216 });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) throw new Error("Не удалось прочитать изображение");
    if ((metadata.pages ?? 1) > 120) throw new Error("В анимации слишком много кадров");
    const animated = (metadata.pages ?? 1) > 1;
    const id = crypto.randomUUID();
    destinationKey = `groups/${input.chatId}/emojis/${id}.${animated ? "gif" : "webp"}`;
    const normalized = animated
      ? await image.resize(128, 128, { fit: "inside", withoutEnlargement: true }).gif({ effort: 5 }).toBuffer()
      : await image.resize(128, 128, { fit: "inside", withoutEnlargement: true }).webp({ quality: 88 }).toBuffer();
    if (normalized.byteLength > 256 * 1024) throw new Error("После обработки эмодзи превышает 256 КБ");
    await putObject({ key: destinationKey, body: normalized, contentType: animated ? "image/gif" : "image/webp", bucket: "public" });

    const { error } = await getAdminClient().rpc("register_group_emoji", {
      p_id: id,
      p_chat_id: input.chatId,
      p_user_id: input.userId,
      p_name: name,
      p_storage_key: destinationKey,
      p_animated: animated,
      p_rights_confirmed: true,
    });
    if (error) {
      if (error.message.includes("group_emoji_limit_reached")) throw new Error("Лимит эмодзи для уровня группы исчерпан");
      if (error.code === "23505") throw new Error("Эмодзи с таким именем уже существует");
      throw new Error(error.message);
    }
    return mapEmoji({ id, name, storage_key: destinationKey, animated, created_by: input.userId });
  } catch (error) {
    if (destinationKey) await deleteObject({ key: destinationKey, bucket: "public" }).catch(() => undefined);
    throw error;
  } finally {
    await deleteObject({ key: sourceKey!, bucket: "public" }).catch(() => undefined);
  }
}

export async function deleteGroupEmojiRest(emojiId: string, userId: string) {
  const admin = getAdminClient();
  const { data, error } = await admin.from("group_emojis").select("id, chat_id, storage_key").eq("id", emojiId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Эмодзи не найден");
  await assertGroupAdmin(data.chat_id as string, userId);
  const { error: deleteError } = await admin.from("group_emojis").delete().eq("id", emojiId);
  if (deleteError) throw new Error(deleteError.message);
  await deleteObject({ key: data.storage_key as string, bucket: "public" }).catch(() => undefined);
  return { id: emojiId };
}
