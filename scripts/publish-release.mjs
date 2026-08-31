import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import process from "node:process";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    const failure = (result.stderr ?? "").trim() || result.error?.message || "";
    throw new Error(`${command} ${args.join(" ")} failed${failure ? `\n${failure}` : ""}`);
  }
  return (result.stdout ?? "").trim();
}

function git(...args) {
  return run("git", args, { capture: true });
}

function readRequiredMatch(content, pattern, label) {
  const match = pattern.exec(content);
  if (!match) throw new Error(`Failed to read version from ${label}`);
  return match[1];
}

async function readReleaseVersion() {
  const [desktopPackageContent, tauriContent, cargoContent] = await Promise.all([
    readFile("desktop/package.json", "utf8"),
    readFile("desktop/src-tauri/tauri.conf.json", "utf8"),
    readFile("desktop/src-tauri/Cargo.toml", "utf8"),
  ]);
  const desktopPackage = JSON.parse(desktopPackageContent);
  const tauri = JSON.parse(tauriContent);
  const cargoVersion = readRequiredMatch(
    cargoContent,
    /\[package\][\s\S]*?^version\s*=\s*"([^"]+)"/m,
    "desktop/src-tauri/Cargo.toml",
  );
  if (desktopPackage.version !== tauri.version || desktopPackage.version !== cargoVersion) {
    throw new Error("Desktop release versions are out of sync");
  }
  return desktopPackage.version;
}

async function main() {
  if (git("branch", "--show-current") !== "master") {
    throw new Error("Release publication must run from master");
  }
  if (git("status", "--porcelain")) {
    throw new Error("Release publication requires a clean working tree");
  }

  run("git", ["fetch", "origin", "master", "--tags"]);
  if (git("rev-parse", "HEAD") !== git("rev-parse", "origin/master")) {
    throw new Error("master must be synchronized with origin/master");
  }

  const version = await readReleaseVersion();
  const tag = `desktop-v${version}`;
  if (git("tag", "--list", tag)) throw new Error(`${tag} already exists`);

  const headMessage = git("show", "-s", "--format=%B", "HEAD");
  if (
    !headMessage.includes(`release: desktop ${version}`)
    && !headMessage.includes(`release/desktop-v${version}`)
  ) {
    throw new Error(
      `HEAD is not the freshly merged release PR for ${version}. `
      + "Prepare a new release PR so unreviewed commits cannot enter the tag.",
    );
  }

  const changelog = await readFile("CHANGELOG.md", "utf8");
  if (!changelog.includes(`## [${version}] -`)) {
    throw new Error(`CHANGELOG.md has no ${version} release section`);
  }

  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (
      await prompt.question(`Publish ${tag} from ${git("rev-parse", "--short", "HEAD")}? [y/N]: `)
    ).trim().toLowerCase();
    if (answer !== "y" && answer !== "yes") {
      process.stdout.write("Release publication cancelled.\n");
      return;
    }
  } finally {
    prompt.close();
  }

  run("git", ["tag", "-a", tag, "-m", `Voople Desktop ${version}`]);
  try {
    run("git", ["push", "origin", tag]);
  } catch (error) {
    run("git", ["tag", "-d", tag]);
    throw error;
  }
  process.stdout.write(`Published ${tag}. GitHub Actions will build and publish artifacts.\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
