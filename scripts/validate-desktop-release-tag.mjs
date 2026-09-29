import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { VERSION_FILES, assertReleaseContents, parseVersion } from "./desktop-release-version.mjs";

export function releaseVersionFromBranch(branch) {
  const match = /^release\/desktop-(\d+\.\d+\.\d+)$/.exec(branch);
  if (!match) throw new Error(`Not a desktop release branch: ${branch}`);
  parseVersion(match[1]);
  return match[1];
}

export function validateReleaseTagInput(branch, mergedSha, headSha, files, existingTags = []) {
  const version = releaseVersionFromBranch(branch);
  if (!/^[0-9a-f]{40}$/.test(mergedSha) || mergedSha !== headSha) {
    throw new Error("Checkout is not the exact release PR merge commit");
  }
  assertReleaseContents(files, version);
  const tag = `desktop-v${version}`;
  if (existingTags.includes(tag)) throw new Error(`${tag} already exists`);
  return { version, tag };
}

function git(...args) {
  const result = spawnSync("git", args, { encoding: "utf8", shell: false });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/validate-desktop-release-tag.mjs")) {
  try {
    const [branch, mergedSha] = process.argv.slice(2);
    const files = Object.fromEntries(await Promise.all([...VERSION_FILES, "CHANGELOG.md"].map(async (file) => [file, await readFile(file, "utf8")])));
    const headSha = git("rev-parse", "HEAD");
    const tags = git("tag", "--list", "desktop-v*").split(/\r?\n/).filter(Boolean);
    const { tag } = validateReleaseTagInput(branch, mergedSha, headSha, files, tags);
    if (git("ls-remote", "--tags", "--refs", "origin", `refs/tags/${tag}`)) throw new Error(`${tag} already exists on origin`);
    process.stdout.write(`${tag}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
