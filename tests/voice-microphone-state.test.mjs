import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getAudioCaptureOptions,
  getMicrophoneMuted,
  setMicrophoneEnabledAndConfirm,
  setMicrophoneEnabledWithFallback,
} from "../src/components/chat/voice/voice-room-config.ts";
import {
  shouldResetMissingMicrophone,
} from "../src/lib/livekit/microphone-device.ts";

function fakeRoom({ publish = true, failure = null } = {}) {
  let publication = null;
  const calls = [];
  const room = {
    localParticipant: {
      getTrackPublication: () => publication,
      setMicrophoneEnabled: async (enabled) => {
        calls.push(enabled);
        if (failure) throw failure;
        if (publish) publication = { isMuted: !enabled };
      },
    },
  };
  return { room, calls };
}

test("first unmute, mute and unmute confirm the actual LiveKit publication", async () => {
  const { room, calls } = fakeRoom();
  assert.equal(getMicrophoneMuted(room), true);
  assert.equal(await setMicrophoneEnabledAndConfirm(room, true, {}), false);
  assert.equal(room.localParticipant.getTrackPublication().isMuted, false);
  assert.equal(await setMicrophoneEnabledAndConfirm(room, false, {}), true);
  assert.equal(await setMicrophoneEnabledAndConfirm(room, true, {}), false);
  assert.deepEqual(calls, [true, false, true]);
});

test("a new Room after Switch/reconnect starts muted and needs its own publication", async () => {
  const oldRoom = fakeRoom();
  await setMicrophoneEnabledAndConfirm(oldRoom.room, true, {});
  const nextRoom = fakeRoom();
  assert.equal(getMicrophoneMuted(nextRoom.room), true);
  assert.equal(await setMicrophoneEnabledAndConfirm(nextRoom.room, true, {}), false);
  assert.deepEqual(nextRoom.calls, [true]);
});

test("permission/device failure or missing publication never confirms unmute", async () => {
  for (const name of ["NotAllowedError", "NotFoundError"]) {
    const error = Object.assign(new Error(name), { name });
    const { room } = fakeRoom({ failure: error });
    await assert.rejects(setMicrophoneEnabledAndConfirm(room, true, {}), { name });
    assert.equal(getMicrophoneMuted(room), true);
  }
  const { room } = fakeRoom({ publish: false });
  await assert.rejects(setMicrophoneEnabledAndConfirm(room, true, {}), /не подтвердил изменение/);
  assert.equal(getMicrophoneMuted(room), true);
});

const microphonePreferences = {
  inputDeviceId: "saved-device",
  outputDeviceId: "default",
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  voiceIsolation: false,
  enhancedNoiseSuppression: false,
};

function deviceAwareRoom({ rejectCustom = false, rejectDefault = false, errorName = "OverconstrainedError" } = {}) {
  let publication = null;
  const calls = [];
  const room = {
    state: "connected",
    localParticipant: {
      getTrackPublication: () => publication,
      setMicrophoneEnabled: async (enabled, options) => {
        calls.push({ enabled, deviceId: options.deviceId });
        if ((rejectCustom && options.deviceId?.exact) || (rejectDefault && options.deviceId?.ideal)) {
          throw Object.assign(new Error(""), { name: errorName, constraint: "deviceId" });
        }
        publication = { isMuted: !enabled };
        return publication;
      },
    },
  };
  return { room, calls };
}

test("valid saved microphone is used without fallback", async () => {
  const { room, calls } = deviceAwareRoom();
  assert.deepEqual(getAudioCaptureOptions(microphonePreferences).deviceId, { exact: "saved-device" });
  assert.deepEqual(await setMicrophoneEnabledWithFallback(room, true, microphonePreferences), {
    muted: false, usedDefault: false,
  });
  assert.deepEqual(calls, [{ enabled: true, deviceId: { exact: "saved-device" } }]);
});

test("unavailable saved device retries default once and confirms real publication", async () => {
  const { room, calls } = deviceAwareRoom({ rejectCustom: true });
  assert.equal(getMicrophoneMuted(room), true);
  assert.deepEqual(await setMicrophoneEnabledWithFallback(room, true, microphonePreferences), {
    muted: false, usedDefault: true,
  });
  assert.equal(room.localParticipant.getTrackPublication().isMuted, false);
  assert.deepEqual(calls, [
    { enabled: true, deviceId: { exact: "saved-device" } },
    { enabled: true, deviceId: { ideal: "default" } },
  ]);
});

