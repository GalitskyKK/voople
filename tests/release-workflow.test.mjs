import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("desktop RC records native audio capability and preserves a visible fallback", () => {
  const workflow = read(".github/workflows/desktop-release.yml");
  const cargoConfig = read(".cargo/config.toml");
  const releaseScript = read("scripts/release.mjs");

  assert.match(workflow, /--features process-audio-publisher/);
  assert.match(workflow, /desktop\/screen-share-worker\/Cargo\.toml/);
  assert.match(workflow, /voople-screen-share-worker-\$Target\.exe/);
  assert.match(cargoConfig, /\[target\.x86_64-pc-windows-msvc\]/);
  assert.match(cargoConfig, /rustflags = \["-C", "target-feature=\+crt-static"\]/);
  assert.match(releaseScript, /"--features",\s*"process-audio-publisher"/);
  assert.match(workflow, /processAudioPublisher = \$env:PROCESS_AUDIO_INCLUDED/);
  assert.match(workflow, /fallback build/);
});

test("local release E2E exercises the production build deterministically", () => {
  const releaseScript = read("scripts/release.mjs");
  const playwrightConfig = read("playwright.config.ts");

  assert.match(releaseScript, /VOOPLE_RELEASE_E2E:\s*"1"/);
  assert.match(
    releaseScript,
    /process\.platform === "win32"[\s\S]*?\["--webpack"\]/,
  );
  assert.match(playwrightConfig, /isReleaseE2E/);
  assert.match(playwrightConfig, /isReleaseE2E[\s\S]*localProductionCommand/);
  assert.match(playwrightConfig, /isReleaseE2E \? 1 : 2/);
});

