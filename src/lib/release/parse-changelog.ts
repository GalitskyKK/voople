import type { ReleaseNoteEntry } from "@/types/release";

const HEADING = /^## \[([^\]]+)](?:\s*-\s*(\d{4}-\d{2}-\d{2}))?\s*$/gm;

export function parseReleaseCatalog(changelog: string, limit = 20): ReleaseNoteEntry[] {
  const matches = [...changelog.replace(/\r\n/g, "\n").matchAll(HEADING)];
  return matches.slice(0, limit).flatMap((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? changelog.length;
    const body = changelog.slice(start, end).trim().slice(0, 20_000);
    if (!body) return [];
    const title = body.match(/^###\s+(.+)$/m)?.[1]?.trim() ?? `Voople ${match[1]}`;
    return [{
      version: match[1]!,
      title,
      notes: body,
      publishedAt: match[2] ? `${match[2]}T00:00:00.000Z` : new Date(0).toISOString(),
      previousVersion: matches[index + 1]?.[1] ?? null,
    }];
  });
}
