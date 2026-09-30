import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";

async function loadContract() {
  const source = await readFile(new URL("../src/lib/http/desktop-compatibility.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript,${encodeURIComponent(code)}`);
}

test("Desktop versions use numeric semver ordering and accept equality", async () => {
  const { compareDesktopVersions, parseDesktopVersion } = await loadContract();
  assert.equal(compareDesktopVersions("0.1.50", "0.1.49"), 1);
  assert.equal(compareDesktopVersions("0.1.10", "0.1.9"), 1);
  assert.equal(compareDesktopVersions("0.1.50", "0.1.50"), 0);
  assert.equal(compareDesktopVersions("0.1.50-beta.1", "0.1.50"), -1);
  assert.equal(parseDesktopVersion("0.01.50"), null);
});

test("only trusted Tauri Origins expose Desktop version and protocol", async () => {
  const { desktopRequestIdentity, coreDirectCallerEligible, DESKTOP_VERSION_HEADER, VOICE_PROTOCOL_HEADER } = await loadContract();
  const headers = new Headers({ Origin: "https://tauri.localhost", [DESKTOP_VERSION_HEADER]: "0.1.50", [VOICE_PROTOCOL_HEADER]: "core-direct-v1" });
  const desktop = desktopRequestIdentity(headers);
  assert.equal(desktop.platform, "desktop");
  assert.equal(desktop.version, "0.1.50");
  assert.equal(coreDirectCallerEligible(desktop), true);
  headers.set("Origin", "https://example.com");
  const web = desktopRequestIdentity(headers);
  assert.equal(web.platform, "web");
  assert.equal(web.version, null);
  assert.equal(coreDirectCallerEligible(web), true);
  headers.set("Origin", "http://tauri.localhost");
  headers.delete(VOICE_PROTOCOL_HEADER);
  assert.equal(coreDirectCallerEligible(desktopRequestIdentity(headers)), false);
});

test("minimum Desktop version is disabled by default and applies only to production Tauri", async () => {
  const { desktopRequestIdentity, desktopUpdateRequired, coreDirectCallerEligible, DESKTOP_VERSION_HEADER, VOICE_PROTOCOL_HEADER } = await loadContract();
  const headers = new Headers({ Origin: "tauri://localhost" });
  const old = desktopRequestIdentity(headers);
  assert.equal(desktopUpdateRequired(old, undefined), false);
  assert.equal(desktopUpdateRequired(old, "0.1.50"), true);
  headers.set(DESKTOP_VERSION_HEADER, "0.1.49");
  headers.set(VOICE_PROTOCOL_HEADER, "core-direct-v1");
  assert.equal(coreDirectCallerEligible(desktopRequestIdentity(headers)), true);
  assert.equal(desktopUpdateRequired(desktopRequestIdentity(headers), "0.1.50"), true);
  headers.set(DESKTOP_VERSION_HEADER, "0.1.50");
  assert.equal(desktopUpdateRequired(desktopRequestIdentity(headers), "0.1.50"), false);
  headers.set("Origin", "https://voople.app");
  assert.equal(desktopUpdateRequired(desktopRequestIdentity(headers), "0.1.50"), false);
  assert.equal(coreDirectCallerEligible(desktopRequestIdentity(headers)), true);
  headers.set("Origin", "http://127.0.0.1:1420");
  assert.equal(desktopUpdateRequired(desktopRequestIdentity(headers, true), "0.1.50"), false);
});

test("Core start passes an ordinary DM pair to the session-bound data boundary", async () => {
  const source = await readFile(new URL("../src/server/services/chat-core-direct-calls.service.ts", import.meta.url), "utf8");
  const service = source.match(/export async function startCoreDirectCall\([\s\S]*?\n}\r?\n/)?.[0];
  assert.ok(service);
  assert.doesNotMatch(service, /VOOPLE_INTERNAL_USER_IDS/);
  const code = ts.transpileModule(service.replace("export ", ""), {
    compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const callerId = "00000000-0000-4000-8000-000000000001";
  const recipientId = "00000000-0000-4000-8000-000000000002";
  const conversationId = "00000000-0000-4000-8000-000000000003";
  const requestId = "00000000-0000-4000-8000-000000000004";
  let started;
  const start = new Function("getDirectRecipientForPreviewRest", "startCoreDirectCallRest", `${code}\nreturn startCoreDirectCall;`)(
    async (conversation, caller) => {
      assert.equal(conversation, conversationId);
      assert.equal(caller, callerId);
      return recipientId;
    },
    async (input) => { started = input; return { sessionId: "session" }; },
  );
  assert.deepEqual(await start({ conversationId, callerId, requestId }), { sessionId: "session" });
  assert.deepEqual(started, { conversationId, callerId, requestId, expectedRecipientId: recipientId });
});

test("legacy chatId procedures remain separate from session-bound Core procedures", async () => {
  const legacy = await readFile(new URL("../src/server/trpc/routers/chat.ts", import.meta.url), "utf8");
  const core = await readFile(new URL("../src/server/trpc/routers/chat-core-direct-calls.ts", import.meta.url), "utf8");
  const data = await readFile(new URL("../src/server/data/chat-rooms-rest.ts", import.meta.url), "utf8");
  for (const procedure of ["incomingCalls", "enterRoom", "declineCall", "leaveRoom", "heartbeatRoom", "roomMediaToken", "roomScreenAudioToken"]) {
    assert.match(legacy, new RegExp(`\\b${procedure}: protectedProcedure`));
  }
  assert.doesNotMatch(data, /coreDirectCall|core_direct_call|live_sessions/);
  assert.match(core, /coreFinishDirectCall: protectedProcedure\.input\(z\.strictObject\(\{ sessionId:/);
  assert.match(core, /coreDirectCallMediaToken: protectedProcedure\.input\(z\.strictObject\(\{ sessionId:/);
  assert.match(core, /coreDirectCallHeartbeat: protectedProcedure\.input\(z\.strictObject\(\{/);
});

test("signed Tauri updater manifest path is independent of authenticated API", async () => {
  const workflow = await readFile(new URL("../.github/workflows/desktop-release.yml", import.meta.url), "utf8");
  const updater = await readFile(new URL("../desktop/src/updates/DesktopAutoUpdater.tsx", import.meta.url), "utf8");
  assert.match(workflow, /endpoints = @\("\$baseUrl\/desktop\/latest\.json"\)/);
  assert.match(updater, /await check\(\{ timeout: 15_000 \}\)/);
  assert.doesNotMatch(updater, /\/api\/trpc|Authorization|access_token/);
});
