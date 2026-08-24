export function messageMentionsUsername(text: string | null, username: string | null) {
  if (!text || !username) return false;
  const escaped = username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(^|[^\\p{L}\\p{N}_])@${escaped}(?![\\p{L}\\p{N}_])`,
    "iu",
  ).test(text);
}
