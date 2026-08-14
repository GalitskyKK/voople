import { z } from "zod";

export const chatMessageContentInputSchema = z.array(z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string().max(1000) }),
  z.object({ type: z.literal("customEmoji"), emojiId: z.string().uuid() }),
])).max(100).optional();

export const sendChatMessageInputSchema = z.object({
  chatId: z.string().uuid(),
  messageId: z.string().uuid(),
  text: z.string().max(1000).optional(),
  mediaKey: z.string().min(10).max(500).optional(),
  mediaTitle: z.string().min(1).max(100).optional(),
  mediaArtist: z.string().min(1).max(100).optional(),
  sharedTrackId: z.string().uuid().optional(),
  replyToMessageId: z.string().uuid().optional(),
  content: chatMessageContentInputSchema,
}).refine(
  (value) => Boolean(value.text?.trim()) || Boolean(value.content?.length) || Boolean(value.mediaKey) || Boolean(value.sharedTrackId),
  { message: "Добавьте текст или вложение" },
);
