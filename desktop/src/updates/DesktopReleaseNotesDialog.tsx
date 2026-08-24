import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { BookOpen } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import changelogSource from "../../../CHANGELOG.md?raw";

import { ReleaseNotesView } from "@/components/release/ReleaseNotesView";
import { Sheet } from "@/components/ui/Sheet";
import { reportClientMetric } from "@/lib/telemetry/client";
import { parseReleaseCatalog } from "@/lib/release/parse-changelog";
import { parseRemoteReleaseCatalog } from "@/lib/release/release-catalog";
import type { ReleaseNoteEntry as CatalogEntry } from "@/types/release";

import { DESKTOP_RELEASE_NOTES_EVENT } from "./events";

type ReleaseNoteTransition = {
  previousVersion: string;
  installedVersion: string;
  notes: string | null;
  installedAtUnix: number;
  acknowledgedAtUnix: number | null;
};

type ReleaseNoteHistoryEntry = ReleaseNoteTransition & { title: string };

const BUNDLED_RELEASES = parseReleaseCatalog(changelogSource);
const REMOTE_CATALOG_URL = import.meta.env.VITE_DESKTOP_RELEASE_CATALOG_URL?.trim();

async function loadRemoteCatalog(): Promise<CatalogEntry[]> {
  if (!REMOTE_CATALOG_URL?.startsWith("https://")) return [];
  const response = await fetch(REMOTE_CATALOG_URL, {
    cache: "no-store",
    credentials: "omit",
    referrerPolicy: "no-referrer",
    signal: AbortSignal.timeout(4_000),
  });
  if (!response.ok) throw new Error("Release catalog request failed");
  const catalog = parseRemoteReleaseCatalog(await response.json());
  if (!catalog) throw new Error("Release catalog validation failed");
  return catalog.releases;
}

function catalogHistory(entry: CatalogEntry): ReleaseNoteHistoryEntry {
  return {
    previousVersion: entry.previousVersion ?? "чистая установка",
    installedVersion: entry.version,
    title: entry.title,
    notes: entry.notes,
    installedAtUnix: Math.max(1, Math.floor(Date.parse(entry.publishedAt) / 1_000)),
    acknowledgedAtUnix: 1,
  };
}

export function DesktopReleaseNotesDialog() {
  const [history, setHistory] = useState<ReleaseNoteHistoryEntry[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async (manual: boolean) => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    try {
      const [version, transitionResult, remoteResult] = await Promise.all([
        getVersion(),
        invoke<ReleaseNoteTransition[]>("desktop_release_notes").then(
          (entries) => ({ entries, failed: false }),
          () => ({ entries: [] as ReleaseNoteTransition[], failed: true }),
        ),
        loadRemoteCatalog().then(
          (releases) => ({ releases, failed: false }),
          () => ({ releases: [] as CatalogEntry[], failed: true }),
        ),
      ]);
      const bundled = BUNDLED_RELEASES.find((entry) => entry.version === version);
      if (remoteResult.failed) {
        reportClientMetric({ name: "desktop-release-catalog-load-error", value: 1 });
      }
      if (transitionResult.failed) {
        reportClientMetric({ name: "desktop-release-note-history-load-error", value: 1 });
      }
      const catalogEntries = new Map(BUNDLED_RELEASES.map((entry) => [entry.version, entry]));
      for (const entry of remoteResult.releases) {
        const bundledEntry = catalogEntries.get(entry.version);
        if (!bundledEntry || entry.notes.trim().length > bundledEntry.notes.trim().length) {
          catalogEntries.set(entry.version, entry);
        }
      }
      const merged: ReleaseNoteHistoryEntry[] = transitionResult.entries.map((entry) => ({
        ...entry,
        title: catalogEntries.get(entry.installedVersion)?.title ?? `Voople ${entry.installedVersion}`,
      }));
      for (const entry of catalogEntries.values()) {
        const historyIndex = merged.findIndex((historyEntry) => historyEntry.installedVersion === entry.version);
        if (historyIndex < 0) {
          merged.push(catalogHistory(entry));
        } else if (entry.notes.trim().length > (merged[historyIndex]?.notes?.trim().length ?? 0)) {
          merged[historyIndex] = { ...merged[historyIndex]!, title: entry.title, notes: entry.notes };
        }
      }
      if (bundled && !merged.some((entry) => entry.installedVersion === version)) {
        merged.unshift(catalogHistory(bundled));
      }
      merged.sort((left, right) => right.installedAtUnix - left.installedAtUnix);
      setHistory(merged);
      const current = merged.find((entry) => entry.installedVersion === version);
      const selected = manual ? merged[0] : current;
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
    <Sheet open={open} onClose={close} ariaLabel="Что нового в Voople" className="flex max-h-[min(90dvh,760px)] max-w-2xl flex-col overflow-hidden p-0">
      <header className="relative z-10 shrink-0 border-b border-[var(--app-border)] bg-[var(--background)] px-5 py-4 pr-14">
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
      <div className="voople-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {selected ? (
          <ReleaseNotesView
            version={selected.installedVersion}
            previousVersion={selected.previousVersion}
            title={selected.title}
            notes={selected.notes}
            publishedAt={new Date(selected.installedAtUnix * 1_000)}
          />
        ) : <p className="text-sm text-[var(--app-muted)]">История появится после первого обновления приложения.</p>}
      </div>
    </Sheet>
  );
}