test("default-device retry is bounded and cannot confirm a failed microphone", async () => {
  const { room, calls } = deviceAwareRoom({ rejectCustom: true, rejectDefault: true });
  await assert.rejects(setMicrophoneEnabledWithFallback(room, true, microphonePreferences), {
    name: "OverconstrainedError",
  });
  assert.equal(calls.length, 2);
  assert.equal(getMicrophoneMuted(room), true);
});

test("permission denial never falls back and leaves microphone muted", async () => {
  const { room, calls } = deviceAwareRoom({ rejectCustom: true, errorName: "NotAllowedError" });
  await assert.rejects(setMicrophoneEnabledWithFallback(room, true, microphonePreferences), {
    name: "NotAllowedError",
  });
  assert.equal(calls.length, 1);
  assert.equal(getMicrophoneMuted(room), true);
});

test("missing saved input is reset only when browser exposes complete device identities", () => {
  assert.equal(shouldResetMissingMicrophone("saved-device", [{ deviceId: "new-device", label: "Mic" }]), true);
  assert.equal(shouldResetMissingMicrophone("saved-device", [{ deviceId: "saved-device", label: "Mic" }]), false);
  assert.equal(shouldResetMissingMicrophone("saved-device", [{ deviceId: "new-device", label: "" }]), false);
  assert.equal(shouldResetMissingMicrophone("saved-device", [
    { deviceId: "new-device", label: "Mic" }, { deviceId: "", label: "" },
  ]), false);
  assert.equal(shouldResetMissingMicrophone("saved-device", []), false);
});

test("core Room starts muted; UI and heartbeat follow LiveKit, not optimistic state", async () => {
  const [control, action, connection, heartbeat, join, controls] = await Promise.all([
    readFile(new URL("../src/components/chat/voice/useChatRoomControl.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/voice/useVoiceMediaActions.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/voice/useVoiceMediaConnection.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/voice/useVoiceHeartbeat.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/hooks/useGroupNowRoomJoin.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/voice/VoiceMediaControls.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(join, /micMuted: true/);
  assert.match(control, /useState\(Boolean\(coreSession\)\)/);
  assert.match(control, /useRef\(Boolean\(coreSession\)\)/);
  assert.doesNotMatch(action.slice(action.indexOf("const toggleMicrophone ="), action.indexOf("actionRef.current = true")), /desiredMicMutedRef\.current = !muted/);
  assert.match(action, /muted: actualMuted, usedDefault.*setMicrophoneEnabledWithFallback/s);
  assert.ok(action.indexOf('persistPreferences({ inputDeviceId: "default" })') < action.indexOf("setMicMuted(actualMuted)"));
  assert.ok(action.indexOf("setMicMuted(actualMuted)") < action.indexOf("void sendHeartbeat()"));
  assert.match(heartbeat, /const micMuted = getMicrophoneMuted\(roomRef\.current\)/);
  assert.match(connection, /if \(!desiredMicMutedRef\.current\)/);
  assert.match(controls, /disabled=\{sessionPending \|\| !connected \|\| mediaActionPending\}/);
});

test("development microphone trace covers callback, LiveKit result, processor and heartbeat without credentials", async () => {
  const [debug, controls, action, config, connection, heartbeat] = await Promise.all([
    readFile(new URL("../src/lib/livekit/voice-mic-debug.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/voice/VoiceMediaControls.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/voice/useVoiceMediaActions.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/voice/voice-room-config.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/voice/useVoiceMediaConnection.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/voice/useVoiceHeartbeat.ts", import.meta.url), "utf8"),
  ]);
  assert.match(debug, /process\.env\.NODE_ENV !== "development"/);
  assert.match(controls, /traceVoiceMic\("control\.click"/);
  assert.match(action, /traceVoiceMic\("action\.begin"/);
  assert.match(action, /traceVoiceMic\("action\.processor"/);
  assert.match(action, /traceVoiceMic\("action\.error"/);
  assert.match(config, /traceVoiceMic\("livekit\.after"/);
  assert.match(connection, /traceVoiceMic\("connection\.remute"/);
  assert.match(heartbeat, /traceVoiceMic\("heartbeat\.send"/);
  for (const source of [debug, controls, action, config, connection, heartbeat]) {
    assert.doesNotMatch(source, /traceVoiceMic\([^;]*(token|credential|mediaUrl)/i);
  }
});
