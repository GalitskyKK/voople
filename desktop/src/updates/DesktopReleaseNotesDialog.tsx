import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { BookOpen, ExternalLink } from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { Sheet } from "@/components/ui/Sheet";
import { reportClientMetric } from "@/lib/telemetry/client";

import { DESKTOP_RELEASE_NOTES_EVENT } from "./events";

type ReleaseNoteEntry = {
  previousVersion: string;
  installedVersion: string;
  notes: string | null;
  installedAtUnix: number;
  acknowledgedAtUnix: number | null;
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
      <button
        key={`${match[2]}:${index}`}
        type="button"
        className="inline-flex items-center gap-1 text-[var(--theme-accent)] underline-offset-2 hover:underline"
        onClick={() => void invoke("open_external_url", { url: match[2] }).catch((error) => {
          reportClientMetric({ name: "desktop-release-note-link-error", value: 1 });
          console.error("Release-note link could not be opened", error);
        })}
      >
        {match[1]} <ExternalLink className="h-3 w-3" aria-hidden="true" />
      </button>,
    );
    offset = start + match[0].length;
  }
  if (offset < text.length) parts.push(text.slice(offset));
  return <>{parts}</>;
}

function SafeReleaseNotes({ notes }: { notes: string | null }) {
  const blocks = useMemo(() => {
    const lines = (notes ?? "").split(/\r?\n/);
    const result: Array<{ kind: "heading" | "paragraph" | "list"; lines: string[] }> = [];
    for (const source of lines) {
      const line = source.trim();
      if (!line) continue;
      if (/^#{1,3}\s+/.test(line)) {
        result.push({ kind: "heading", lines: [line.replace(/^#{1,3}\s+/, "")] });
      } else if (/^[-*]\s+/.test(line)) {
        const text = line.replace(/^[-*]\s+/, "");
        const previous = result.at(-1);
        if (previous?.kind === "list") previous.lines.push(text);
        else result.push({ kind: "list", lines: [text] });
      } else {
        result.push({ kind: "paragraph", lines: [line] });
      }
    }
    return result;
  }, [notes]);

  if (!blocks.length) {
    return <p className="text-sm text-[var(--app-muted)]">Для этой версии нет подробного описания.</p>;
  }
  return blocks.map((block, index) => {
    if (block.kind === "heading") {
      return <h3 key={index} className="mt-5 text-base font-semibold first:mt-0"><SafeInline text={block.lines[0]} /></h3>;
    }
    if (block.kind === "list") {
      return <ul key={index} className="my-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--app-text-secondary)]">{block.lines.map((line, lineIndex) => <li key={lineIndex}><SafeInline text={line} /></li>)}</ul>;
    }
    return <p key={index} className="my-3 text-sm leading-6 text-[var(--app-text-secondary)]"><SafeInline text={block.lines[0]} /></p>;
  });
}

export function DesktopReleaseNotesDialog() {
  const [history, setHistory] = useState<ReleaseNoteEntry[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async (manual: boolean) => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    try {
      const [version, entries] = await Promise.all([
        getVersion(),
        invoke<ReleaseNoteEntry[]>("desktop_release_notes"),
      ]);
      setHistory(entries);
      const current = entries.find((entry) => entry.installedVersion === version);
      const selected = manual ? entries[0] : current;
      setSelectedVersion(selected?.installedVersion ?? null);
      setOpen(manual || Boolean(current && !current.acknowledgedAtUnix));
    } catch (error) {
      reportClientMetric({ name: "desktop-release-notes-load-error", value: 1 });
      console.error("Desktop release-note history could not be loaded", error);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(false), 0);
    const onOpenHistory = () => void load(true);
    window.addEventListener(DESKTOP_RELEASE_NOTES_EVENT, onOpenHistory);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener(DESKTOP_RELEASE_NOTES_EVENT, onOpenHistory);
    };
  }, [load]);

  const selected = history.find((entry) => entry.installedVersion === selectedVersion) ?? null;
  const close = () => {
    setOpen(false);
    if (!selected || selected.acknowledgedAtUnix) return;
    void invoke("acknowledge_desktop_release", {
      installedVersion: selected.installedVersion,
    }).then(() => {
      setHistory((entries) => entries.map((entry) => entry.installedVersion === selected.installedVersion
        ? { ...entry, acknowledgedAtUnix: Math.floor(Date.now() / 1_000) }
        : entry));
    }).catch((error) => {
      reportClientMetric({ name: "desktop-release-note-ack-error", value: 1 });
      console.error("Desktop release note could not be acknowledged", error);
    });
  };

  return (
    <Sheet open={open} onClose={close} ariaLabel="Что нового в Voople" className="max-w-2xl p-0">
      <header className="sticky top-0 z-10 border-b border-[var(--app-border)] bg-[var(--background)] px-5 py-4 pr-14">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--app-accent-soft)] text-[var(--theme-accent)]"><BookOpen className="h-5 w-5" /></span>
          <div><p className="text-lg font-semibold">Что нового</p><p className="text-xs text-[var(--app-muted)]">Изменения после обновления приложения</p></div>
        </div>
        {history.length > 1 ? (
          <select value={selectedVersion ?? ""} onChange={(event) => setSelectedVersion(event.target.value)} className="voople-input mt-3 w-full text-sm" aria-label="Версия приложения">
            {history.map((entry) => <option key={entry.installedVersion} value={entry.installedVersion}>Voople {entry.installedVersion}</option>)}
          </select>
        ) : null}
      </header>
      <div className="px-5 py-5">
        {selected ? (
          <Fragment>
            <p className="mb-4 text-xs text-[var(--app-muted)]">Voople {selected.previousVersion} → {selected.installedVersion} · {new Date(selected.installedAtUnix * 1_000).toLocaleDateString("ru-RU")}</p>
            <SafeReleaseNotes notes={selected.notes} />
          </Fragment>
        ) : <p className="text-sm text-[var(--app-muted)]">История появится после первого обновления приложения.</p>}
      </div>
    </Sheet>
  );
}
