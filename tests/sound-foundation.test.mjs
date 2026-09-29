import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";
import { SOUNDS, PACK_STYLES, SAMPLE_RATE, renderSound } from "../scripts/generate-voople-sounds.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const transpile = (source) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const loadCatalog = async () => import(`data:text/javascript,${encodeURIComponent(transpile(await read("src/lib/sound/sound-catalog.ts")))}`);

test("all 14 sound IDs exist in all three packs as valid deterministic WAVs", async () => {
  const { PRODUCT_SOUND_IDS, SOUND_PACK_IDS, SOUND_POLICY, productSoundAsset } = await loadCatalog();
  assert.equal(PRODUCT_SOUND_IDS.length, 14);
  assert.deepEqual(SOUND_PACK_IDS, ["default", "halo", "velvet"]);
  assert.deepEqual(Object.keys(SOUND_POLICY).sort(), [...PRODUCT_SOUND_IDS].sort());
  assert.deepEqual(Object.keys(SOUNDS).sort(), PRODUCT_SOUND_IDS.map((id) => id.replace(".", "-")).sort());
  for (const pack of SOUND_PACK_IDS) for (const id of PRODUCT_SOUND_IDS) {
    const filename = id.replace(".", "-");
    const path = productSoundAsset(pack, id);
    assert.equal(path, `/sounds/packs/${pack}/${filename}.wav`);
    const bytes = await readFile(new URL(`public${path}`, root));
    const policy = SOUND_POLICY[id];
    assert.ok(policy.gain > 0 && policy.gain < 0.5);
    assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
    assert.equal(bytes.toString("ascii", 8, 16), "WAVEfmt ");
    assert.equal(bytes.readUInt16LE(20), 1);
    assert.equal(bytes.readUInt16LE(22), 1);
    assert.equal(bytes.readUInt32LE(24), SAMPLE_RATE);
    assert.equal(bytes.readUInt16LE(34), 16);
    assert.equal(bytes.readUInt32LE(40), bytes.length - 44);
    const durationMs = (bytes.length - 44) / 2 / SAMPLE_RATE * 1000;
    assert.ok(durationMs <= policy.maxDurationMs, `${pack}/${filename}: duration ${durationMs}`);
    assert.ok(bytes.length < 140_000);
    let peak = 0;
    let squareSum = 0;
    for (let offset = 44; offset < bytes.length; offset += 2) {
      const sample = bytes.readInt16LE(offset) / 32768;
      peak = Math.max(peak, Math.abs(sample));
      squareSum += sample * sample;
    }
    const rms = Math.sqrt(squareSum / ((bytes.length - 44) / 2));
    assert.ok(peak > 0.05 && peak < 0.9, `${pack}/${filename}: peak ${peak}`);
    assert.ok(rms > 0.005 && rms < 0.3, `${pack}/${filename}: RMS ${rms}`);
    assert.equal(bytes.readInt16LE(44), 0);
    assert.equal(bytes.readInt16LE(bytes.length - 2), 0);
    const seedName = pack === "default" ? filename : `${pack}:${filename}`;
    const seed = [...seedName].reduce((value, letter) => Math.imul(value ^ letter.charCodeAt(0), 16777619) >>> 0, 2166136261);
    assert.deepEqual(bytes.subarray(44), renderSound(SOUNDS[filename], seed, pack));
  }
  for (const pair of ["join,leave", "mute,unmute", "deafen,undeafen"]) {
    for (const action of pair.split(",")) assert.ok(PRODUCT_SOUND_IDS.includes(`room.${action}`));
  }
  assert.notDeepEqual(PACK_STYLES.halo, PACK_STYLES.velvet);
});

