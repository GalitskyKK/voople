import assert from "node:assert/strict";
import test from "node:test";

import { getScreenShareCaptureOptions } from "../src/components/chat/voice/voice-room-config.ts";

test("browser screen share requests selected-surface audio without the system mix", () => {
  const options = getScreenShareCaptureOptions("standard");

  assert.equal(options.systemAudio, "exclude");
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

test("native process audio disables the browser audio track to prevent duplicates", () => {
  const options = getScreenShareCaptureOptions("plus", true);

  assert.equal(options.audio, false);
  assert.equal(options.systemAudio, "exclude");
  assert.equal(options.resolution?.width, 1920);
  assert.equal(options.resolution?.frameRate, 60);
});
