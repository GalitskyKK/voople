import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";
import { SOUNDS, SAMPLE_RATE, renderSound } from "../scripts/generate-voople-sounds.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("catalog is complete and every original asset is well formed", async () => {
  const catalog = await read("src/lib/sound/sound-catalog.ts");
  const ids = [...catalog.matchAll(/^  "(room|notification)\.([\w]+)": \{ src: "\/sounds\/ui\/([\w-]+)\.wav",.*gain: ([\d.]+),.*maxDurationMs: (\d+)/gm)];
  assert.equal(ids.length, 9);
  assert.equal(Object.keys(SOUNDS).length, ids.length);
  for (const [, category, action, filename, gainText, maximumText] of ids) {
    assert.equal(filename, `${category}-${action}`);
    assert.ok(Number(gainText) > 0 && Number(gainText) < 0.5);
    const path = new URL(`public/sounds/ui/${filename}.wav`, root);
    const bytes = await readFile(path);
    assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
    assert.equal(bytes.toString("ascii", 8, 16), "WAVEfmt ");
    assert.equal(bytes.readUInt16LE(20), 1);
    assert.equal(bytes.readUInt16LE(22), 1);
    assert.equal(bytes.readUInt32LE(24), SAMPLE_RATE);
    assert.equal(bytes.readUInt16LE(34), 16);
    assert.equal(bytes.readUInt32LE(40), bytes.length - 44);
    const durationMs = (bytes.length - 44) / 2 / SAMPLE_RATE * 1000;
    assert.ok(durationMs <= Number(maximumText));
    assert.ok(bytes.length < 25_000);
    let peak = 0;
    let squareSum = 0;
    for (let offset = 44; offset < bytes.length; offset += 2) {
      const sample = bytes.readInt16LE(offset) / 32768;
      peak = Math.max(peak, Math.abs(sample));
      squareSum += sample * sample;
    }
    const rms = Math.sqrt(squareSum / ((bytes.length - 44) / 2));
    assert.ok(peak > 0.05 && peak < 0.9, `${filename}: peak ${peak}`);
    assert.ok(rms > 0.005 && rms < 0.3, `${filename}: RMS ${rms}`);
    assert.equal(bytes.readInt16LE(44), 0);
    assert.equal(bytes.readInt16LE(bytes.length - 2), 0);
    const seed = [...filename].reduce((value, letter) => Math.imul(value ^ letter.charCodeAt(0), 16777619) >>> 0, 2166136261);
    assert.deepEqual(bytes.subarray(44), renderSound(SOUNDS[filename], seed));
  }
  for (const pair of ["join,leave", "mute,unmute", "deafen,undeafen"]) {
    for (const action of pair.split(",")) assert.ok(ids.some(([, category, value]) => category === "room" && value === action));
  }
});

test("engine caches fetch/decode, coalesces bursts, and swallows playback failures", async () => {
  let code = ts.transpileModule(await read("src/lib/sound/sound-engine.ts"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  code = code.replace(/import \{ SOUND_CATALOG \} from "\.\/sound-catalog";/, "const SOUND_CATALOG = globalThis.__testCatalog;");
  globalThis.__testCatalog = { "room.join": { src: "/test.wav", gain: 0.3, group: "presence", cooldownMs: 350 } };
  let fetches = 0;
  let decodes = 0;
  let starts = 0;
  globalThis.window = {};
  globalThis.fetch = async () => { fetches += 1; return { ok: true, arrayBuffer: async () => new ArrayBuffer(2) }; };
  globalThis.AudioContext = class {
    state = "running";
    destination = {};
    decodeAudioData = async () => { decodes += 1; return {}; };
    createBufferSource() { return { connect() {}, disconnect() {}, start() { starts += 1; }, stop() {} }; }
    createGain() { return { gain: { value: 0 }, connect() {}, disconnect() {} }; }
  };
  const { SoundEngine } = await import(`data:text/javascript,${encodeURIComponent(code)}`);
  const engine = new SoundEngine();
  await Promise.all([engine.preload(), engine.preload()]);
  await Promise.all([engine.play("room.join"), engine.play("room.join"), engine.play("room.join")]);
  assert.equal(fetches, 1);
  assert.equal(decodes, 1);
  assert.equal(starts, 1);
  globalThis.AudioContext = class { state = "suspended"; decodeAudioData = async () => ({}); resume = async () => { throw new Error("autoplay"); }; };
  await assert.doesNotReject(new SoundEngine().play("room.join"));
  delete globalThis.__testCatalog;
  delete globalThis.window;
  delete globalThis.AudioContext;
});

test("preferences, soundboard queue, and desktop sound ownership remain explicit", async () => {
  const room = await read("src/components/chat/voice/voice-room-sounds.ts");
  assert.match(room, /if \(!enabled\) return/);
  assert.doesNotMatch(room, /createOscillator|new Audio\(/);
  const soundboard = await read("src/components/chat/voice/useGroupSoundboard.ts");
  assert.match(soundboard, /playbackQueueRef\.current/);
  assert.match(soundboard, /lastLocalPlayRef\.current < 1_000/);
  assert.match(soundboard, /now - previous < 1_000/);
  const bridge = await read("desktop/src/notifications/DesktopNotificationBridge.tsx");
  assert.match(bridge, /notificationAudioPolicy/);
  assert.match(bridge, /enabled: preferences\.notificationSound/);
  const policy = await read("desktop/src/notifications/audio-policy.ts");
  assert.match(policy, /nativeSound: false, customSound: input\.sound/);
  assert.match(policy, /nativeSound: true, customSound: null/);
});

test("disabled preferences suppress custom sounds and desktop never double plays", async () => {
  let calls = 0;
  globalThis.__testPlay = async () => { calls += 1; };
  let roomCode = ts.transpileModule(await read("src/components/chat/voice/voice-room-sounds.ts"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  roomCode = roomCode.replace(/import \{ playProductSound \} from "@\/lib\/sound\/sound-playback";/, "const playProductSound = globalThis.__testPlay;");
  const { playVoiceRoomSound } = await import(`data:text/javascript,${encodeURIComponent(roomCode)}`);
  await playVoiceRoomSound("mute", false);
  assert.equal(calls, 0);
  await playVoiceRoomSound("unmute", true);
  assert.equal(calls, 1);
  const policyCode = ts.transpileModule(await read("desktop/src/notifications/audio-policy.ts"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const { notificationAudioPolicy } = await import(`data:text/javascript,${encodeURIComponent(policyCode)}`);
  for (const enabled of [false, true]) {
    for (const focused of [false, true]) {
      const result = notificationAudioPolicy({ enabled, focused, visible: true, sound: "notification.message" });
      assert.equal(Boolean(result.nativeSound && result.customSound), false);
      if (!enabled) assert.deepEqual(result, { nativeSound: false, customSound: null });
    }
  }
  assert.equal(notificationAudioPolicy({ enabled: true, focused: true, visible: true, sound: "notification.message" }).customSound, "notification.message");
  assert.equal(notificationAudioPolicy({ enabled: true, focused: false, visible: true, sound: "notification.message" }).nativeSound, true);
  delete globalThis.__testPlay;
});
