import { z } from "zod";

export const savedMessageCursorSchema = z.object({
  createdAt: z.string().datetime({ offset: true }),
  id: z.string().uuid(),
});

export const listSavedMessagesInputSchema = z.object({
  cursor: savedMessageCursorSchema.optional(),
  limit: z.number().int().min(1).max(50).default(30),
  query: z.string().trim().max(100).optional(),
}).optional();

export const createSavedMessageInputSchema = z.object({
  messageId: z.string().uuid(),
  text: z.string().max(1000).optional(),
  mediaKey: z.string().min(10).max(500).optional(),
  mediaTitle: z.string().trim().min(1).max(100).optional(),
  mediaArtist: z.string().trim().min(1).max(100).optional(),
  sharedTrackId: z.string().uuid().optional(),
  replyToMessageId: z.string().uuid().optional(),
}).refine(
  (value) => Boolean(value.text?.trim() || value.mediaKey || value.sharedTrackId),
  { message: "Добавьте текст или вложение" },
);

export const editSavedMessageInputSchema = z.object({
  messageId: z.string().uuid(),
  text: z.string().max(1000),
});
