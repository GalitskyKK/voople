import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { mergeHomeActiveRooms } from "../src/lib/social/home-live.ts";

const baseItem = {
  title: "Группа",
  subtitle: "Недавний разговор",
  href: "/messages/group-1",
  avatarUrl: null,
  userId: null,
  online: false,
};

test("live Room merge replaces stale cards, deduplicates Continue and restores it after leave", () => {
  const overview = {
    viewer: null,
    now: [
      { ...baseItem, id: "old-room", kind: "room", conversationId: "group-1", score: 100 },
      { ...baseItem, id: "online-person", kind: "person", userId: "user-1", score: 10 },
    ],
    continue: [],
    continueCandidates: [
      { ...baseItem, id: "group-1", kind: "group", score: 70 },
      { ...baseItem, id: "group-2", kind: "group", score: 40 },
    ],
    communities: [],
  };
  const liveRoom = {
    ...baseItem,
    id: "new-room",
    kind: "room",
    conversationId: "group-1",
    score: 100,
  };

  const active = mergeHomeActiveRooms(overview, [liveRoom]);
  assert.deepEqual(active.now.map((item) => item.id), ["new-room", "online-person"]);
  assert.deepEqual(active.continue.map((item) => item.id), ["group-2"]);
  assert.deepEqual(active.continueCandidates.map((item) => item.id), ["group-2"]);

  const quiet = mergeHomeActiveRooms(overview, []);
  assert.deepEqual(quiet.now.map((item) => item.id), ["online-person"]);
  assert.deepEqual(quiet.continue.map((item) => item.id), ["group-1", "group-2"]);
});

test("web and desktop share one bounded active Room refresh lifecycle", async () => {
  const [router, hook, web, desktop, view, handoff] = await Promise.all([
    readFile(new URL("../src/server/trpc/routers/home.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/hooks/useHomeActiveRooms.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/home/HomeOverviewPanels.tsx", import.meta.url), "utf8"),
    readFile(new URL("../desktop/src/adapters/DesktopFeedAdapter.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/home/HomeOverviewPanelsView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/hooks/useGroupNowMediaHandoff.ts", import.meta.url), "utf8"),
  ]);

  assert.match(router, /activeRooms: protectedProcedure/);
  assert.match(hook, /trpc\.home\.activeRooms\.useQuery/);
  assert.match(hook, /refetchInterval: HOME_ROOM_REFRESH_MS/);
  assert.match(hook, /refetchIntervalInBackground: false/);
  assert.match(hook, /refetchOnReconnect: true/);
  assert.match(hook, /fetchStatus === "paused"/);
  assert.match(web, /useHomeActiveRooms/);
  assert.match(desktop, /useHomeActiveRooms/);
  assert.match(view, /Не удалось обновить комнаты/);
  assert.match(view, /Нет сети/);
  assert.match(handoff, /utils\.home\.activeRooms\.invalidate\(\)/);
});
