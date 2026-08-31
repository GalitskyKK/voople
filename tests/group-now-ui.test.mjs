import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  describeGroupNowRoom,
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
};

const lobby = {
  id: "00000000-0000-4000-8000-000000000003",
  kind: "lobby",
  name: "Лобби",
  joinTarget: { kind: "room", roomId: "00000000-0000-4000-8000-000000000003" },
  state: "active",
  liveSessionId: "00000000-0000-4000-8000-000000000004",
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

  assert.equal(describeGroupNowRoom({
    ...lobby,
    hasScreenShare: true,
    participants: [{ ...user, screenSharing: true }],
  }), "Biba показывает экран");
});

test("shared Group Now view keeps flat accessible states for both hosts", async () => {
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
  assert.match(viewSource, /max-w-\[960px\]/);
  assert.match(viewSource, /GroupNowRoomSection/);
  assert.match(viewSource, /mode: "loading" \| "offline" \| "error"/);
  assert.match(viewSource, /role="status"/);
  assert.match(viewSource, /role="alert"/);
  assert.match(viewSource, /aria-live="polite"/);
  assert.match(viewSource, /Сейчас тихо/);
  assert.match(viewSource, />\s*Комната\s*</);
  assert.doesNotMatch(viewSource, /grid-cols-[234]/);
  assert.match(roomSource, /aria-label=\{`\$\{actionLabels\[action\]\}: \$\{room\.name\}`\}/);
  assert.match(roomSource, /border-b border-\[var\(--app-border\)\]/);
  assert.doesNotMatch(controller, /desktop\/src|navigator\.userAgent/);
});
