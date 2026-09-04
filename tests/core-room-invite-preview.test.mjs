import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isCoreRoomInviteId, roomInviteIdFromPath, resolveCoreRoomInvitePreview } from "../src/lib/chat/core-room-invite-preview.ts";

const id = "10000000-0000-4000-8000-000000000001";
const now = Date.parse("2026-09-04T10:00:00Z");
const invite = {
  id, status: "pending", expiresAt: "2026-09-04T10:15:00Z",
  groupId: "group", groupName: "Private group", inviter: { id: "sender" },
  room: { id: "room", name: "Private room" },
};
const resolve = (overrides = {}) => resolveCoreRoomInvitePreview({
  valid: true, online: true, loading: false, error: false, invite, now, ...overrides,
});

test("room invite routes validate the entire path and share UUID handling", () => {
  assert.equal(isCoreRoomInviteId(id), true);
  assert.equal(roomInviteIdFromPath(`/room-invites/${id}`), id);
  assert.equal(roomInviteIdFromPath(`/room-invites/${id}/`), id);
  assert.equal(isCoreRoomInviteId(id.replace("-4000-", "-7000-")), true);
  for (const path of ["/room-invites/invalid", `/room-invites/${id}/extra`, `/other/${id}`, `/room-invites/${id}?x=1`]) {
    assert.equal(roomInviteIdFromPath(path), null);
  }
  assert.equal(isCoreRoomInviteId(`${id}x`), false);
});

test("invalid, missing and loading invitations expose no cached details", () => {
  assert.deepEqual(resolve({ valid: false }), { kind: "unavailable" });
  assert.deepEqual(resolve({ invite: null }), { kind: "unavailable" });
  assert.deepEqual(resolve({ invite: undefined, loading: true }), { kind: "loading" });
});

test("offline and failed revalidation hide cached room details until recovery", () => {
  assert.deepEqual(resolve({ online: false }), { kind: "offline" });
  assert.deepEqual(resolve({ error: true }), { kind: "error" });
  assert.deepEqual(resolve({ online: false, error: true, loading: true }), { kind: "offline" });
  assert.deepEqual(resolve(), { kind: "ready", invite });
});

test("expiry boundary and malformed deadlines remove join targets without mutating query data", () => {
  for (const expiresAt of [new Date(now).toISOString(), new Date(now - 1).toISOString(), "invalid"]) {
    const source = { ...invite, expiresAt };
    const state = resolve({ invite: source });
    assert.equal(state.kind, "ready");
    assert.deepEqual(state.invite, { ...source, status: "expired", room: null, groupId: null, groupName: null, inviter: null });
    assert.equal(source.status, "pending");
    assert.equal(source.room, invite.room);
  }
  assert.equal(resolve({ now: Date.parse(invite.expiresAt) - 1 }).invite.status, "pending");
});

test("server terminal statuses take precedence over local expiry", () => {
  for (const status of ["accepted", "declined", "cancelled", "expired"]) {
    const terminal = { ...invite, status, room: null, expiresAt: new Date(now - 1).toISOString() };
    assert.deepEqual(resolve({ invite: terminal }), { kind: "ready", invite: terminal });
  }
});

test("preview access checks distinguish denied membership from unavailable storage", () => {
  const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const service = read("src/server/services/core-room-invitations.service.ts");
  const data = read("src/server/data/core-room-invitations-rest.ts");
  const router = read("src/server/trpc/routers/chat-core-rework.ts");
  assert.match(service, /if \(!\(error instanceof ChatAccessDeniedError\)\) throw error/);
  assert.match(service, /requireRootGroupMember\(groupId, userId\)/);
  assert.match(data, /\.eq\("invitee_id", userId\)/);
  assert.match(data, /currentMembers\.has\(`\$\{invite.chat_id\}:\$\{participantId\}`\)/);
  assert.match(data, /"roomsScope"/);
  assert.match(router, /coreRoomInvitePreview: protectedProcedure/);
});
