import { normalizeExternalUrl } from "./normalize-url";

export type RichTextToken =
  | { type: "text"; value: string }
  | { type: "link"; value: string; url: string };

const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<>]{3,2048}/giu;
const TRAILING_PUNCTUATION = /[),.!?:;\]}]+$/u;

export function tokenizeRichText(text: string): RichTextToken[] {
  const tokens: RichTextToken[] = [];
  let cursor = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const index = match.index ?? 0;
    let visible = match[0];
    const trailing = visible.match(TRAILING_PUNCTUATION)?.[0] ?? "";
    visible = trailing ? visible.slice(0, -trailing.length) : visible;
    const normalized = normalizeExternalUrl(visible);
    if (!normalized) continue;
    if (index > cursor) tokens.push({ type: "text", value: text.slice(cursor, index) });
    tokens.push({ type: "link", value: visible, url: normalized });
    if (trailing) tokens.push({ type: "text", value: trailing });
    cursor = index + match[0].length;
  }
  if (cursor < text.length) tokens.push({ type: "text", value: text.slice(cursor) });
  return tokens.length ? tokens : [{ type: "text", value: text }];
}
