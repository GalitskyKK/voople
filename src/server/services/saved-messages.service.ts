import { chatAttachmentKindFromKey } from "@/lib/object-storage";
import {
  createSavedMessageRest,
  deleteSavedMessageRest,
  editSavedMessageRest,
  listSavedMessagesRest,
} from "@/server/data/saved-messages-rest";
import { resolvePublicMediaKey } from "@/server/services/upload.service";
import type { SavedMessageCursor } from "@/types/saved-messages";

export async function listSavedMessages(input: {
  ownerId: string;
  cursor?: SavedMessageCursor;
  limit: number;
  query?: string;
}) {
  return listSavedMessagesRest(input);
}

export async function createSavedMessage(input: {
  ownerId: string;
  messageId: string;
  text?: string;
  mediaKey?: string;
  mediaTitle?: string;
  mediaArtist?: string;
  sharedTrackId?: string;
  replyToMessageId?: string;
}) {
  const text = input.text?.trim() ?? "";
  const mediaKey = input.mediaKey
    ? await resolvePublicMediaKey(input.mediaKey, input.ownerId, "chat")
    : null;
  const isAudio = Boolean(
    mediaKey && chatAttachmentKindFromKey(mediaKey) === "audio",
  );
  const mediaTitle = isAudio ? input.mediaTitle?.trim() ?? "" : "";
  const mediaArtist = isAudio ? input.mediaArtist?.trim() ?? "" : "";
  if (isAudio && (!mediaTitle || !mediaArtist)) {
    throw new Error("Укажите название и исполнителя для аудио");
  }

  return createSavedMessageRest({
    ownerId: input.ownerId,
    messageId: input.messageId,
    text: text || null,
    mediaKey,
    mediaTitle: mediaTitle || null,
    mediaArtist: mediaArtist || null,
    sharedTrackId: input.sharedTrackId ?? null,
    replyToMessageId: input.replyToMessageId ?? null,
  });
}

export async function editSavedMessage(
  messageId: string,
  ownerId: string,
  text: string,
) {
  return editSavedMessageRest(messageId, ownerId, text);
}

export async function deleteSavedMessage(messageId: string, ownerId: string) {
  return deleteSavedMessageRest(messageId, ownerId);
}
