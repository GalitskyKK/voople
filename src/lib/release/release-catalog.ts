import type { ReleaseCatalog, ReleaseNoteEntry } from "@/types/release";

const VERSION = /^[0-9A-Za-z][0-9A-Za-z.-]{0,63}$/;

function parseEntry(value: unknown): ReleaseNoteEntry | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Record<string, unknown>;
  if (
    typeof entry.version !== "string" || !VERSION.test(entry.version) ||
    typeof entry.title !== "string" || !entry.title.trim() || entry.title.length > 200 ||
    typeof entry.notes !== "string" || entry.notes.length > 20_000 ||
    typeof entry.publishedAt !== "string" || !Number.isFinite(Date.parse(entry.publishedAt)) ||
    !(entry.previousVersion === null || (
      typeof entry.previousVersion === "string" && VERSION.test(entry.previousVersion)
    ))
  ) return null;
  return {
    version: entry.version,
    title: entry.title.trim(),
    notes: entry.notes,
    publishedAt: new Date(entry.publishedAt).toISOString(),
    previousVersion: entry.previousVersion,
  };
}

export function parseRemoteReleaseCatalog(value: unknown): ReleaseCatalog | null {
  if (!value || typeof value !== "object") return null;
  const catalog = value as Record<string, unknown>;
  if (
    catalog.schemaVersion !== 1 ||
    typeof catalog.generatedAt !== "string" ||
    !Number.isFinite(Date.parse(catalog.generatedAt)) ||
    !Array.isArray(catalog.releases) ||
    catalog.releases.length > 20
  ) return null;
  const releases = catalog.releases.map(parseEntry);
  if (releases.some((entry) => !entry)) return null;
  return {
    schemaVersion: 1,
    generatedAt: new Date(catalog.generatedAt).toISOString(),
    releases: releases as ReleaseNoteEntry[],
  };
}
