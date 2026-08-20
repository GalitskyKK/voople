export type ReleaseNoteEntry = {
  version: string;
  title: string;
  notes: string;
  publishedAt: string;
  previousVersion: string | null;
};

export type ReleaseCatalog = {
  schemaVersion: 1;
  generatedAt: string;
  releases: ReleaseNoteEntry[];
};
