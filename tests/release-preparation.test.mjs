import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { VERSION_FILES, addChangelogSection, assertReleaseContents, assertVersionSync, bumpVersion, updateVersions } from "../scripts/desktop-release-version.mjs";
import { releaseVersionFromBranch, validateReleaseTagInput } from "../scripts/validate-desktop-release-tag.mjs";

const files = Object.fromEntries([...VERSION_FILES, "CHANGELOG.md"].map((file) => [file, readFileSync(file, "utf8")]));
const current = JSON.parse(files["desktop/package.json"]).version;
const next = "9.8.7";
const sha = "a".repeat(40);

test("desktop release bump choices produce a later version", () => {
  assert.equal(bumpVersion("0.1.44", "patch"), "0.1.45");
  assert.equal(bumpVersion("0.1.44", "minor"), "0.2.0");
  assert.equal(bumpVersion("0.1.44", "major"), "1.0.0");
  assert.throws(() => bumpVersion("0.1.44", "other"), /Invalid bump/);
});

test("fixture update synchronizes every desktop version and inserts operator notes", () => {
  assertVersionSync(files, current);
  const updated = updateVersions(files, current, next);
  updated["CHANGELOG.md"] = addChangelogSection(files["CHANGELOG.md"], next, "2026-09-29", "Desktop improvements", ["Faster room joining", "Clearer updater status"]);
  assertReleaseContents(updated, next);
  assert.match(updated["CHANGELOG.md"], /^# Changelog\n\n## \[9\.8\.7\] - 2026-09-29\n\n### Desktop improvements\n\n- Faster room joining\n- Clearer updater status/m);
  assert.equal(files["desktop/package.json"], readFileSync("desktop/package.json", "utf8"));
});

test("missing lock entry and mismatched versions fail closed", () => {
  const broken = { ...files, "desktop/package-lock.json": files["desktop/package-lock.json"].replace(/"version": "[^"]+"/, '"version": "9.9.9"') };
  assert.throws(() => assertVersionSync(broken, current), /package-lock/);
  assert.throws(() => updateVersions(broken, current, next), /package-lock/);
});

test("merged tag input requires branch, version, exact SHA, changelog, and no duplicate", () => {
  const updated = updateVersions(files, current, next);
  updated["CHANGELOG.md"] = addChangelogSection(files["CHANGELOG.md"], next, "2026-09-29", "Desktop improvements", ["Faster room joining"]);
  assert.equal(releaseVersionFromBranch("release/desktop-9.8.7"), next);
  assert.equal(validateReleaseTagInput("release/desktop-9.8.7", sha, sha, updated).tag, "desktop-v9.8.7");
  assert.throws(() => releaseVersionFromBranch("feature/desktop-9.8.7"), /Not a desktop release branch/);
  assert.throws(() => validateReleaseTagInput("release/desktop-9.8.8", sha, sha, updated), /expected 9.8.8/);
  assert.throws(() => validateReleaseTagInput("release/desktop-9.8.7", sha, "b".repeat(40), updated), /exact release PR merge commit/);
  assert.throws(() => validateReleaseTagInput("release/desktop-9.8.7", sha, sha, updated, ["desktop-v9.8.7"]), /already exists/);
  assert.throws(() => validateReleaseTagInput("release/desktop-9.8.7", sha, sha, { ...updated, "CHANGELOG.md": files["CHANGELOG.md"] }), /CHANGELOG/);
});
