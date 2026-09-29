export const VERSION_FILES = [
  "desktop/package.json",
  "desktop/package-lock.json",
  "desktop/src-tauri/Cargo.toml",
  "desktop/src-tauri/Cargo.lock",
  "desktop/src-tauri/tauri.conf.json",
];

export function parseVersion(value) {
  if (!/^\d+\.\d+\.\d+$/.test(value)) throw new Error(`Invalid desktop version: ${value}`);
  return value.split(".").map(Number);
}

export function bumpVersion(value, kind) {
  const [major, minor, patch] = parseVersion(value);
  if (kind === "major") return `${major + 1}.0.0`;
  if (kind === "minor") return `${major}.${minor + 1}.0`;
  if (kind === "patch") return `${major}.${minor}.${patch + 1}`;
  throw new Error(`Invalid bump: ${kind}`);
}

function cargoVersion(content, pattern, label) {
  const match = pattern.exec(content);
  if (!match) throw new Error(`Cannot read version in ${label}`);
  return match[2];
}

const manifestPattern = /(\[package\][\s\S]*?^version\s*=\s*")([^"]+)(")/m;
const lockPattern = /(\[\[package\]\]\r?\nname\s*=\s*"voople-desktop"\r?\nversion\s*=\s*")([^"]+)(")/;

export function getVersions(files) {
  const pkg = JSON.parse(files[VERSION_FILES[0]]);
  const lock = JSON.parse(files[VERSION_FILES[1]]);
  const config = JSON.parse(files[VERSION_FILES[4]]);
  return [
    [VERSION_FILES[0], pkg.version],
    [VERSION_FILES[1], lock.version],
    [`${VERSION_FILES[1]} packages[""]`, lock.packages?.[""]?.version],
    [VERSION_FILES[2], cargoVersion(files[VERSION_FILES[2]], manifestPattern, VERSION_FILES[2])],
    [VERSION_FILES[3], cargoVersion(files[VERSION_FILES[3]], lockPattern, VERSION_FILES[3])],
    [VERSION_FILES[4], config.version],
  ];
}

export function assertVersionSync(files, expected) {
  parseVersion(expected);
  for (const [file, version] of getVersions(files)) {
    if (version !== expected) throw new Error(`${file}: ${version} (expected ${expected})`);
  }
}

export function updateVersions(files, current, next) {
  assertVersionSync(files, current);
  parseVersion(next);
  const result = { ...files };
  for (const file of [VERSION_FILES[0], VERSION_FILES[1], VERSION_FILES[4]]) {
    const json = JSON.parse(result[file]);
    json.version = next;
    if (file === VERSION_FILES[1]) json.packages[""].version = next;
    result[file] = `${JSON.stringify(json, null, 2)}\n`;
  }
  for (const [file, pattern] of [[VERSION_FILES[2], manifestPattern], [VERSION_FILES[3], lockPattern]]) {
    result[file] = result[file].replace(pattern, (_, before, _old, after) => `${before}${next}${after}`);
  }
  assertVersionSync(result, next);
  return result;
}

export function addChangelogSection(content, version, date, title, notes) {
  parseVersion(version);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid release date");
  if (!title.trim() || /[\r\n]/.test(title)) throw new Error("Invalid release title");
  if (notes.length < 1 || notes.length > 5 || notes.some((note) => !note.trim() || /[\r\n]/.test(note))) {
    throw new Error("Provide 1–5 single-line release notes");
  }
  if (new RegExp(`^## \\[${version.replaceAll(".", "\\.")}\\]`, "m").test(content)) {
    throw new Error(`CHANGELOG.md already contains ${version}`);
  }
  if (!/^# Changelog\r?\n/.test(content)) throw new Error("Missing CHANGELOG.md heading");
  const section = `## [${version}] - ${date}\n\n### ${title.trim()}\n\n${notes.map((note) => `- ${note.trim()}`).join("\n")}\n\n`;
  return content.replace(/^# Changelog\r?\n(?:\r?\n)?/, `# Changelog\n\n${section}`);
}

export function assertReleaseContents(files, version) {
  assertVersionSync(files, version);
  if (!new RegExp(`^## \\[${version.replaceAll(".", "\\.")}\\] - \\d{4}-\\d{2}-\\d{2}$`, "m").test(files["CHANGELOG.md"] ?? "")) {
    throw new Error(`CHANGELOG.md lacks release ${version}`);
  }
}
