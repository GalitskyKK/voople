import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildGroupNowView } from "../src/lib/chat/group-now.ts";

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
      { id: "session", roomId: "drg", status: "active", startedAt: "2026-08-31T12:00:00.000Z" },
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
  assert.equal(result.currentUserRoomId, "drg");
  assert.deepEqual(result.onlineOutsideRooms.map((entry) => entry.id), ["bob"]);
  assert.equal(result.visibleOnlineCount, 2);
});

test("new LiveSession wins over duplicate legacy presence", () => {
  const result = buildGroupNowView({
    groupId: "group",
    groupName: "VOICEKK",
    viewerId: "viewer",
    rooms: [lobby, { id: "new-room", kind: "pinned", name: "Review", createdAt: "2026-08-31T11:00:00.000Z" }],
    sessions: [
      { id: "new-session", roomId: "new-room", status: "active", startedAt: "2026-08-31T12:00:00.000Z" },
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
  assert.match(service, /membership\.parentChatId/);
  assert.match(service, /filterUserIdsByPrivacyFieldRest/);
  assert.match(service, /"roomsScope"/);
  assert.match(service, /getVisibleGroupRoomPresenceRest/);
  assert.match(data, /\.from\("group_rooms"\)/);
  assert.match(data, /\.from\("live_sessions"\)/);
  assert.match(data, /\.from\("live_session_participants"\)/);
  assert.match(data, /\.is\("left_at", null\)/);
});
