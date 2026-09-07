import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("group surface defaults to chat and keeps the three product modes accessible", () => {
  const shell = source("src/components/chat/GroupSurfaceShell.tsx");
  const tabs = source("src/components/chat/GroupSurfaceTabs.tsx");

  assert.match(shell, /useState<GroupSurfaceTab>\(config\.initialTab \?\? "chat"\)/);
  assert.match(shell, /activeTab === "chat"/);
  assert.match(shell, /variant="shelf"/);
  assert.match(shell, /activeTab === "now"/);
  assert.match(shell, /variant="surface"/);
  assert.match(shell, /<GroupPeoplePanel/);
  assert.match(tabs, /\["chat", "Чат"\]/);
  assert.match(tabs, /\["now", "Сейчас"\]/);
  assert.match(tabs, /\["people", "Люди"\]/);
  assert.match(tabs, /role="tablist"/);
  assert.match(tabs, /aria-selected=/);
});

test("live shelf only shows occupied rooms and preserves direct room entry", () => {
  const shelf = source("src/components/chat/GroupLiveShelfView.tsx");
  const panel = source("src/components/chat/GroupNowPanelView.tsx");

  assert.match(shelf, /room\.participantCount > 0/);
  assert.match(shelf, /room\.participants\.slice\(0, 4\)/);
  assert.match(shelf, /room\.hasScreenShare/);
  assert.match(shelf, /resolveGroupNowRoomAction/);
  assert.match(panel, /props\.variant === "shelf"/);
  assert.match(panel, /<GroupLiveShelfView/);
});

test("people view uses real member data and exposes room, presence and role context", () => {
  const controller = source("src/components/chat/GroupPeoplePanel.tsx");
  const view = source("src/components/chat/GroupPeoplePanelView.tsx");

  assert.match(controller, /trpc\.chat\.groupMembers\.useQuery/);
  assert.match(controller, /enabled/);
  assert.match(view, /member\.activeRoom/);
  assert.match(view, /onlineUserIds\.has/);
  assert.match(view, /roleLabels\[member\.role\]/);
  assert.match(view, /shape="square"/);
  assert.match(view, /title="Сейчас"/);
  assert.match(view, /title="Онлайн"/);
  assert.match(view, /title="Не в сети"/);
  assert.match(view, /<GroupPeopleSection/);
});

test("web and desktop thread hosts enable the same group surface without replacing legacy features", () => {
  const web = source("src/components/chat/ChatWindow.tsx");
  const desktop = source("desktop/src/adapters/DesktopChatThreadAdapter.tsx");
  const frame = source("src/components/chat/ChatThreadFrameView.tsx");

  for (const host of [web, desktop]) {
    assert.match(host, /groupSurface=/);
    assert.match(host, /parentChatId/);
    assert.match(host, /canCreatePinned/);
  }
  assert.match(frame, /<GroupSurfaceShell/);
  assert.match(frame, /groupSurface\.initialTab/);
  assert.match(frame, /chatContent/);
  assert.match(web, /ChatSectionsBar/);
  assert.match(desktop, /ChatSectionsBarView/);
});