test("engine caches by asset, replaces opposite cues, prioritizes mentions, and manages loops", async () => {
  const catalog = await loadCatalog();
  let code = transpile(await read("src/lib/sound/sound-engine.ts"));
  code = code.replace(/import \{[^}]+\} from "\.\/sound-catalog";/,
    "const { PRODUCT_SOUND_IDS, SOUND_POLICY, productSoundAsset } = globalThis.__testCatalog;");
  globalThis.__testCatalog = catalog;
  const originals = { window: globalThis.window, fetch: globalThis.fetch,
    AudioContext: globalThis.AudioContext, performance: Object.getOwnPropertyDescriptor(globalThis, "performance") };
  let now = 1000;
  let fetches = 0;
  let decodes = 0;
  let stops = 0;
  const played = [];
  globalThis.window = {};
  Object.defineProperty(globalThis, "performance", { configurable: true, value: { now: () => now } });
  globalThis.fetch = async (src) => { fetches += 1; return { ok: true, arrayBuffer: async () => ({ src }) }; };
  globalThis.AudioContext = class {
    state = "running";
    destination = {};
    decodeAudioData = async (data) => { decodes += 1; return data; };
    createBufferSource() { return { connect() {}, disconnect() {}, start() { played.push(this.buffer.src); }, stop() { stops += 1; } }; }
    createGain() { return { gain: { value: 0 }, connect() {}, disconnect() {} }; }
  };
  try {
    const { SoundEngine } = await import(`data:text/javascript,${encodeURIComponent(code)}`);
    const engine = new SoundEngine();
    await Promise.all([engine.play("room.join"), engine.play("room.join")]);
    assert.equal(fetches, 1);
    assert.equal(decodes, 1);
    assert.equal(played.length, 1);
    now = 1500;
    await engine.play("room.join", "halo");
    assert.equal(played.at(-1), "/sounds/packs/halo/room-join.wav");
    assert.equal(fetches, 2);
    await Promise.all([engine.preload("halo"), engine.preload("halo")]);
    assert.equal(fetches, 15); // All 14 Halo assets plus the earlier Default join.
    assert.equal(decodes, 15);
    now = 3000;
    await engine.play("room.mute");
    now = 3001;
    await engine.play("room.unmute");
    assert.deepEqual(played.slice(-2), ["/sounds/packs/default/room-mute.wav", "/sounds/packs/default/room-unmute.wav"]);
    now = 4000;
    await engine.play("notification.social");
    now = 4001;
    await engine.play("notification.mention");
    assert.deepEqual(played.slice(-2), ["/sounds/packs/default/notification-social.wav", "/sounds/packs/default/notification-mention.wav"]);
    now = 4002;
    const count = played.length;
    await engine.play("notification.social");
    assert.equal(played.length, count);
    engine.active.clear(); // Prior mock one-shots have no natural onended event.
    const loop = engine.startLoop("call.incoming", "velvet");
    const duplicate = engine.startLoop("call.incoming", "velvet");
    assert.equal(loop, duplicate);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(played.filter((path) => path === "/sounds/packs/velvet/call-incoming.wav").length, 1);
    const beforeStop = stops;
    engine.stopLoop("call.incoming");
    assert.equal(stops, beforeStop + 1);
    loop.stop();
    assert.equal(stops, beforeStop + 1);
    let releaseFetch;
    globalThis.fetch = async (src) => src.includes("call-outgoing")
      ? new Promise((resolve) => { releaseFetch = () => resolve({ ok: true, arrayBuffer: async () => ({ src }) }); })
      : { ok: true, arrayBuffer: async () => ({ src }) };
    const pendingLoop = engine.startLoop("call.outgoing", "velvet");
    pendingLoop.stop();
    releaseFetch();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(played.filter((path) => path === "/sounds/packs/velvet/call-outgoing.wav").length, 0);
    globalThis.AudioContext = class { state = "suspended"; decodeAudioData = async (data) => data;
      resume = async () => { throw new Error("autoplay"); } };
    await assert.doesNotReject(new SoundEngine().play("room.join"));
  } finally {
    globalThis.window = originals.window;
    globalThis.fetch = originals.fetch;
    globalThis.AudioContext = originals.AudioContext;
    Object.defineProperty(globalThis, "performance", originals.performance);
    delete globalThis.__testCatalog;
  }
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
  const incoming = await read("src/components/chat/voice/IncomingCallOverlay.tsx");
  assert.match(incoming, /startProductSoundLoop\("call\.incoming"\)/);
  assert.doesNotMatch(incoming, /createOscillator|new AudioContext|new Audio\(/);
  const direct = await read("src/components/chat/voice/useDirectCallSounds.ts");
  assert.match(direct, /startProductSoundLoop\("call\.outgoing"\)/);
  assert.match(direct, /progress\.current\.resolved/);
  const desktop = await read("desktop/src/DesktopAuthenticatedApp.tsx");
  assert.match(desktop, /allowCustomIncomingSound=\{customIncomingSound\}/);
  assert.match(desktop, /notifyIncomingCall\(call, policy\.nativeSound\)/);
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
  assert.deepEqual(notificationAudioPolicy({ enabled: false, focused: true, visible: true, sound: "call.incoming" }),
    { nativeSound: false, customSound: null });
  assert.equal(notificationAudioPolicy({ enabled: true, focused: false, visible: false, sound: "call.incoming" }).nativeSound, true);
  assert.equal(notificationAudioPolicy({ enabled: true, focused: true, visible: true, sound: "call.incoming" }).customSound, "call.incoming");
  delete globalThis.__testPlay;
});

