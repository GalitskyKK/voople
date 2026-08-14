import assert from "node:assert/strict";
import test from "node:test";

import { extractReleaseNotes } from "../scripts/release-notes.mjs";

test("extracts only the requested changelog section", () => {
  const changelog = `# Changelog\r\n\r\n## [1.2.0] - 2026-08-14\r\n\r\n### Added\r\n\r\n- New room.\r\n\r\n## [1.1.0] - 2026-08-01\r\n\r\n- Older change.\r\n`;
  assert.equal(
    extractReleaseNotes(changelog, "1.2.0"),
    "### Added\n\n- New room.",
  );
});

test("returns null for missing or empty versions", () => {
  assert.equal(extractReleaseNotes("# Changelog\n", "1.2.0"), null);
  assert.equal(extractReleaseNotes("# Changelog\n\n## [1.2.0]\n\n", "1.2.0"), null);
});

test("bounds updater metadata notes", () => {
  assert.equal(
    extractReleaseNotes("## [1.2.0]\n123456", "1.2.0", 4),
    "1234",
  );
});
