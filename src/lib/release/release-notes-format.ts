export type ReleaseNoteBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] };

function normalizedHeading(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");
}

/**
 * Parses the small, trusted Markdown subset used by the signed release catalog.
 * Unknown syntax stays readable as text instead of becoming raw HTML.
 */
export function parseReleaseNoteBlocks(
  notes: string | null | undefined,
  displayedTitle?: string,
): ReleaseNoteBlock[] {
  const result: ReleaseNoteBlock[] = [];
  const lines = (notes ?? "").replace(/\r\n/g, "\n").split("\n");
  const duplicateTitle = displayedTitle ? normalizedHeading(displayedTitle) : null;

  for (const source of lines) {
    const line = source.trim();
    if (!line) continue;

    const heading = line.match(/^#{1,3}\s+(.+)$/)?.[1]?.trim();
    if (heading) {
      if (duplicateTitle && normalizedHeading(heading) === duplicateTitle) continue;
      result.push({ kind: "heading", text: heading });
      continue;
    }

    // Updater metadata from older releases could contain an isolated counter
    // before the real notes. It has no user-facing meaning and must not render.
    if (/^\d{1,3}$/.test(line)) continue;

    const unordered = line.match(/^[-*]\s+(.+)$/)?.[1]?.trim();
    const orderedMatch = line.match(/^\d+[.)]\s+(.+)$/);
    const listText = unordered ?? orderedMatch?.[1]?.trim();
    if (listText) {
      const ordered = Boolean(orderedMatch);
      const previous = result.at(-1);
      if (previous?.kind === "list" && previous.ordered === ordered) {
        previous.items.push(listText);
      } else {
        result.push({ kind: "list", ordered, items: [listText] });
      }
      continue;
    }

    const previous = result.at(-1);
    if (previous?.kind === "paragraph") {
      previous.text = `${previous.text} ${line}`;
    } else {
      result.push({ kind: "paragraph", text: line });
    }
  }

  return result;
}
