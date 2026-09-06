import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildMessengerGroupLiveStates } from "../src/lib/chat/messenger-live.ts";

function roomItem({ groupId, roomId, participants, hasScreenShare = false, context = "group" }) {
  const room = {
    id: roomId,
    kind: "temporary",
    name: roomId,
    joinTarget: { kind: "room", roomId },
    state: "active",
    liveSessionId: "session",
    startedAt: null,
    startedBy: null,
    participantCount: participants.length,
    hasScreenShare,
    participants,
  };
  return {
    id: roomId,
    kind: "room",
    title: groupId,
    subtitle: null,
    href: `/messages/${groupId}`,
    avatarUrl: null,
    userId: null,
    online: true,
    participants,
    roomTarget: context === "group"
      ? { context: "group", groupId, room }
      : { context: "direct", chatId: groupId, room },
  };
}

test("sidebar live state groups rooms, deduplicates people and keeps screen share explicit", () => {
  const biba = { id: "biba", displayName: "Biba", avatarUrl: null };
  const kk = { id: "kk", displayName: "kk", avatarUrl: null };
  const states = buildMessengerGroupLiveStates([
    roomItem({ groupId: "voicekk", roomId: "lobby", participants: [biba, kk] }),
    roomItem({ groupId: "voicekk", roomId: "drg", participants: [kk], hasScreenShare: true }),
    roomItem({ groupId: "dm", roomId: "call", participants: [biba], context: "direct" }),
  ]);

  assert.deepEqual(states.get("voicekk"), {
    groupId: "voicekk",
    participantCount: 2,
    roomCount: 2,
    hasScreenShare: true,
  });
  assert.equal(states.has("dm"), false);
});

test("web and desktop sidebar share one bounded live query and one visual state", () => {
  const hook = readFileSync(new URL("../src/hooks/useMessengerGroupLiveStates.ts", import.meta.url), "utf8");
  const view = readFileSync(new URL("../src/components/layout/MessengerSidebarRows.tsx", import.meta.url), "utf8");
  const web = readFileSync(new URL("../src/components/layout/MessengerSidebar.tsx", import.meta.url), "utf8");
  const desktop = readFileSync(new URL("../desktop/src/adapters/DesktopMessengerSidebarAdapter.tsx", import.meta.url), "utf8");

  assert.match(hook, /trpc\.home\.activeRooms\.useQuery/);
  assert.match(hook, /refetchInterval: 15_000/);
  assert.match(hook, /refetchIntervalInBackground: false/);
  assert.match(view, /live\.participantCount/);
  assert.match(view, /live\.roomCount/);
  assert.match(view, /live\.hasScreenShare/);
  assert.match(web, /useMessengerGroupLiveStates/);
  assert.match(desktop, /useMessengerGroupLiveStates/);
});