test("release unit tests do not depend on shell glob expansion", () => {
  const releaseScript = read("scripts/release.mjs");

  assert.match(releaseScript, /await readdir\(\s*"tests"/);
  assert.match(releaseScript, /entry\.name\.endsWith\("\.test\.mjs"\)/);
  assert.match(releaseScript, /\.\.\.unitTestFiles/);
  assert.doesNotMatch(releaseScript, /"tests\/\*\.test\.mjs"/);
});

test("protected master uses a release PR before publishing the tag", () => {
  const prepare = read("scripts/release.mjs");
  const publish = read("scripts/publish-release.mjs");
  const packageJson = JSON.parse(read("package.json"));
  const workflow = read(".github/workflows/desktop-release.yml");

  assert.match(prepare, /`release\/\$\{tag\}`/);
  assert.match(prepare, /"ls-remote", "--heads", "origin", releaseBranch/);
  assert.match(prepare, /"switch", "-c", releaseBranch/);
  assert.match(prepare, /"push", "-u", "origin", releaseBranch/);
  assert.doesNotMatch(prepare, /"push",\s*"--atomic",\s*"origin",\s*"master"/);
  assert.doesNotMatch(prepare, /"tag",\s*"-a",\s*tag/);

  assert.equal(packageJson.scripts["release:publish"], "node scripts/publish-release.mjs");
  assert.match(publish, /Release publication must run from master/);
  assert.match(publish, /HEAD is not the freshly merged release PR/);
  assert.match(publish, /"tag", "-a", tag/);
  assert.match(publish, /"push", "origin", tag/);
  assert.match(workflow, /tags:\s*\n\s+- "desktop-v\*"/);
});

test("release migration readiness has process and database deadlines", () => {
  const releaseScript = read("scripts/release.mjs");
  const readiness = read("scripts/check-migration-readiness.mjs");

  assert.match(releaseScript, /timeout:\s*options\.timeout/);
  assert.match(
    releaseScript,
    /"scripts\/check-migration-readiness\.mjs",[\s\S]*?timeout:\s*90_000/,
  );
  assert.match(readiness, /statement_timeout:\s*30_000/);
  assert.match(readiness, /lock_timeout:\s*5_000/);
});

test("verified migration readiness can only be reused without migration changes", () => {
  const releaseScript = read("scripts/release.mjs");

  assert.match(releaseScript, /VOOPLE_RELEASE_MIGRATIONS_VERIFIED/);
  assert.match(releaseScript, /changedMigrationInputs/);
  assert.match(releaseScript, /"drizzle"/);
  assert.match(releaseScript, /"scripts\/migration-manifest\.mjs"/);
  assert.match(releaseScript, /"scripts\/migration-checksum\.mjs"/);
  assert.match(releaseScript, /Cannot reuse migration readiness when migration inputs changed/);
});

test("Windows COM capture compiles in the isolated worker gate", () => {
  const manifest = read("desktop/screen-share-worker/Cargo.toml");
  const worker = read("desktop/screen-share-worker/src/main.rs");
  const capture = read("desktop/screen-share-worker/src/process_audio_capture.rs");
  const publisher = read("desktop/screen-share-worker/src/publisher.rs");

  assert.match(manifest, /windows-core = \{ version = "=0\.61\.2" \}/);
  assert.match(worker, /mod process_audio_capture/);
  assert.match(capture, /use windows_core::\{implement, Interface\}/);
  assert.match(publisher, /let mut room_options = RoomOptions::default\(\);/);
  assert.match(publisher, /room_options\.auto_subscribe = false;/);
  assert.doesNotMatch(publisher, /RoomOptions\s*\{/);
});

test("native publisher acknowledges the requested LiveKit media before UI reports sharing", () => {
  const worker = read("desktop/screen-share-worker/src/main.rs");
  const publisher = read("desktop/screen-share-worker/src/publisher.rs");
  const command = read("desktop/src-tauri/src/lib.rs");

  assert.match(worker, /oneshot::channel/);
  assert.match(worker, /WorkerEvent::Ready/);
  assert.match(publisher, /sender\.send\(Ok\(\(\)\)\)/);
  assert.match(publisher, /audio_ready && video_ready/);
  assert.match(publisher, /source\s*\.capture_frame\(&frame\)\s*\.await/);
  assert.match(publisher, /source\.capture_frame\(&VideoFrame::new/);
  assert.match(command, /state\.start\(&app, input\)\.await/);
});

test("a video-only RC makes Windows application audio mandatory next release work", () => {
  const backlog = read("docs/next-feature-release-backlog.md");

  assert.match(backlog, /desktopPortableUi.*обнулён/s);
  assert.match(backlog, /ChatRoomControl/);
  assert.match(backlog, /processAudioPublisher: false/);
  assert.match(backlog, /следующий feature-релиз нельзя\s+продвигать в stable/);
  assert.match(backlog, /Автоматический или молчаливый перенос P0/);
});

test("public repository workflows pin actions and scope privileged credentials", () => {
  const releaseWorkflow = read(".github/workflows/desktop-release.yml");
  const smokeWorkflow = read(".github/workflows/e2e-smoke.yml");
  const secretScanWorkflow = read(".github/workflows/secret-scan.yml");
  const qualityWorkflow = read(".github/workflows/quality-gate.yml");
  const workflows = `${releaseWorkflow}\n${smokeWorkflow}\n${secretScanWorkflow}\n${qualityWorkflow}`;

  assert.doesNotMatch(
    workflows,
    /uses:\s+[^\s#]+@(v\d+|stable|main|master)(?:\s|$)/,
  );
  assert.match(secretScanWorkflow, /fetch-depth:\s*0/);
  assert.match(secretScanWorkflow, /gitleaks\/gitleaks-action@[0-9a-f]{40}/);
  assert.match(qualityWorkflow, /pull_request:\s*\n\s+branches:\s*\n\s+- master/);
  assert.match(qualityWorkflow, /name: Verify repository/);
  assert.doesNotMatch(qualityWorkflow, /secrets\./);

  const windowsJobPreamble = releaseWorkflow.slice(
    releaseWorkflow.indexOf("  windows:"),
    releaseWorkflow.indexOf("    steps:"),
  );
  for (const privilegedName of [
    "TAURI_SIGNING_PRIVATE_KEY",
    "WINDOWS_CERTIFICATE_BASE64",
    "DIRECT_URL",
    "E2E_SUPABASE_SERVICE_ROLE_KEY",
    "DESKTOP_RELEASE_S3_SECRET_ACCESS_KEY",
  ]) {
    assert.doesNotMatch(windowsJobPreamble, new RegExp(privilegedName));
  }

  assert.match(releaseWorkflow, /permissions:\s*\n\s+contents: read/);
  assert.match(releaseWorkflow, /permissions:\s*\n\s+contents: write/);
  assert.match(releaseWorkflow, /TAURI_SIGNING_PRIVATE_KEY:[^\n]*secrets\./);
  assert.match(releaseWorkflow, /DIRECT_URL:[^\n]*secrets\./);

  const smokeJobPreamble = smokeWorkflow.slice(
    smokeWorkflow.indexOf("  production-smoke:"),
    smokeWorkflow.indexOf("    steps:"),
  );
  assert.doesNotMatch(smokeJobPreamble, /secrets\./);
});
