import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildGroupNowView, resolveCurrentLiveSessionId } from "../src/lib/chat/group-now.ts";
import { formatGroupNowElapsed } from "../src/lib/chat/group-now-presentation.ts";

const user = (id) => ({
  id,
  username: id,
  displayName: id.toUpperCase(),
  avatarUrl: null,
});

const lobby = {
  id: "lobby",
  kind: "lobby",
  name: "Лобби",
  createdAt: "2026-08-31T10:00:00.000Z",
};

test("Group Now keeps Lobby first and derives active media state", () => {
  const result = buildGroupNowView({
    groupId: "group",
    groupName: "VOICEKK",
    viewerId: "alice",
    rooms: [
      { id: "drg", kind: "temporary", name: "DRG", createdAt: "2026-08-31T11:00:00.000Z" },
      lobby,
    ],
    sessions: [
      { id: "session", roomId: "drg", status: "active", startedAt: "2026-08-31T12:00:00.000Z", startedBy: "alice" },
    ],
    participants: [
      { sessionId: "session", user: user("alice"), micMuted: false, cameraEnabled: false, screenSharing: true },
    ],
    legacyPresence: [],
    onlineUsers: [user("alice"), user("bob")],
  });

  assert.deepEqual(result.rooms.map((room) => room.id), ["lobby", "drg"]);
  assert.equal(result.rooms[1]?.hasScreenShare, true);
  assert.deepEqual(result.rooms[1]?.joinTarget, { kind: "room", roomId: "drg" });
  assert.equal(result.rooms[1]?.participantCount, 1);
  assert.equal(result.rooms[1]?.startedAt, "2026-08-31T12:00:00.000Z");
  assert.equal(result.rooms[1]?.startedBy, "alice");
  assert.equal(result.rooms[1]?.participants[0]?.isMe, true);
  assert.equal(result.currentUserRoomId, "drg");
  assert.deepEqual(result.onlineOutsideRooms.map((entry) => entry.id), ["bob"]);
  assert.equal(result.visibleOnlineCount, 2);
  assert.equal(resolveCurrentLiveSessionId(result), "session");
});

test("Split resolves the current Lobby LiveSession, not merely a selected room", () => {
  const result = buildGroupNowView({
    groupId: "group",
    groupName: "VOICEKK",
    viewerId: "alice",
    rooms: [lobby],
    sessions: [{ id: "lobby-session", roomId: "lobby", status: "active", startedAt: "2026-08-31T12:00:00", startedBy: "alice" }],
    participants: [{ sessionId: "lobby-session", user: user("alice"), micMuted: true, cameraEnabled: false, screenSharing: false }],
    legacyPresence: [],
    onlineUsers: [],
  });
  assert.equal(result.currentUserRoomId, "lobby");
  assert.equal(resolveCurrentLiveSessionId(result), "lobby-session");
  assert.equal(resolveCurrentLiveSessionId({ ...result, currentUserRoomId: null }), null);
});

test("Room duration uses only a fresh LiveSession and retains its start through reconnect", () => {
  const now = Date.parse("2026-09-23T12:24:00Z");
  const base = {
    groupId: "group", groupName: "VOICEKK", viewerId: "alice", rooms: [lobby],
    legacyPresence: [], onlineUsers: [],
    participants: [{ sessionId: "live", user: user("alice"), micMuted: true, cameraEnabled: false, screenSharing: false }],
  };
  const fresh = buildGroupNowView({ ...base, sessions: [{ id: "live", roomId: "lobby", status: "active", startedAt: "2026-09-23T12:24:00", startedBy: "alice" }] });
  assert.equal(formatGroupNowElapsed(fresh.rooms[0].startedAt, now), "только что");
  const ongoing = buildGroupNowView({ ...base, sessions: [{ id: "live", roomId: "lobby", status: "active", startedAt: "2026-09-23T12:00:00", startedBy: "alice" }] });
  assert.equal(formatGroupNowElapsed(ongoing.rooms[0].startedAt, now), "24 мин");
  const afterReconnect = buildGroupNowView({ ...base, sessions: [{ id: "live", roomId: "lobby", status: "active", startedAt: "2026-09-23T12:00:00", startedBy: "alice" }] });
  assert.equal(afterReconnect.rooms[0].startedAt, ongoing.rooms[0].startedAt);
  const stale = buildGroupNowView({ ...base, participants: [], sessions: [{ id: "live", roomId: "lobby", status: "active", startedAt: "2026-09-17T07:24:00", startedBy: "alice" }] });
  assert.equal(stale.rooms[0].startedAt, null);
  assert.equal(stale.rooms[0].liveSessionId, null);
  assert.equal(stale.currentUserRoomId, null);
});

