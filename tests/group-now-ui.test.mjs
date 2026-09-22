import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  describeGroupNowRoom,
  formatGroupNowElapsed,
  formatGroupNowVoiceSummary,
  isGroupNowQuiet,
  resolveGroupNowRoomAction,
} from "../src/lib/chat/group-now-presentation.ts";

const user = {
  id: "00000000-0000-4000-8000-000000000002",
  username: "biba",
  displayName: "Biba",
  avatarUrl: null,
  micMuted: false,
  cameraEnabled: false,
  screenSharing: false,
  isMe: false,
};

const lobby = {
  id: "00000000-0000-4000-8000-000000000003",
  kind: "lobby",
  name: "Лобби",
  joinTarget: { kind: "room", roomId: "00000000-0000-4000-8000-000000000003" },
  state: "active",
  liveSessionId: "00000000-0000-4000-8000-000000000004",
  startedAt: "2026-08-31T12:00:00.000Z",
  startedBy: user.id,
  participantCount: 1,
  hasScreenShare: false,
  participants: [user],
};

test("Group Now presentation resolves current, switch and live activity", () => {
  assert.equal(resolveGroupNowRoomAction(lobby.id, null), "join");
  assert.equal(resolveGroupNowRoomAction(lobby.id, lobby.id), "current");
  assert.equal(resolveGroupNowRoomAction(lobby.id, "another-room"), "switch");
  assert.equal(describeGroupNowRoom(lobby), "Biba: микрофон включён");
  assert.equal(isGroupNowQuiet([lobby]), false);
  assert.equal(formatGroupNowVoiceSummary([lobby]), "1 в голосе · 1 разговор");
  assert.equal(formatGroupNowVoiceSummary([
    lobby,
    { ...lobby, id: "second-room", participantCount: 4 },
  ]), "5 в голосе · 2 разговора");

  assert.equal(describeGroupNowRoom({
    ...lobby,
    hasScreenShare: true,
    participants: [{ ...user, screenSharing: true }],
  }), "Biba показывает экран");
  assert.equal(formatGroupNowElapsed(null), null);
  assert.equal(formatGroupNowElapsed("2026-08-31T12:00:00.000Z", Date.parse("2026-08-31T12:24:00.000Z")), "24 мин");
});

test("shared Group Now view keeps accessible voice actions for both hosts", async () => {
  const [controller, viewSource, roomSource] = await Promise.all([
    readFile(new URL("../src/components/chat/GroupNowPanel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/GroupNowPanelView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/GroupNowRoomSection.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(controller, /enabled = false/);
  assert.match(controller, /if \(!enabled\) return null/);
  assert.match(controller, /coreGroupNow\.useQuery/);
  assert.match(controller, /refetchInterval: enabled && online \? 15_000 : false/);
  assert.match(controller, /window\.addEventListener\("offline"/);
  assert.match(viewSource, /GroupNowRoomSection/);
  assert.match(viewSource, /mode: "loading" \| "offline" \| "error"/);
  assert.match(viewSource, /role="status"/);
  assert.match(viewSource, /role="alert"/);
  assert.match(viewSource, /aria-live="polite"/);
  assert.match(viewSource, /room\.kind === "lobby"/);
  assert.doesNotMatch(viewSource, />Голос</);
  assert.match(roomSource, /Отделиться во временную комнату/);
  assert.match(roomSource, /voople-group-now-room__current-actions/);
  assert.match(viewSource, /GroupNowCreateCard/);
  assert.match(roomSource, /pending \? "Создаём…" : "Комната"/);
  assert.match(roomSource, /останется в группе/);
  assert.match(roomSource, /aria-label=\{`\$\{actionLabel\}: \$\{room\.name\}`\}/);
  assert.match(roomSource, /aria-label=\{`Выйти из разговора: \$\{room\.name\}`\}/);
  assert.match(roomSource, /onLeaveCurrent\(room\)/);
  assert.match(controller, /Не удалось выйти из разговора/);
  assert.match(roomSource, /Начать разговор/);
  assert.match(roomSource, /Присоединиться/);
  assert.match(roomSource, /data-layout="room-section"/);
  assert.match(roomSource, /variant="room"/);
  assert.doesNotMatch(roomSource, /padStart\(2, "0"\)/);
  assert.doesNotMatch(controller, /desktop\/src|navigator\.userAgent/);
});
