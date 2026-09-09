import type { ChatMessageAttachment } from "@/types/chat";

export type SavedMessageCursor = {
  createdAt: string;
  id: string;
};

export type SavedMessageView = {
  id: string;
  text: string | null;
  createdAt: string;
  editedAt: string | null;
  replyTo: {
    id: string;
    text: string | null;
  } | null;
  attachment: ChatMessageAttachment | null;
};

export type SavedMessagePage = {
  items: SavedMessageView[];
  nextCursor: SavedMessageCursor | null;
};
