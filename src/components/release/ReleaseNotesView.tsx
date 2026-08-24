"use client";

import { CalendarDays, Sparkles } from "lucide-react";

import { SafeExternalLink } from "@/components/ui/SafeExternalLink";
import { parseReleaseNoteBlocks } from "@/lib/release/release-notes-format";

type ReleaseNotesViewProps = {
  version: string;
  previousVersion?: string | null;
  title: string;
  notes: string | null;
  publishedAt: Date;
};

function SafeInline({ text }: { text: string }) {
  const matches = [...text.matchAll(/\[([^\]]{1,120})\]\((https:\/\/[^\s)]+)\)/g)];
  if (!matches.length) return <>{text}</>;

  const parts: React.ReactNode[] = [];
  let offset = 0;
  for (const [index, match] of matches.entries()) {
    const start = match.index ?? 0;
    if (start > offset) parts.push(text.slice(offset, start));
    parts.push(
      <SafeExternalLink key={`${match[2]}:${index}`} url={match[2]!}>
        {match[1]}
      </SafeExternalLink>,
    );
    offset = start + match[0].length;
  }
  if (offset < text.length) parts.push(text.slice(offset));
  return <>{parts}</>;
}

export function ReleaseNotesView({
  version,
  previousVersion,
  title,
  notes,
  publishedAt,
}: ReleaseNotesViewProps) {
  const blocks = parseReleaseNoteBlocks(notes, title);
  const validDate = Number.isFinite(publishedAt.getTime());
  const previous = previousVersion?.trim();

  return (
    <article className="min-w-0" aria-labelledby="release-notes-title">
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--app-muted)]">
        <span className="rounded-full bg-[var(--app-accent-soft)] px-2.5 py-1 font-semibold text-[var(--theme-accent)]">
          Версия {version}
        </span>
        {validDate ? (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            {publishedAt.toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        ) : null}
        {previous && previous !== "чистая установка" ? (
          <span>Обновление с {previous}</span>
        ) : null}
      </div>

      <div className="mt-4 flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--app-accent-soft)] text-[var(--theme-accent)]">
          <Sparkles className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id="release-notes-title" className="break-words text-xl font-semibold tracking-[-0.02em]">
            {title}
          </h2>
          <p className="mt-1 text-sm text-[var(--app-muted)]">Главное в этом обновлении</p>
        </div>
      </div>

      <div className="mt-5 min-w-0 border-t border-[var(--app-border)] pt-5 [overflow-wrap:anywhere]">
        {!blocks.length ? (
          <p className="text-sm leading-6 text-[var(--app-muted)]">
            Для этой версии нет подробного описания.
          </p>
        ) : blocks.map((block, index) => {
          if (block.kind === "heading") {
            return (
              <h3 key={`${block.kind}:${index}`} className="mb-2 mt-5 text-base font-semibold first:mt-0">
                <SafeInline text={block.text} />
              </h3>
            );
          }
          if (block.kind === "list") {
            const List = block.ordered ? "ol" : "ul";
            return (
              <List
                key={`${block.kind}:${index}`}
                className={`${block.ordered ? "list-decimal" : "list-disc"} my-3 space-y-2.5 pl-5 text-sm leading-6 text-[var(--app-text-secondary)]`}
              >
                {block.items.map((item, itemIndex) => (
                  <li key={`${itemIndex}:${item}`} className="min-w-0 pl-1">
                    <SafeInline text={item} />
                  </li>
                ))}
              </List>
            );
          }
          return (
            <p key={`${block.kind}:${index}`} className="my-3 text-sm leading-6 text-[var(--app-text-secondary)]">
              <SafeInline text={block.text} />
            </p>
          );
        })}
      </div>
    </article>
  );
}
