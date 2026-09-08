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
  assert.match(shelf, /room\.hasScreenShare/);
  assert.match(shelf, /resolveGroupNowRoomAction/);
  assert.match(shelf, /overflow-x-auto/);
  assert.doesNotMatch(shelf, /min-h-11/);
  assert.match(panel, /props\.variant === "shelf"/);
  assert.match(panel, /<GroupLiveShelfView/);
});

test("full Group Now follows the flat live hierarchy from the canonical plan", () => {
  const panel = source("src/components/chat/GroupNowPanelView.tsx");
  const room = source("src/components/chat/GroupNowRoomSection.tsx");

  assert.match(panel, /voople-group-now__rooms/);
  assert.match(panel, /voople-group-now__create/);
  assert.doesNotMatch(panel, /border-dashed/);
  assert.match(room, /voople-group-now-room/);
  assert.doesNotMatch(room, /padStart/);
  assert.doesNotMatch(room, /rounded-\[var\(--app-radius-sm\)\].*border/);
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

test("messenger visual language is shared by web and desktop group threads", () => {
  const web = source("src/components/chat/ChatWindowHeader.tsx");
  const desktop = source("desktop/src/adapters/DesktopChatThreadAdapter.tsx");
  const identity = source("src/components/chat/GroupManagementTrigger.tsx");
  const sections = source("src/components/chat/ChatSectionsBarView.tsx");
  const composer = source("src/components/chat/ChatComposerVisual.tsx");
  const styles = source("src/app/globals.css");

  for (const host of [web, desktop]) {
    assert.match(host, /voople-chat-window__header--group/);
  }
  assert.match(identity, /voople-group-header-identity/);
  assert.match(identity, /voople-group-identity__name/);
  assert.match(identity, /voople-group-identity__meta/);
  assert.match(sections, /voople-chat-sections__item--active/);
  assert.match(composer, /voople-chat-composer__surface/);
  assert.match(styles, /\.voople-chat-window__header--group/);
  assert.match(styles, /\.voople-chat-sections__item--active::after/);
  assert.match(styles, /\.voople-chat-bubble__body,/);
});
