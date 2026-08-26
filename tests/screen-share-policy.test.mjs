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

  assert.equal(policy(Track.Source.ScreenShare, false), false);
  assert.equal(policy(Track.Source.ScreenShare, true), true);
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
  assert.match(publisher, /startBrowserCapture\(room, quality, operation\)/);
  assert.match(publisher, /resolveDesktopProcessAudioSource/);
});

test("native desktop screen share excludes Voople from the whole-system mix", () => {
  const capture = read("desktop/screen-share-worker/src/process_audio_capture.rs");
  const publisher = read("desktop/screen-share-worker/src/publisher.rs");

  assert.match(capture, /PROCESS_LOOPBACK_MODE_EXCLUDE_TARGET_PROCESS_TREE/);
  assert.match(capture, /ProcessLoopbackTarget::ExcludeProcessTree/);
  assert.match(publisher, /DesktopCaptureKind::Screen/);
  assert.match(publisher, /ExcludeProcessTree\([\s\S]*host_process_id/);
  assert.match(publisher, /TrackSource::ScreenshareAudio/);
  assert.match(publisher, /TrackSource::Screenshare/);
});

test("native screen share worker stops gracefully and preserves source aspect ratio", () => {
  const publisher = read("desktop/screen-share-worker/src/publisher.rs");
  const supervisor = read("desktop/src-tauri/src/screen_share_supervisor.rs");
  const frontend = read("src/components/chat/voice/useDesktopScreenAudioPublisher.ts");

  assert.match(publisher, /tokio::sync::oneshot::Sender/);
  assert.match(publisher, /room\.close\(\)\s*\.await/);
  assert.match(publisher, /fitted_capture_resolution/);
  assert.match(publisher, /first_video_frame/);
  assert.match(publisher, /NativeVideoSource::new\([\s\S]*VideoResolution/);
  assert.match(publisher, /max_bitrate: 8_000_000/);
  assert.match(publisher, /max_framerate: 60\.0/);
  assert.doesNotMatch(supervisor, /handle\.abort\(\)/);
  assert.match(supervisor, /STOP_TIMEOUT: Duration = Duration::from_secs\(5\)/);
  assert.match(frontend, /if \(kind === "native"\)[\s\S]*void stopping\.catch/);
  assert.match(frontend, /promise\.then\(clearStopPromise, clearStopPromise\)/);
  assert.ok(
    publisher.lastIndexOf("room.close().await") < publisher.lastIndexOf("capture.join()?"),
    "LiveKit must close before native capture joins can consume the graceful deadline",
  );
});

test("local preview is opt-in, race-safe and pauses outside the focused window", () => {
  const subscription = read("src/components/chat/voice/useScreenShareSubscription.ts");
  const videoStage = read("src/components/chat/voice/useVoiceVideoStage.ts");
  const previewDom = read("src/components/chat/voice/screen-preview-dom.ts");
  const actions = read("src/components/chat/voice/useVoiceMediaActions.ts");
  const roomStage = read("src/components/chat/voice/VoiceRoomStage.tsx");

  assert.match(subscription, /expectedLocalSessionRef/);
  assert.match(subscription, /voople\.screenSessionId/);
  assert.match(subscription, /screenSessionId !== expectedLocalSessionRef\.current/);
  assert.match(subscription, /publication\.trackSid !== activeScreenPublicationRef\.current/);
  assert.match(videoStage, /publication\.trackSid !== activeScreenTrackRef\.current/);
  assert.match(subscription, /setExpectedLocalSessionId/);
  assert.match(subscription, /clearLocalShare/);
  assert.match(actions, /screenShareActionRef\.current/);
  const publisher = read("src/components/chat/voice/useDesktopScreenAudioPublisher.ts");
  assert.match(publisher, /onNativeSessionChange\(screenSessionId\)/);
  assert.match(publisher, /onNativeSessionChange\(null\)/);
  assert.match(previewDom, /video\?\.pause\(\)/);
  assert.match(previewDom, /dataset\.livekitLocalScreenKind = kind/);
  assert.match(videoStage, /useLocalScreenPreviewVisibility/);
  assert.match(roomStage, /screenShareOwner && screenShareIsLocal \? "grid" : "focus"/);
  assert.match(roomStage, /selection\?\.screenTrackId === screenShareTrackId/);
});

test("room screen stage owns remaining height and contains remote video", () => {
  const content = read("src/components/chat/voice/VoiceRoomContent.tsx");
  const stage = read("src/components/chat/voice/VoiceMediaStage.tsx");

  assert.match(content, /flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden/);
  assert.match(stage, /place-items-center overflow-hidden/);
  assert.match(stage, /\[&>video\]:object-contain/);
});

test("desktop sheets stay below the titlebar and fullscreen targets app content", () => {
  const desktopApp = read("desktop/src/App.tsx");
  const desktopStyles = read("desktop/src/styles.css");
  const sheet = read("src/components/ui/Sheet.tsx");
  const roomSheet = read("src/components/chat/voice/VoiceRoomSheet.tsx");
  const fullscreen = read("src/components/chat/voice/useVoiceRoomFullscreen.ts");

  assert.match(desktopApp, /id="voople-desktop-overlay-root"/);
  assert.match(desktopStyles, /\.desktop-overlay-root\s*\{[\s\S]*position: absolute;[\s\S]*inset: 0;/);
  assert.match(sheet, /desktopOverlayRoot[\s\S]*"absolute inset-0/);
  assert.match(fullscreen, /querySelector<HTMLElement>\("\.desktop-window-content"\)/);
  assert.match(roomSheet, /fullscreen && "h-full max-h-none/);
  assert.doesNotMatch(roomSheet, /fullscreen && "h-dvh/);
  assert.doesNotMatch(sheet, /z-\[300\]|z-\[301\]/);
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
