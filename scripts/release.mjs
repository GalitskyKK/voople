import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import process from "node:process";
import { VERSION_FILES, addChangelogSection, assertReleaseContents, assertVersionSync, bumpVersion, parseVersion, updateVersions } from "./desktop-release-version.mjs";

const FILES = [...VERSION_FILES, "CHANGELOG.md"];
const prompt = createInterface({ input: process.stdin, output: process.stdout });
const dryRun = process.argv.includes("--dry-run");
function run(command, args, capture = true) {
  const result = spawnSync(command, args, { encoding: "utf8", stdio: capture ? "pipe" : "inherit", shell: false });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed: ${(result.stderr ?? result.error?.message ?? "").trim()}`);
  return (result.stdout ?? "").trim();
}
const git = (...args) => run("git", args);
const ask = async (question) => (await prompt.question(question)).trim();
const readFiles = async () => Object.fromEntries(await Promise.all(FILES.map(async (file) => [file, await readFile(file, "utf8")])));
const tagExists = (tag) => Boolean(git("tag", "--list", tag) || git("ls-remote", "--tags", "--refs", "origin", `refs/tags/${tag}`));

async function main() {
  if (process.argv.slice(2).some((arg) => arg !== "--dry-run")) throw new Error("Usage: npm run release:prepare -- [--dry-run]");
  if (git("status", "--porcelain", "--untracked-files=all")) throw new Error("Release preparation requires a clean working tree");
  run("git", ["fetch", "origin", "master", "--tags"], false);
  const base = git("rev-parse", "origin/master");
  if (git("rev-parse", "HEAD") !== base) throw new Error("Start from the latest origin/master commit");
  const startingBranch = git("branch", "--show-current");
  if (startingBranch && startingBranch !== "master") throw new Error("Run from master or a detached checkout of origin/master");
  const original = await readFiles();
  const current = JSON.parse(original[VERSION_FILES[0]]).version;
  assertVersionSync(original, current);
  const bump = (await ask(`Version bump [patch/minor/major] (patch, current ${current}): `)) || "patch";
  const suggested = bumpVersion(current, bump);
  const next = (await ask(`Version (${suggested}): `)) || suggested;
  const nextParts = parseVersion(next);
  const currentParts = parseVersion(current);
  if (!nextParts.some((part, index) => part > currentParts[index] && nextParts.slice(0, index).every((earlier, i) => earlier === currentParts[i]))) {
    throw new Error("Next version must be greater than the current version");
  }
  const tag = `desktop-v${next}`;
  const branch = `release/desktop-${next}`;
  if (tagExists(tag)) throw new Error(`${tag} already exists locally or on origin`);
  if (git("branch", "--list", branch)) throw new Error(`${branch} already exists locally`);
  if (git("ls-remote", "--heads", "origin", branch)) throw new Error(`${branch} already exists on origin`);
  const previousTag = git("tag", "--list", "desktop-v*", "--sort=-version:refname").split(/\r?\n/).filter(Boolean)[0];
  const range = previousTag ? `${previousTag}..HEAD` : "HEAD";
  process.stdout.write(`\nChanges since ${previousTag || "repository start"}:\n`);
  process.stdout.write(`${git("log", "--pretty=format:%h %s", "--max-count=30", range) || "(none)"}\n\n`);
  process.stdout.write("Write your own user-facing notes; commit subjects are context only.\n");
  const title = (await ask(`Release title (Voople Desktop ${next}): `)) || `Voople Desktop ${next}`;
  const notes = [];
  process.stdout.write("Enter 1–5 short notes. A blank line finishes.\n");
  while (notes.length < 5) {
    const note = await ask("- ");
    if (!note) break;
    notes.push(note.replace(/^-\s*/, ""));
  }
  const updated = updateVersions(original, current, next);
  updated["CHANGELOG.md"] = addChangelogSection(original["CHANGELOG.md"], next, new Date().toISOString().slice(0, 10), title, notes);
  assertReleaseContents(updated, next);
  process.stdout.write(`\nDesktop release preparation\n${current} -> ${next}\nBranch: ${branch}\nFuture tag: ${tag}\n`);
  process.stdout.write(`Previous desktop tag: ${previousTag || "none"}\n\n${updated["CHANGELOG.md"].split(/(?=^## \[)/m).slice(0, 2).join("")}`);
  process.stdout.write(`Files: ${FILES.join(", ")}\n`);
  if (dryRun) {
    process.stdout.write("Dry run complete. No files, branches, tags, or remotes changed.\n");
    return;
  }
  const confirm = (await ask("Create and push the release branch, then open its PR? [y/N]: ")).toLowerCase();
  if (confirm !== "y" && confirm !== "yes") {
    process.stdout.write("Release preparation cancelled.\n");
    return;
  }
  run("git", ["fetch", "origin", "master", "--tags"], false);
  if (git("rev-parse", "origin/master") !== base) throw new Error("origin/master advanced during preparation; restart from the latest commit");
  let committed = false;
  let branchCreated = false;
  try {
    for (const file of FILES) await writeFile(file, updated[file], "utf8");
    assertReleaseContents(await readFiles(), next);
    run("cargo", ["metadata", "--manifest-path", "desktop/src-tauri/Cargo.toml", "--locked", "--format-version", "1", "--no-deps"]);
    if (tagExists(tag)) throw new Error(`${tag} appeared during preparation`);
    run("git", ["diff", "--check"]);
    run("git", ["switch", "-c", branch], false);
    branchCreated = true;
    run("git", ["add", ...FILES]);
    run("git", ["diff", "--cached", "--check"]);
    run("git", ["commit", "-m", `release: desktop ${next}`], false);
    committed = true;
    run("git", ["push", "-u", "origin", branch], false);
  } catch (error) {
    if (!committed) {
      for (const file of FILES) await writeFile(file, original[file], "utf8");
      if (branchCreated) {
        run("git", ["reset", "--quiet", "HEAD"]);
        run("git", startingBranch ? ["switch", startingBranch] : ["switch", "--detach", base]);
        run("git", ["branch", "-d", branch]);
      }
    } else {
      process.stderr.write(`Release commit remains on ${branch}. The push did not complete; inspect and retry it safely.\n`);
    }
    throw error;
  }
  const body = [
    `Desktop version: ${next} (previous: ${previousTag || "none"})`,
    "", "User-facing changes:", ...notes.map((note) => `- ${note}`),
    "", "Version files updated:", ...VERSION_FILES.map((file) => "- " + file),
    "", "Desktop artifacts are not published by this PR.",
    "After merge, GitHub validates the exact merged commit and creates the desktop tag. The existing desktop release workflow then builds and publishes artifacts.",
  ].join("\n");
  const prTitle = `Release Desktop ${next}`;
  const gh = spawnSync("gh", ["pr", "create", "--base", "master", "--head", branch, "--title", prTitle, "--body", body], { encoding: "utf8", shell: false });
  process.stdout.write(`\nDesktop release prepared\nVersion: ${current} -> ${next}\nBranch: ${branch}\nFuture tag after merge: ${tag}\n`);
  if (gh.status === 0) process.stdout.write(`PR: ${gh.stdout.trim()}\n`);
  else process.stdout.write(`PR creation needs a manual step (${(gh.stderr ?? gh.error?.message ?? "gh unavailable").trim()}).\nTitle: ${prTitle}\nBody:\n${body}\n`);
  process.stdout.write("No desktop artifacts were published. After merge, GitHub validates the merged commit and creates the tag.\n");
}
try { await main(); }
catch (error) { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; }
finally { prompt.close(); }
