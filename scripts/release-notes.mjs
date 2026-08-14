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
