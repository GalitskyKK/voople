import assert from "node:assert/strict";
import test from "node:test";

import { buildCoreRoomVoiceView } from "../src/lib/chat/core-room-voice-session.ts";

const participant = {
  id: "user",
  username: "user",
  displayName: "User",
  avatarUrl: null,
  isMe: true,
  micMuted: false,
  cameraEnabled: false,
  screenSharing: false,
};

const groupNow = {
  groupId: "group",
  groupName: "Group",
  visibleOnlineCount: 1,
  currentUserRoomId: "room",
  onlineOutsideRooms: [],
  rooms: [{
    id: "room",
    kind: "temporary",
    name: "Review",
    joinTarget: { kind: "room", roomId: "room" },
    state: "active",
    liveSessionId: "session",
    startedAt: "2026-09-01T10:00:00.000Z",
    startedBy: "user",
    participantCount: 1,
    hasScreenShare: false,
    participants: [participant],
  }],
};

test("core Room read model maps into the existing voice surface contract", () => {
  const result = buildCoreRoomVoiceView(groupNow, {
    roomId: "room",
    sessionId: "session",
  });

  assert.equal(result.status, "active");
  assert.equal(result.startedBy, "user");
  assert.equal(result.startedAt, "2026-09-01T10:00:00.000Z");
  assert.equal(result.isInside, true);
  assert.deepEqual(result.participants[0], {
    id: "user",
    username: "user",
    displayName: "User",
    avatarUrl: null,
    avatarDecorationUrl: null,
    avatarRingId: null,
    micMuted: false,
    isMe: true,
  });
});

test("core Room voice adapter rejects stale and legacy session targets", () => {
  assert.throws(
    () => buildCoreRoomVoiceView(groupNow, { roomId: "room", sessionId: "stale" }),
    /уже завершилась/,
  );
  assert.throws(
    () => buildCoreRoomVoiceView({
      ...groupNow,
      rooms: [{
        ...groupNow.rooms[0],
        id: "legacy:section",
        joinTarget: { kind: "legacy", chatId: "section" },
      }],
    }, { roomId: "legacy:section", sessionId: "session" }),
    /больше недоступна/,
  );
});
