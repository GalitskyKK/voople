const HASHTAG_PATTERN = /#[\p{L}\p{N}_]{1,64}/gu;

export function extractHashtags(text: string, limit = 10): string[] {
  const seen = new Set<string>();

  for (const match of text.matchAll(HASHTAG_PATTERN)) {
    const tag = match[0]?.slice(1).toLowerCase();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    if (seen.size >= limit) break;
  }

  return [...seen];
}
