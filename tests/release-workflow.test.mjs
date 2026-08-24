import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("desktop RC records native audio capability and preserves a visible fallback", () => {
  const workflow = read(".github/workflows/desktop-release.yml");
  const cargoConfig = read(".cargo/config.toml");
  const releaseScript = read("scripts/release.mjs");

  assert.match(workflow, /--features process-audio-publisher/);
  assert.match(workflow, /cargo build --locked --release --features process-audio-publisher/);
  assert.match(cargoConfig, /\[target\.x86_64-pc-windows-msvc\]/);
  assert.match(cargoConfig, /rustflags = \["-C", "target-feature=\+crt-static"\]/);
  assert.match(releaseScript, /\["build", "--locked", "--release", "--features", "process-audio-publisher"/);
  assert.match(workflow, /processAudioPublisher = \$env:PROCESS_AUDIO_INCLUDED/);
  assert.match(workflow, /video-only fallback/);
  assert.match(workflow, /next-feature-release-backlog\.md/);
});

test("Windows COM capture compiles in the default desktop gate", () => {
  const manifest = read("desktop/src-tauri/Cargo.toml");
  const desktopLibrary = read("desktop/src-tauri/src/lib.rs");
  const capture = read("desktop/src-tauri/src/process_audio_capture.rs");
  const publisher = read("desktop/src-tauri/src/process_audio_publisher.rs");

  assert.match(manifest, /windows-core = \{ version = "=0\.61\.2" \}/);
  assert.match(desktopLibrary, /cfg\(target_os = "windows"\)[\s\S]*mod process_audio_capture/);
  assert.match(capture, /use windows_core::\{implement, Interface\}/);
  assert.match(publisher, /let mut room_options = RoomOptions::default\(\);/);
  assert.match(publisher, /room_options\.auto_subscribe = false;/);
  assert.doesNotMatch(publisher, /RoomOptions\s*\{/);
});

test("native publisher acknowledges the requested LiveKit media before UI reports sharing", () => {
  const publisher = read("desktop/src-tauri/src/process_audio_publisher.rs");
  const command = read("desktop/src-tauri/src/lib.rs");

  assert.match(publisher, /oneshot::channel/);
  assert.match(publisher, /timeout\(std::time::Duration::from_secs\(12\), ready_rx\)/);
  assert.match(publisher, /sender\.send\(Ok\(\(\)\)\)/);
  assert.match(publisher, /audio_ready && video_ready/);
  assert.match(publisher, /source\.capture_frame\(&frame\)\.await/);
  assert.match(publisher, /source\.capture_frame\(&VideoFrame::new/);
  assert.match(command, /state\.start\(input\)\.await/);
});

test("a video-only RC makes Windows application audio mandatory next release work", () => {
  const backlog = read("docs/next-feature-release-backlog.md");

  assert.match(backlog, /оставшиеся 16 записей/);
  assert.match(backlog, /ChatRoomControl/);
  assert.match(backlog, /processAudioPublisher: false/);
  assert.match(backlog, /следующий feature-релиз нельзя\s+продвигать в stable/);
  assert.match(backlog, /Автоматический или молчаливый перенос P0/);
});
