import { parseBuffer } from "music-metadata";

import { groupSoundLimit } from "@/lib/group-perks";
import {
  deleteObject,
  headObject,
  publicAssetUrl,
  putObject,
  readObjectBytes,
} from "@/lib/object-storage";
import { extensionForAudioMime } from "@/lib/object-storage/audio-mime";
import { getAdminClient } from "@/lib/supabase/admin";
import { assertChatMemberRest } from "@/server/data/chat-access-rest";
import { getGroupCommunityRest } from "@/server/data/chat-community-rest";
import { resolvePublicMediaKey } from "@/server/services/upload.service";
import type { GroupSoundView } from "@/types/chat";

const SOUND_NAME = /^[\p{L}\p{N}_ -]{2,32}$/u;

function mapSound(row: Record<string, unknown>): GroupSoundView {
  const url = publicAssetUrl(row.storage_key as string);
  if (!url) throw new Error("Не удалось сформировать адрес звука");
  return {
    id: row.id as string,
    name: row.name as string,
    url,
    durationMs: Number(row.duration_ms),
    createdBy: row.created_by as string,
  };
}

async function assertGroupAdmin(chatId: string, userId: string) {
  const membership = await assertChatMemberRest(chatId, userId);
  if (membership.type !== "group" || membership.parentChatId) {
    throw new Error("Звуки принадлежат основной группе");
  }
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("Управлять звуками могут владелец и администраторы");
  }
}

export async function listGroupSoundsRest(chatId: string, userId: string) {
  const membership = await assertChatMemberRest(chatId, userId);
  const groupChatId = membership.accessChatId;
  const [{ data, error }, community] = await Promise.all([
    getAdminClient()
      .from("group_sounds")
      .select("id, name, storage_key, duration_ms, created_by")
      .eq("chat_id", groupChatId)
      .eq("moderation_status", "automated_approved")
      .order("created_at"),
    getGroupCommunityRest(groupChatId, userId),
  ]);
  if (error && error.code !== "42P01") throw new Error(error.message);
  return {
    items: ((data ?? []) as Record<string, unknown>[]).map(mapSound),
    limit: groupSoundLimit(community.groupLevel, community.emojiSoundEnabled),
  };
}

export async function createGroupSoundRest(input: {
  chatId: string;
  userId: string;
  name: string;
  uploadKey: string;
  rightsConfirmed: boolean;
}) {
  await assertGroupAdmin(input.chatId, input.userId);
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!SOUND_NAME.test(name)) throw new Error("Название: 2–32 буквы, цифры, пробелы или подчёркивания");
  if (!input.rightsConfirmed) throw new Error("Подтвердите права на загружаемый файл");

  const sourceKey = await resolvePublicMediaKey(input.uploadKey, input.userId, "group-sound");
  const [source, meta] = await Promise.all([
    readObjectBytes({ key: sourceKey!, bucket: "public" }),
    headObject({ key: sourceKey!, bucket: "public" }),
  ]);
  if (!source || !meta?.contentType) throw new Error("Загруженный звук не найден");
  const metadata = await parseBuffer(source, {
    mimeType: meta.contentType,
    size: meta.contentLength,
  }, { duration: true, skipCovers: true });
  const durationMs = Math.round((metadata.format.duration ?? 0) * 1000);
  if (durationMs < 200 || durationMs > 10_000) {
    throw new Error("Звук должен длиться от 0,2 до 10 секунд");
  }

  const id = crypto.randomUUID();
  const destinationKey = `groups/${input.chatId}/sounds/${id}.${extensionForAudioMime(meta.contentType)}`;
  try {
    await putObject({
      key: destinationKey,
      body: source,
      contentType: meta.contentType,
      bucket: "public",
    });
    const { error } = await getAdminClient().rpc("register_group_sound", {
      p_id: id,
      p_chat_id: input.chatId,
      p_user_id: input.userId,
      p_name: name,
      p_storage_key: destinationKey,
      p_duration_ms: durationMs,
      p_rights_confirmed: true,
    });
    if (error) {
      if (error.message.includes("group_sound_level_required")) throw new Error("Звуки открываются на 3-м уровне группы");
      if (error.message.includes("group_sound_limit_reached")) throw new Error("Лимит звуков для уровня группы исчерпан");
      if (error.code === "23505") throw new Error("Звук с таким названием уже существует");
      throw new Error(error.message);
    }
    return mapSound({ id, name, storage_key: destinationKey, duration_ms: durationMs, created_by: input.userId });
  } catch (error) {
    await deleteObject({ key: destinationKey, bucket: "public" }).catch(() => undefined);
    throw error;
  } finally {
    await deleteObject({ key: sourceKey!, bucket: "public" }).catch(() => undefined);
  }
}

export async function deleteGroupSoundRest(soundId: string, userId: string) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("group_sounds")
    .select("id, chat_id, storage_key")
    .eq("id", soundId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Звук не найден");
  await assertGroupAdmin(data.chat_id as string, userId);
  const { error: deleteError } = await admin.from("group_sounds").delete().eq("id", soundId);
  if (deleteError) throw new Error(deleteError.message);
  await deleteObject({ key: data.storage_key as string, bucket: "public" }).catch(() => undefined);
  return { id: soundId };
}
