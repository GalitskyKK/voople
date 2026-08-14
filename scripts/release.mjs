import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import process from "node:process";

const FILES = [
  "desktop/package.json",
  "desktop/package-lock.json",
  "desktop/src-tauri/Cargo.toml",
  "desktop/src-tauri/Cargo.lock",
  "desktop/src-tauri/tauri.conf.json",
  "CHANGELOG.md",
];
const originals = new Map(await Promise.all(FILES.map(async (file) => [file, await readFile(file, "utf8")])));
const prompt = createInterface({ input: process.stdin, output: process.stdout });
let createdTag = null;
let originalHead = null;
let releaseCommit = null;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    shell: false,
  });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed`);
  return (result.stdout ?? "").trim();
}

function git(...args) {
  return run("git", args, { capture: true });
}

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`Unsupported version: ${version}`);
  return match.slice(1).map(Number);
}

function bump(version, kind) {
  const [major, minor, patch] = parseVersion(version);
  if (kind === "major") return `${major + 1}.0.0`;
  if (kind === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

async function restoreFiles() {
  await Promise.all([...originals].map(([file, content]) => writeFile(file, content, "utf8")));
}

async function main() {
  if (git("branch", "--show-current") !== "master") throw new Error("Release must run from master");
  if (git("status", "--porcelain")) throw new Error("Release requires a clean working tree");
  run("git", ["fetch", "origin", "master", "--tags"]);
  if (git("rev-parse", "HEAD") !== git("rev-parse", "origin/master")) {
    throw new Error("master must be synchronized with origin/master");
  }
  originalHead = git("rev-parse", "HEAD");

  const desktopPackage = JSON.parse(originals.get("desktop/package.json"));
  const currentVersion = desktopPackage.version;
  const bumpKind = (await prompt.question(`Version bump [patch/minor/major] (patch, current ${currentVersion}): `)).trim() || "patch";
  if (!["patch", "minor", "major"].includes(bumpKind)) throw new Error("Choose patch, minor or major");
  const suggested = bump(currentVersion, bumpKind);
  const nextVersion = (await prompt.question(`Version (${suggested}): `)).trim() || suggested;
  parseVersion(nextVersion);
  const tag = `desktop-v${nextVersion}`;
  if (git("tag", "--list", tag)) throw new Error(`${tag} already exists`);

  const previousTag = git("tag", "--list", "desktop-v*", "--sort=-version:refname").split(/\r?\n/).filter(Boolean)[0];
  const commitRange = previousTag ? `${previousTag}..HEAD` : "HEAD";
  const commits = git("log", "--pretty=format:%s", commitRange).split(/\r?\n/).filter(Boolean);
  const defaultTitle = `Voople Desktop ${nextVersion}`;
  const title = (await prompt.question(`Release title (${defaultTitle}): `)).trim() || defaultTitle;
  process.stdout.write("Release notes. Empty line finishes; Enter immediately uses commit subjects.\n");
  const notes = [];
  while (true) {
    const line = (await prompt.question("- ")).trim();
    if (!line) break;
    notes.push(line.replace(/^-\s*/, ""));
  }
  const releaseNotes = notes.length ? notes : commits;
  if (!releaseNotes.length) throw new Error("Release notes cannot be empty");

  desktopPackage.version = nextVersion;
  await writeFile("desktop/package.json", `${JSON.stringify(desktopPackage, null, 2)}\n`);
  const lock = JSON.parse(originals.get("desktop/package-lock.json"));
  lock.version = nextVersion;
  if (lock.packages?.[""]) lock.packages[""].version = nextVersion;
  await writeFile("desktop/package-lock.json", `${JSON.stringify(lock, null, 2)}\n`);
  await writeFile("desktop/src-tauri/tauri.conf.json", `${JSON.stringify({ ...JSON.parse(originals.get("desktop/src-tauri/tauri.conf.json")), version: nextVersion }, null, 2)}\n`);
  await writeFile("desktop/src-tauri/Cargo.toml", originals.get("desktop/src-tauri/Cargo.toml").replace(/(\[package\][\s\S]*?\nversion = ")[^"]+("\n)/, `$1${nextVersion}$2`));
  await writeFile("desktop/src-tauri/Cargo.lock", originals.get("desktop/src-tauri/Cargo.lock").replace(/(name = "voople-desktop"\nversion = ")[^"]+(")/, `$1${nextVersion}$2`));
  const date = new Date().toISOString().slice(0, 10);
  const section = `## [${nextVersion}] - ${date}\n\n### ${title}\n\n${releaseNotes.map((note) => `- ${note}`).join("\n")}\n\n`;
  await writeFile("CHANGELOG.md", originals.get("CHANGELOG.md").replace(/^# Changelog\r?\n/, `# Changelog\n\n${section}`));

  const checks = [
    { args: ["scripts/check-architecture.mjs"] },
    { args: ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "--experimental-strip-types", "--test", "tests/*.test.mjs"] },
    { args: ["node_modules/eslint/bin/eslint.js", "."] },
    { args: ["node_modules/typescript/bin/tsc", "--noEmit"] },
    { args: ["node_modules/next/dist/bin/next", "build"] },
    { args: ["node_modules/typescript/bin/tsc", "--noEmit"], cwd: "desktop" },
    { args: ["node_modules/vite/bin/vite.js", "build"], cwd: "desktop" },
    { args: ["node_modules/@playwright/test/cli.js", "test"] },
    { args: ["node_modules/@tauri-apps/cli/tauri.js", "build"], cwd: "desktop" },
  ];
  for (const check of checks) run(process.execPath, check.args, { cwd: check.cwd });

  process.stdout.write(`\nDry run\n  ${currentVersion} -> ${nextVersion}\n  tag: ${tag}\n  commits: ${releaseNotes.length}\n`);
  run("git", ["diff", "--stat"]);
  const confirm = (await prompt.question("Create release commit, tag and atomically push? [y/N]: ")).trim().toLowerCase();
  if (confirm !== "y" && confirm !== "yes") {
    await restoreFiles();
    process.stdout.write("Release cancelled; files restored.\n");
    return;
  }

  run("git", ["add", ...FILES]);
  run("git", ["commit", "-m", `release: desktop ${nextVersion}`]);
  releaseCommit = git("rev-parse", "HEAD");
  run("git", ["tag", "-a", tag, "-m", title]);
  createdTag = tag;
  run("git", ["push", "--atomic", "origin", "master", tag]);
  process.stdout.write(`Released ${tag}. GitHub Actions will build and publish artifacts.\n`);
}

try {
  await main();
} catch (error) {
  if (createdTag) {
    spawnSync("git", ["tag", "-d", createdTag], { stdio: "ignore" });
  }
  if (releaseCommit && originalHead) {
    spawnSync("git", ["update-ref", "refs/heads/master", originalHead, releaseCommit], { stdio: "ignore" });
    spawnSync("git", ["read-tree", originalHead], { stdio: "ignore" });
  }
  await restoreFiles();
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\nNo release tag was published.\n`);
  process.exitCode = 1;
} finally {
  prompt.close();
}
