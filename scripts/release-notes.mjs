export function extractReleaseNotes(changelogSource, version, maxLength = 20_000) {
  const changelog = changelogSource.replace(/\r\n/g, "\n");
  const releaseHeading = `## [${version}]`;
  const releaseStart = changelog.indexOf(releaseHeading);
  const releaseBodyStart = releaseStart < 0 ? -1 : changelog.indexOf("\n", releaseStart);
  const nextReleaseStart = releaseBodyStart < 0
    ? -1
    : changelog.indexOf("\n## [", releaseBodyStart + 1);
  if (releaseBodyStart < 0) return null;
  const body = changelog
    .slice(releaseBodyStart + 1, nextReleaseStart < 0 ? undefined : nextReleaseStart)
    .trim();
  return body ? body.slice(0, maxLength) : null;
}

const RELEASE_HEADING = /^## \[([^\]]+)](?:\s*-\s*(\d{4}-\d{2}-\d{2}))?\s*$/gm;

export function extractReleaseCatalog(changelogSource, limit = 20) {
  const changelog = changelogSource.replace(/\r\n/g, "\n");
  const matches = [...changelog.matchAll(RELEASE_HEADING)];
  const releases = matches.slice(0, limit).flatMap((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? changelog.length;
    const notes = changelog.slice(start, end).trim().slice(0, 20_000);
    if (!notes) return [];
    return [{
      version: match[1],
      title: notes.match(/^###\s+(.+)$/m)?.[1]?.trim() ?? `Voople ${match[1]}`,
      notes,
      publishedAt: match[2] ? `${match[2]}T00:00:00.000Z` : new Date(0).toISOString(),
      previousVersion: matches[index + 1]?.[1] ?? null,
    }];
  });
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    releases,
  };
}