test("new LiveSession wins over duplicate legacy presence", () => {
  const result = buildGroupNowView({
    groupId: "group",
    groupName: "VOICEKK",
    viewerId: "viewer",
    rooms: [lobby, { id: "new-room", kind: "pinned", name: "Review", createdAt: "2026-08-31T11:00:00.000Z" }],
    sessions: [
      { id: "new-session", roomId: "new-room", status: "active", startedAt: "2026-08-31T12:00:00.000Z", startedBy: "alice" },
    ],
    participants: [
      { sessionId: "new-session", user: user("alice"), micMuted: true, cameraEnabled: true, screenSharing: false },
    ],
    legacyPresence: [
      { chatId: "legacy-section", roomName: "Старый раздел", user: user("alice") },
    ],
    onlineUsers: [],
  });

  assert.equal(result.rooms.find((room) => room.id === "new-room")?.participantCount, 1);
  assert.equal(result.rooms.some((room) => room.id === "legacy:legacy-section"), false);
});

test("legacy group and section presence remain visible during rollout", () => {
  const result = buildGroupNowView({
    groupId: "group",
    groupName: "VOICEKK",
    viewerId: "viewer",
    rooms: [lobby],
    sessions: [],
    participants: [],
    legacyPresence: [
      { chatId: "group", roomName: "Основная комната", user: user("alice") },
      { chatId: "game", roomName: "Game", user: user("bob") },
    ],
    onlineUsers: [],
  });

  assert.deepEqual(result.rooms[0]?.participants.map((entry) => entry.id), ["alice"]);
  assert.equal(result.rooms[1]?.id, "legacy:game");
  assert.deepEqual(result.rooms[1]?.joinTarget, { kind: "legacy", chatId: "game" });
  assert.deepEqual(result.rooms[1]?.participants.map((entry) => entry.id), ["bob"]);
});

test("Group Now refuses a group snapshot without its permanent Lobby", () => {
  assert.throws(() => buildGroupNowView({
    groupId: "group",
    groupName: "VOICEKK",
    viewerId: "viewer",
    rooms: [],
    sessions: [],
    participants: [],
    legacyPresence: [],
    onlineUsers: [],
  }), /нет активного Лобби/);
});

test("server read model owns membership and presence privacy", () => {
  const service = readFileSync("src/server/services/group-now.service.ts", "utf8");
  const data = readFileSync("src/server/data/group-now-rest.ts", "utf8");

  assert.match(service, /assertChatMemberRest/);
  assert.match(data, /\.gt\("last_seen_at", new Date\(Date\.now\(\) - 120_000\)\.toISOString\(\)\)/);
  assert.match(service, /membership\.parentChatId/);
  assert.match(service, /filterUserIdsByPrivacyFieldRest/);
  assert.match(service, /"roomsScope"/);
  assert.match(service, /getVisibleGroupRoomPresenceRest/);
  assert.match(data, /\.from\("group_rooms"\)/);
  assert.match(data, /\.from\("live_sessions"\)/);
  assert.match(data, /\.from\("live_session_participants"\)/);
  assert.match(data, /started_at, started_by/);
  assert.match(data, /\.is\("left_at", null\)/);
});
