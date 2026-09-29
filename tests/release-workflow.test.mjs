import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (path) => readFileSync(path, "utf8");
test("release preparation replaces direct master and tag publication", () => {
  const script = read("scripts/release.mjs");
  const packageJson = JSON.parse(read("package.json"));
  assert.equal(packageJson.scripts["release:prepare"], "node scripts/release.mjs");
  assert.match(script, /release\/desktop-/);
  assert.match(script, /"pr", "create"/);
  assert.doesNotMatch(script, /git\s*\(\s*"tag",\s*"-a"/);
  assert.doesNotMatch(script, /\["push",\s*"--atomic"/);
  assert.doesNotMatch(script, /\["push",\s*"origin",\s*"master"/);
  assert.doesNotMatch(script, /VOOPLE_RELEASE_E2E|VERIFY_NATIVE_AUDIO|check-migration-readiness/);
});

test("merged release tag workflow guards the existing tag pipeline", () => {
  const workflow = read(".github/workflows/desktop-release-tag.yml");
  const release = read(".github/workflows/desktop-release.yml");
  assert.match(workflow, /types: \[closed\]/);
  assert.match(workflow, /pull_request\.merged == true/);
  assert.match(workflow, /startsWith\(github\.event\.pull_request\.head\.ref, 'release\/desktop-'\)/);
  assert.match(workflow, /ref: \$\{\{ github\.event\.pull_request\.merge_commit_sha \}\}/);
  assert.match(workflow, /validate-desktop-release-tag\.mjs/);
  assert.match(workflow, /git tag -a "\$TAG" HEAD/);
  assert.match(workflow, /git push origin "refs\/tags\/\$TAG"/);
  assert.match(workflow, /DESKTOP_RELEASE_TAG_TOKEN/);
  assert.match(release, /desktop-v\*/);
  assert.match(release, /vars\.DESKTOP_REQUIRE_WINDOWS_SIGNING == 'true'/);
  assert.match(release, /DESKTOP_UPDATER_PRIVATE_KEY/);
});

test("pending migration audit uses the checksum ledger without exposing secrets", () => {
  const audit = read("scripts/check-pending-migrations.mjs");
  const packageJson = read("package.json");
  assert.match(audit, /app_schema_migrations\?select=id,checksum/);
  assert.match(audit, /acceptedMigrationChecksums/);
  assert.match(audit, /AbortSignal\.timeout\(15_000\)/);
  assert.doesNotMatch(audit, /console\.log\([^\n]*(serviceRoleKey|SUPABASE_SERVICE_ROLE_KEY)/);
  assert.match(packageJson, /"db:pending": "node scripts\/check-pending-migrations\.mjs"/);
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
  const tagWorkflow = read(".github/workflows/desktop-release-tag.yml");
  const workflows = `${releaseWorkflow}\n${smokeWorkflow}\n${secretScanWorkflow}\n${qualityWorkflow}\n${tagWorkflow}`;
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
test("desktop RC is installed before Room protocol evidence can be promoted", () => {
  const workflow = read(".github/workflows/desktop-release.yml");
  const installedSmoke = read("scripts/verify-installed-desktop-deep-links.ps1");
  assert.match(workflow, /Verify installed Room deep links/);
  assert.match(workflow, /verify-installed-desktop-deep-links\.ps1/);
  assert.match(workflow, /installedDeepLinkSmoke = \$true/);
  assert.match(workflow, /installedDeepLinkSmoke -ne \$true/);
  assert.match(installedSmoke, /Start-Process -FilePath \$installer -ArgumentList "\/S"/);
  assert.match(installedSmoke, /HKEY_CURRENT_USER\\Software\\Classes\\voople/);
  assert.match(installedSmoke, /Open-VoopleProtocol \$coldUri/);
  assert.match(installedSmoke, /Open-VoopleProtocol \$warmUri/);
  assert.match(installedSmoke, /Open-VoopleProtocol \$invalidUri/);
  assert.match(installedSmoke, /VoopleWindowState.*IsIconic/s);
  assert.match(installedSmoke, /Get-AuthenticodeSignature/);
});
