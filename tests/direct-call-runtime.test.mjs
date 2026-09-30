import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";

async function load(path) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript,${encodeURIComponent(code)}`);
}

const emptyProgress = () => ({ key: "", observed: false, connected: false, resolved: false });
const room = (status, endReason = null) => ({ status, endReason });

test("caller and callee phases follow the server call lifecycle", async () => {
  const { getDirectCallPhase, hasOutgoingCallLoop } = await load("src/components/chat/voice/call-phase.ts");
  const phase = (value, starter) => getDirectCallPhase({ direct: true, room: value, starter });
  assert.equal(phase(null, true), "idle");
  assert.equal(phase(room("ringing"), true), "dialing");
  assert.equal(phase(room("ringing"), false), "ringing");
  assert.equal(phase(room("active"), true), "connected");
  assert.equal(phase(room("active"), false), "connected");
  assert.equal(hasOutgoingCallLoop(phase(room("ringing"), true)), true);
  assert.equal(hasOutgoingCallLoop(phase(room("active"), true)), false);
  for (const reason of ["declined", "cancelled", "missed", "ended"]) {
    assert.equal(phase(room("empty", reason), true), "ended");
    assert.equal(phase(room("empty", reason), false), "ended");
  }
  assert.equal(hasOutgoingCallLoop(phase(room("empty", "declined"), true)), false);
  assert.equal(getDirectCallPhase({ direct: false, room: room("ringing"), starter: true }), null);
});

test("connected and terminal sounds are emitted once per observed call", async () => {
  const { advanceDirectCallSound } = await load("src/components/chat/voice/call-phase.ts");
  let progress = emptyProgress();
  const step = (key, phase, mediaReady, endReason = null) => {
    const next = advanceDirectCallSound(progress, { key, phase, mediaReady, endReason });
    progress = next.progress;
    return next.cue;
  };
  assert.equal(step("dm:first", "dialing", false), null);
  assert.equal(step("dm:first", "dialing", false), null);
  assert.equal(step("dm:first", "connected", false), null);
  assert.equal(step("dm:first", "connected", true), "call.connected");
  assert.equal(step("dm:first", "connected", true), null);
  assert.equal(step(null, "ended", false, "ended"), "call.ended");
  assert.equal(step(null, "ended", false, "ended"), null);
  assert.equal(step("dm:second", "dialing", false), null);
  assert.equal(step(null, "ended", false, "declined"), "call.declined");
  assert.equal(step(null, "ended", false, "declined"), null);
});

test("unobserved terminal facts, cancellation and timeout stay quiet", async () => {
  const { advanceDirectCallSound } = await load("src/components/chat/voice/call-phase.ts");
  for (const reason of ["cancelled", "missed", "ended", "declined"]) {
    const stale = advanceDirectCallSound(emptyProgress(), {
      key: "dm:old", phase: "ended", mediaReady: false, endReason: reason,
    });
    assert.equal(stale.cue, null);
  }
  for (const reason of ["cancelled", "missed"]) {
    const dialing = advanceDirectCallSound(emptyProgress(), {
      key: "dm:current", phase: "dialing", mediaReady: false, endReason: null,
    });
    const terminal = advanceDirectCallSound(dialing.progress, {
      key: null, phase: "ended", mediaReady: false, endReason: reason,
    });
    assert.equal(terminal.cue, null);
  }
});

test("incoming identity suppresses duplicate notices and expires stale ringing", async () => {
  const { DIRECT_CALL_RING_MS, incomingCallExpiresAt, incomingCallKey, shouldNotifyIncomingCall, matchesIncomingCall, visibleIncomingCall } =
    await load("src/lib/chat/direct-call-state.ts");
  const call = { chatId: "dm", startedAt: "2026-09-29T10:00:00" };
  const key = incomingCallKey(call);
  assert.equal(key, "dm:2026-09-29T10:00:00");
  assert.equal(incomingCallExpiresAt(call), Date.parse("2026-09-29T10:00:00Z") + DIRECT_CALL_RING_MS);
  const beforeExpiry = incomingCallExpiresAt(call) - 1;
  assert.equal(visibleIncomingCall(call, null, beforeExpiry), call);
  assert.equal(visibleIncomingCall(call, key, beforeExpiry), null);
  assert.equal(visibleIncomingCall(null, null, beforeExpiry), null);
  assert.equal(visibleIncomingCall(call, null, incomingCallExpiresAt(call)), null);
  assert.equal(shouldNotifyIncomingCall(key, false, null), true);
  assert.equal(shouldNotifyIncomingCall(key, false, key), false);
  assert.equal(shouldNotifyIncomingCall(key, true, null), false);
  assert.equal(shouldNotifyIncomingCall("dm:new", false, key), true);
  const ringing = { status: "ringing", startedAt: call.startedAt, startedBy: "caller" };
  assert.equal(matchesIncomingCall(call.startedAt, ringing, "callee"), true);
  assert.equal(matchesIncomingCall("older-call", ringing, "callee"), false);
  assert.equal(matchesIncomingCall(call.startedAt, { ...ringing, status: "active" }, "callee"), false);
  assert.equal(matchesIncomingCall(call.startedAt, ringing, "caller"), false);
});

test("Core session identity stays distinct across repeated calls and replaces its legacy projection", async () => {
  const { incomingCallKey, mergeIncomingCalls } = await load("src/lib/chat/direct-call-state.ts");
  const first = { chatId: "dm", startedAt: "2026-09-29T10:00:00", coreSessionId: "session-1" };
  const second = { ...first, coreSessionId: "session-2", startedAt: "2026-09-29T10:02:00" };
  const legacyProjection = { chatId: first.chatId, startedAt: first.startedAt };
  assert.notEqual(incomingCallKey(first), incomingCallKey(second));
  assert.deepEqual(mergeIncomingCalls([first], [legacyProjection]), [first]);
  assert.deepEqual(mergeIncomingCalls([first, second], [legacyProjection]), [second, first]);
});
