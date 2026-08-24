import assert from "node:assert/strict";
import test from "node:test";

import { extractReleaseCatalog, extractReleaseNotes } from "../scripts/release-notes.mjs";
import { parseReleaseNoteBlocks } from "../src/lib/release/release-notes-format.ts";

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

test("builds a bounded versioned release catalog", () => {
  const catalog = extractReleaseCatalog(`# Changelog\n\n## [1.2.0] - 2026-08-14\n\n### Calls\n\n- Reconnect.\n\n## [1.1.0] - 2026-08-01\n\n- Older.\n`, 1);
  assert.equal(catalog.schemaVersion, 1);
  assert.equal(catalog.releases.length, 1);
  assert.deepEqual(catalog.releases[0], {
    version: "1.2.0",
    title: "Calls",
    notes: "### Calls\n\n- Reconnect.",
    publishedAt: "2026-08-14T00:00:00.000Z",
    previousVersion: "1.1.0",
  });
});

test("release-note presentation removes updater noise and a duplicate title", () => {
  assert.deepEqual(
    parseReleaseNoteBlocks(
      "4\n\n### Voople Desktop 1.2.0\n\n- Первый пункт\n- Второй пункт",
      "Voople Desktop 1.2.0",
    ),
    [{ kind: "list", ordered: false, items: ["Первый пункт", "Второй пункт"] }],
  );
});

test("release-note presentation preserves long copy and ordered steps", () => {
  const longCopy = "Длинное описание обновления ".repeat(40).trim();
  const blocks = parseReleaseNoteBlocks(`${longCopy}\nпродолжается без обрезания.\n\n1. Обновить\n2. Перезапустить`);
  assert.equal(blocks[0]?.kind, "paragraph");
  assert.match(blocks[0]?.kind === "paragraph" ? blocks[0].text : "", /продолжается без обрезания\.$/);
  assert.deepEqual(blocks[1], {
    kind: "list",
    ordered: true,
    items: ["Обновить", "Перезапустить"],
  });
});
