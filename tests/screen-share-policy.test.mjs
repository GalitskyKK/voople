import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Track } from "livekit-client";

import {
  getBrowserDisplayMediaOptions,
  getScreenShareCaptureOptions,
} from "../src/components/chat/voice/voice-room-config.ts";
import { shouldSubscribeToScreenPublication } from "../src/components/chat/voice/useScreenShareSubscription.ts";
import { resolveDesktopProcessAudioSource } from "../src/lib/livekit/desktop-process-audio.ts";

const read = (path) => readFileSync(path, "utf8");

test("browser screen share asks the picker for audio from the selected surface", () => {
  const options = getScreenShareCaptureOptions("standard");

  assert.equal(options.systemAudio, "include");
  assert.equal(options.selfBrowserSurface, "exclude");
  assert.equal(options.video.displaySurface, "window");
  assert.deepEqual(options.audio, {
    autoGainControl: false,
    channelCount: { ideal: 2 },
    echoCancellation: false,
    noiseSuppression: false,
    restrictOwnAudio: true,
    sampleRate: { ideal: 48_000 },
  });
});

test("web picker offers application-window and full-screen audio when Chromium supports it", () => {
  const options = getBrowserDisplayMediaOptions("standard");

  assert.equal(options.video.displaySurface, "window");
  assert.equal(options.windowAudio, "system");
  assert.equal(options.systemAudio, "include");
  assert.equal(options.monitorTypeSurfaces, "include");
  assert.equal(options.selfBrowserSurface, "exclude");
});

test("native process audio disables the browser audio track to prevent duplicates", () => {
  const options = getScreenShareCaptureOptions("plus", true);

  assert.equal(options.audio, false);
  assert.equal(options.systemAudio, "include");
  assert.equal(options.resolution?.width, 1920);
  assert.equal(options.resolution?.frameRate, 60);
});

test("the native publisher never loops screen audio back to its owner", () => {
  const policy = (source, watching) => shouldSubscribeToScreenPublication({
    source,
    ownerId: "owner-1",
    viewerId: "owner-1",
    watching,
  });

  assert.equal(policy(Track.Source.ScreenShare, false), true);
  assert.equal(policy(Track.Source.ScreenShareAudio, false), false);
  assert.equal(policy(Track.Source.ScreenShareAudio, true), false);
  assert.equal(shouldSubscribeToScreenPublication({
    source: Track.Source.ScreenShareAudio,
    ownerId: "owner-1",
    viewerId: "viewer-2",
    watching: true,
  }), true);
});

test("desktop uses the native picker before falling back to browser capture", () => {
  const publisher = read("src/components/chat/voice/useDesktopScreenAudioPublisher.ts");

  assert.match(publisher, /bridge\.listCaptureSources\(\)/);
  assert.match(publisher, /requestCaptureSource\(nativeSources\)/);
  assert.match(publisher, /captureSource: selected/);
  assert.match(publisher, /selected\.kind === "screen"/);
  assert.match(publisher, /startBrowserCapture\(room, quality\)/);
  assert.match(publisher, /resolveDesktopProcessAudioSource/);
});

test("native desktop screen share excludes Voople from the whole-system mix", () => {
  const capture = read("desktop/src-tauri/src/process_audio_capture.rs");
  const publisher = read("desktop/src-tauri/src/process_audio_publisher.rs");

  assert.match(capture, /PROCESS_LOOPBACK_MODE_EXCLUDE_TARGET_PROCESS_TREE/);
  assert.match(capture, /ProcessLoopbackTarget::ExcludeProcessTree/);
  assert.match(publisher, /DesktopCaptureKind::Screen/);
  assert.match(publisher, /ExcludeProcessTree\([\s\S]*std::process::id\(\)/);
  assert.match(publisher, /TrackSource::ScreenshareAudio/);
  assert.match(publisher, /TrackSource::Screenshare/);
});

test("native screen share stops resources gracefully and preserves source aspect ratio", () => {
  const publisher = read("desktop/src-tauri/src/process_audio_publisher.rs");

  assert.match(publisher, /tokio::sync::oneshot::Sender/);
  assert.match(publisher, /stop\.send\(\(\)\)/);
  assert.match(publisher, /room\.close\(\)\.await/);
  assert.doesNotMatch(publisher, /handle\.abort\(\)/);
  assert.match(publisher, /fitted_capture_resolution/);
  assert.match(publisher, /first_video_frame/);
  assert.match(publisher, /NativeVideoSource::new\([\s\S]*VideoResolution \{ width, height \}/);
});

test("desktop audio source resolution is automatic but never guesses between active apps", () => {
  const sources = [
    { processId: 10, name: "Music", executablePath: "C:\\Music.exe", active: true },
    { processId: 20, name: "Game", executablePath: "C:\\Game.exe", active: false },
  ];
  assert.equal(resolveDesktopProcessAudioSource(sources, null), 10);
  assert.equal(resolveDesktopProcessAudioSource(sources, 20), 20);
  assert.equal(resolveDesktopProcessAudioSource(sources, null, "Window: Game"), 20);
  assert.equal(resolveDesktopProcessAudioSource(sources.map((source) => ({ ...source, active: true })), null), null);
});

test("Windows audio source discovery keeps normal sessions and enumerates every output", () => {
  const discovery = read("desktop/src-tauri/src/process_audio.rs");

  assert.match(discovery, /EnumAudioEndpoints\(eRender, DEVICE_STATE_ACTIVE\)/);
  assert.match(discovery, /IsSystemSoundsSession\(\) == windows_core::HRESULT\(0\)/);
  assert.doesNotMatch(discovery, /IsSystemSoundsSession\(\)\.is_ok\(\)/);
  assert.match(discovery, /voople_process_tree\(\)/);
  assert.match(discovery, /excluded_processes\.contains\(&value\)/);
});