test("invalid stored packs fall back and later playback uses the selected pack", async () => {
  const catalog = await loadCatalog();
  assert.equal(catalog.normalizeSoundPack("unknown"), "default");
  let raw = JSON.stringify({ soundPack: "unknown" });
  const previousWindow = globalThis.window;
  globalThis.window = { localStorage: { getItem: () => raw } };
  globalThis.__testNormalize = catalog.normalizeSoundPack;
  let preferencesCode = transpile(await read("src/lib/app-preferences.ts"));
  preferencesCode = preferencesCode
    .replace(/import \{[^}]+\} from "@\/lib\/hotkeys";/, "const DEFAULT_HOTKEY_BINDINGS = []; const sanitizeHotkeys = () => [];")
    .replace(/import \{ normalizeSoundPack \} from "@\/lib\/sound\/sound-catalog";/,
      "const normalizeSoundPack = globalThis.__testNormalize;");
  try {
    const { readAppPreferences } = await import(`data:text/javascript,${encodeURIComponent(preferencesCode)}`);
    assert.equal(readAppPreferences().soundPack, "default");
    raw = JSON.stringify({ soundPack: "halo" });
    assert.equal(readAppPreferences().soundPack, "halo");
    const played = [];
    globalThis.__testRead = readAppPreferences;
    globalThis.__testEngine = { play: async (id, pack) => { played.push([id, pack]); } };
    let playbackCode = transpile(await read("src/lib/sound/sound-playback.ts"));
    playbackCode = playbackCode
      .replace(/import \{ readAppPreferences \} from "@\/lib\/app-preferences";/,
        "const readAppPreferences = globalThis.__testRead;")
      .replace(/import \{ soundEngine \} from "\.\/sound-engine";/,
        "const soundEngine = globalThis.__testEngine;");
    const { playProductSound } = await import(`data:text/javascript,${encodeURIComponent(playbackCode)}`);
    await playProductSound("room.join");
    raw = JSON.stringify({ soundPack: "velvet" });
    await playProductSound("room.join");
    assert.deepEqual(played, [["room.join", "halo"], ["room.join", "velvet"]]);
  } finally {
    globalThis.window = previousWindow;
    delete globalThis.__testNormalize;
    delete globalThis.__testRead;
    delete globalThis.__testEngine;
  }
});

test("Direct Call resolution cues use only observed terminal facts", async () => {
  const code = transpile(await read("src/components/chat/voice/call-phase.ts"));
  const { directCallResolutionSound } = await import(`data:text/javascript,${encodeURIComponent(code)}`);
  assert.equal(directCallResolutionSound("declined", true, false), "call.declined");
  assert.equal(directCallResolutionSound("ended", true, true), "call.ended");
  assert.equal(directCallResolutionSound("ended", true, false), null);
  assert.equal(directCallResolutionSound("cancelled", true, false), null);
  assert.equal(directCallResolutionSound("missed", true, false), null);
  assert.equal(directCallResolutionSound("declined", false, false), null);
});
