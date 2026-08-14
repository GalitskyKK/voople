import { publicAssetUrl } from "@/lib/object-storage";
import { getAdminClient } from "@/lib/supabase/admin";
import { hasActiveSubscriptionRest } from "@/server/data/subscription-rest";
import { resolvePostMediaKey } from "@/server/services/upload.service";
import type { PostDraftView } from "@/types/domain";

type StoredDraftMedia = Omit<PostDraftView["media"][number], "url">;

const DRAFT_MEDIA_TYPES = new Set(["image", "gif", "meme", "video"]);

function parseDraftMedia(value: unknown): StoredDraftMedia[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row.mediaKey !== "string" || !DRAFT_MEDIA_TYPES.has(String(row.mediaType))) return [];
    const optionalNumber = (field: unknown) => typeof field === "number" && Number.isFinite(field) ? field : undefined;
    return [{
      mediaKey: row.mediaKey,
      mediaType: row.mediaType as StoredDraftMedia["mediaType"],
      width: optionalNumber(row.width),
      height: optionalNumber(row.height),
      durationSeconds: optionalNumber(row.durationSeconds),
    }];
  });
}

function mapDraft(row: Record<string, unknown>): PostDraftView {
  const media = parseDraftMedia(row.media);
  return {
    text: String(row.text ?? ""),
    media: media.flatMap((item) => {
      const url = publicAssetUrl(item.mediaKey);
      return url ? [{ ...item, url }] : [];
    }),
    revision: Number(row.revision ?? 0),
    updatedAt: String(row.updated_at),
  };
}

export async function getPostDraftRest(userId: string) {
  if (!await hasActiveSubscriptionRest(userId)) return null;
  const { data, error } = await getAdminClient().from("post_drafts").select("text, media, revision, updated_at").eq("user_id", userId).maybeSingle();
  if (error && error.code !== "42P01") throw new Error(error.message);
  return data ? mapDraft(data as Record<string, unknown>) : null;
}

export async function savePostDraftRest(input: { userId: string; text: string; media: StoredDraftMedia[]; expectedRevision: number }) {
  if (input.media.length > 10) throw new Error("В черновике может быть до 10 файлов");
  const media = await Promise.all(input.media.map(async (item) => {
    const resolved = await resolvePostMediaKey(item.mediaKey, input.userId);
    if (resolved.mediaType !== item.mediaType) throw new Error("Тип вложения черновика не совпадает с файлом");
    return {
      mediaKey: resolved.key,
      mediaType: resolved.mediaType,
      width: item.width,
      height: item.height,
      durationSeconds: item.durationSeconds,
    } satisfies StoredDraftMedia;
  }));
  const { data, error } = await getAdminClient().rpc("save_post_draft", {
    p_user_id: input.userId, p_text: input.text, p_media: media,
    p_expected_revision: input.expectedRevision,
  });
  if (error) {
    if (error.message.includes("draft_revision_conflict")) throw new Error("Черновик изменён на другом устройстве. Обновите его перед сохранением.");
    if (error.message.includes("active_subscription_required")) throw new Error("Облачные черновики доступны с Вупл+");
    throw new Error(error.message);
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Сервер не вернул сохранённый черновик");
  return mapDraft(row as Record<string, unknown>);
}

export async function deletePostDraftRest(userId: string) {
  const { error } = await getAdminClient().from("post_drafts").delete().eq("user_id", userId);
  if (error && error.code !== "42P01") throw new Error(error.message);
  return { deleted: true };
}
