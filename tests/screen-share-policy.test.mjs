import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getBrowserDisplayMediaOptions,
  getScreenShareCaptureOptions,
} from "../src/components/chat/voice/voice-room-config.ts";

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
  assert.equal(options.windowAudio, "window");
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

test("desktop infers one active process and distinguishes native from browser audio", () => {
  const publisher = read("src/components/chat/voice/useDesktopScreenAudioPublisher.ts");

  assert.match(publisher, /activeSources\.length === 1/);
  assert.match(publisher, /processId \?\? automaticProcessIdRef\.current/);
  assert.match(publisher, /start\(resolvedProcessId\)/);
  assert.match(publisher, /выберите источник в настройках комнаты/);
});
