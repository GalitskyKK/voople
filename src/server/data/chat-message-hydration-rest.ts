import {
  chatAudioKindFromKey,
  chatAttachmentKindFromKey,
  createPresignedGetUrl,
  isPrivateChatMediaKey,
  publicAssetUrl,
} from "@/lib/object-storage";
import { getAdminClient } from "@/lib/supabase/admin";
import { hydrateLegacyMessageContentRest, hydrateMessageContentRest, type StoredChatMessageContentNode } from "@/server/data/chat-content-rest";
import { loadMessageReactionsRest } from "@/server/data/chat-reactions-rest";
import type { ChatMessageAttachment, ChatMessageView } from "@/types/chat";
import type { PlaylistTrackView } from "@/types/playlist";

export type MessageRow = {
  id: string;
  sender_id: string;
  text: string | null;
  content: StoredChatMessageContentNode[] | null;
  media_url: string | null;
  media_title: string | null;
  media_artist: string | null;
  shared_track_id: string | null;
  reply_to_message_id: string | null;
  created_at: string;
  read_at: string | null;
};

type TrackRow = {
  id: string;
  user_id: string;
  title: string;
  artist: string;
  file_url: string;
  duration_seconds: number | null;
};

export const MESSAGE_SELECT =
  "id, sender_id, text, content, media_url, media_title, media_artist, shared_track_id, reply_to_message_id, created_at, read_at";
export const LEGACY_MESSAGE_SELECT =
  "id, sender_id, text, media_url, media_title, media_artist, shared_track_id, reply_to_message_id, created_at, read_at";

export function isMissingMessageContentColumn(error: { code?: string; message?: string } | null) {
  return error?.code === "42703" || error?.code === "PGRST204" || Boolean(error?.message?.includes("messages.content"));
}

export async function loadMessageRows(admin: ReturnType<typeof getAdminClient>, chatId: string) {
  const current = await admin.from("messages").select(MESSAGE_SELECT).eq("chat_id", chatId).order("created_at", { ascending: true }).limit(200);
  if (!isMissingMessageContentColumn(current.error)) return current;
  const legacy = await admin.from("messages").select(LEGACY_MESSAGE_SELECT).eq("chat_id", chatId).order("created_at", { ascending: true }).limit(200);
  return { ...legacy, data: legacy.data?.map((row) => ({ ...row, content: null })) ?? null };
}

function mapTrackRow(row: TrackRow): PlaylistTrackView {
  return { id: row.id, title: row.title, artist: row.artist, streamUrl: publicAssetUrl(row.file_url) ?? row.file_url, durationSeconds: row.duration_seconds };
}

async function resolveMediaUrl(key: string | null): Promise<string | null> {
  if (!key) return null;
  if (key.startsWith("http://") || key.startsWith("https://")) return key;
  if (isPrivateChatMediaKey(key)) {
    const { downloadUrl } = await createPresignedGetUrl({ key, bucket: "private" });
    return downloadUrl;
  }
  return publicAssetUrl(key);
}

async function buildAttachment(row: MessageRow, tracksById: Map<string, TrackRow>): Promise<ChatMessageAttachment | null> {
  if (row.shared_track_id) {
    const track = tracksById.get(row.shared_track_id);
    return track ? { kind: "track", track: mapTrackRow(track), ownerId: track.user_id } : null;
  }
  if (!row.media_url) return null;
  const url = await resolveMediaUrl(row.media_url);
  if (!url) return null;
  const kind = chatAttachmentKindFromKey(row.media_url);
  if (kind === "image") return { kind: "image", url };
  if (kind === "circle") return { kind: "circle", url };
  if (kind !== "audio") return null;
  const segment = row.media_url.split("/").pop() ?? "audio";
  const fileName = segment.includes(".") ? segment : `${segment}.mp3`;
  const fallbackTitle = fileName.replace(/\.[^.]+$/i, "") || "Аудио";
  const audioKind = chatAudioKindFromKey(row.media_url) === "voice" || row.media_title === "Голосовое сообщение" ? "voice" : "music";
  return { kind: "audio", audioKind, url, fileName, title: row.media_title?.trim() || fallbackTitle, artist: row.media_artist?.trim() || "Аудиосообщение" };
}

function mapMessageRow(
  row: MessageRow,
  viewerId: string,
  repliesById: Map<string, MessageRow>,
  attachmentsById: Map<string, ChatMessageAttachment | null>,
  contentById: Map<string, ChatMessageView["content"]>,
): ChatMessageView {
  const replyRow = row.reply_to_message_id ? repliesById.get(row.reply_to_message_id) : undefined;
  return {
    id: row.id,
    senderId: row.sender_id,
    text: row.text ?? null,
    content: contentById.get(row.id) ?? null,
    createdAt: row.created_at,
    isMine: row.sender_id === viewerId,
    readAt: row.read_at,
    replyTo: replyRow ? { id: replyRow.id, senderId: replyRow.sender_id, text: replyRow.text, isMine: replyRow.sender_id === viewerId } : null,
    attachment: attachmentsById.get(row.id) ?? null,
    reactions: [],
  };
}

export async function hydrateMessages(rows: MessageRow[], viewerId: string, chatId: string): Promise<ChatMessageView[]> {
  const repliesById = new Map(rows.map((row) => [row.id, row]));
  const trackIds = [...new Set(rows.map((row) => row.shared_track_id).filter(Boolean))] as string[];
  const reactionsPromise = loadMessageReactionsRest(rows.map((row) => row.id), viewerId);
  const contentPromise = Promise.all([
    hydrateMessageContentRest(new Map(rows.map((row) => [row.id, row.content]))),
    hydrateLegacyMessageContentRest(
      chatId,
      new Map(rows.filter((row) => !row.content?.length).map((row) => [row.id, row.text])),
    ),
  ]).then(([structured, legacy]) => {
    for (const [messageId, nodes] of legacy) {
      if (!structured.get(messageId)?.length) structured.set(messageId, nodes);
    }
    return structured;
  });
  const tracksById = new Map<string, TrackRow>();
  if (trackIds.length > 0) {
    const { data, error } = await getAdminClient().from("playlist_tracks").select("id, user_id, title, artist, file_url, duration_seconds").in("id", trackIds);
    if (error) throw new Error(error.message);
    for (const track of (data ?? []) as TrackRow[]) tracksById.set(track.id, track);
  }
  const attachmentsById = new Map<string, ChatMessageAttachment | null>();
  await Promise.all(rows.map(async (row) => attachmentsById.set(row.id, await buildAttachment(row, tracksById))));
  const [reactionsByMessage, contentById] = await Promise.all([reactionsPromise, contentPromise]);
  return rows.map((row) => ({ ...mapMessageRow(row, viewerId, repliesById, attachmentsById, contentById), reactions: reactionsByMessage.get(row.id) ?? [] }));
}
