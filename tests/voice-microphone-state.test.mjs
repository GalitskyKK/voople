import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getMicrophoneMuted,
  setMicrophoneEnabledAndConfirm,
} from "../src/components/chat/voice/voice-room-config.ts";

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
  assert.match(action, /const actualMuted = await setMicrophoneEnabledAndConfirm/);
  assert.ok(action.indexOf("setMicMuted(actualMuted)") < action.indexOf("void sendHeartbeat()"));
  assert.match(heartbeat, /const micMuted = getMicrophoneMuted\(roomRef\.current\)/);
  assert.match(connection, /if \(!desiredMicMutedRef\.current\)/);
  assert.match(controls, /disabled=\{sessionPending \|\| !connected \|\| mediaActionPending\}/);
});
