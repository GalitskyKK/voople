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
  assert.match(releaseScript, /"--features", "process-audio-publisher"/);
  assert.match(workflow, /processAudioPublisher = \$env:PROCESS_AUDIO_INCLUDED/);
  assert.match(workflow, /fallback build/);
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
