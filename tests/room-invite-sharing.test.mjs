import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { coreRoomInviteUrl } from "../src/lib/chat/core-room-invite-url.ts";
import { shareLink } from "../src/lib/platform/share-link.ts";

const id = "10000000-0000-4000-8000-000000000001";
const url = `https://voople.ru/room-invites/${id}`;

test("invite URLs use the server website, not a desktop WebView origin", () => {
  assert.equal(coreRoomInviteUrl(id, "https://voople.ru"), url);
  assert.equal(coreRoomInviteUrl(id, "https://staging.example.com/"), `https://staging.example.com/room-invites/${id}`);
  assert.equal(coreRoomInviteUrl(id, "http://localhost:3000"), `http://localhost:3000/room-invites/${id}`);
  for (const base of ["tauri://localhost", "http://tauri.localhost", "http://example.com", "https://user:password@example.com", "https://voople.ru/path", "https://voople.ru/?token=x", "https://voople.ru/#x", "not a URL"]) {
    assert.equal(coreRoomInviteUrl(id, base), null);
  }
  assert.equal(coreRoomInviteUrl("../settings", "https://voople.ru"), null);
});

test("successful native sharing never also writes the clipboard", async () => {
  const shared = [];
  let copies = 0;
  const result = await shareLink({ url, title: "Приглашение в Voople" }, {
    origin: "http://tauri.localhost", share: async (data) => shared.push(data), copy: async () => { copies++; },
  });
  assert.equal(result, "shared");
  assert.equal(copies, 0);
  assert.deepEqual(shared, [{ url, title: "Приглашение в Voople", text: undefined }]);
});

test("cancelling the native sheet does not silently copy a private invitation", async () => {
  let copies = 0;
  const result = await shareLink({ url }, {
    origin: "https://voople.ru", share: async () => { throw { name: "AbortError" }; },
    copy: async () => { copies++; },
  });
  assert.equal(result, "cancelled");
  assert.equal(copies, 0);
});

test("copy mode bypasses native share and preserves the canonical invite URL", async () => {
  const copied = [];
  const result = await shareLink({ url, mode: "copy" }, {
    origin: "null", copy: async (value) => copied.push(value),
    share: async () => assert.fail("copy must not open the share sheet"),
  });
  assert.equal(result, "copied");
  assert.deepEqual(copied, [url]);
});

test("unavailable or failed native sharing falls back to clipboard", async () => {
  for (const share of [undefined, async () => { throw new Error("unsupported"); }]) {
    const copied = [];
    assert.equal(await shareLink({ url: "/example?ask=1" }, {
      origin: "https://voople.ru", share, copy: async (value) => copied.push(value),
    }), "copied");
    assert.deepEqual(copied, ["https://voople.ru/example?ask=1"]);
  }
});

test("clipboard failure remains actionable, unsafe links never reach platform APIs", async () => {
  await assert.rejects(shareLink({ url }, { origin: "https://voople.ru" }));
  await assert.rejects(shareLink({ url }, { origin: "https://voople.ru", copy: async () => { throw new Error("denied"); } }));
  for (const value of ["javascript:alert(1)", "file:///tmp/private", "https://user:password@example.com"]) {
    await assert.rejects(shareLink({ url: value }, { origin: "https://voople.ru", share: async () => assert.fail("unsafe share"), copy: async () => assert.fail("unsafe copy") }));
  }
});

test("sender links stay inside existing session, membership, privacy and ownership checks", () => {
  const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const service = read("src/server/services/core-room-invitations.service.ts");
  const data = read("src/server/data/core-room-invitations-rest.ts");
  const panel = read("src/components/chat/voice/CoreRoomInvitePanel.tsx");
  const row = read("src/components/chat/voice/CoreRoomInviteCandidateRow.tsx");
  assert.match(service, /getCoreRoomInviteSessionRest\(sessionId, userId\)/);
  assert.match(service, /requireRootGroupMember\(context.groupId, userId\)/);
  assert.match(service, /"inviteScope"/);
  assert.match(service, /shareUrl: sent.status === "pending" \? coreRoomInviteUrl\(sent.id, getSiteUrl\(\)\) : null/);
  assert.match(data, /\.eq\("inviter_id", inviterId\)/);
  assert.match(panel, /enabled && online && candidates.fetchStatus !== "paused"/);
  assert.match(row, /Date.parse\(record.expiresAt\) > now/);
  assert.match(row, /Другим аккаунтам она не даст доступ/);
});
