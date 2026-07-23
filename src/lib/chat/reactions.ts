export const CHAT_REACTION_EMOJIS = ["❤️", "✨", "😂", "😮", "👍", "🔥"] as const;

export type ChatReactionEmoji = (typeof CHAT_REACTION_EMOJIS)[number];
