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
  assert.match(shell, /voople-group-surface-header--combined/);
  assert.match(shell, /\{header\}/);
  assert.match(shell, /variant="shelf"/);
  assert.match(shell, /activeTab === "now"/);
  assert.match(shell, /variant="surface"/);
  assert.match(shell, /<GroupPeoplePanel/);
  assert.match(tabs, /\["chat", "Чат"\]/);
  assert.match(tabs, /\["now", "Войс"\]/);
  assert.match(tabs, /\["people", "Люди"\]/);
  assert.match(tabs, /role="tablist"/);
  assert.match(tabs, /aria-selected=/);
});

test("live shelf is bounded, shows room rosters and preserves direct room entry", () => {
  const shelf = source("src/components/chat/GroupLiveShelfView.tsx");
  const roomCell = source("src/components/chat/GroupLiveShelfRoomCell.tsx");
  const panel = source("src/components/chat/GroupNowPanelView.tsx");
  const styles = source("src/app/globals.css");

  assert.match(shelf, /room\.participantCount > 0/);
  assert.match(shelf, /room\.hasScreenShare/);
  assert.match(shelf, /resolveGroupNowRoomAction/);
  assert.match(shelf, /\["wide", 3\]/);
  assert.match(shelf, /\["medium", 2\]/);
  assert.match(shelf, /\["compact", 1\]/);
  assert.match(shelf, /activeRooms\.slice\(limit\)/);
  assert.match(shelf, /Ещё комнат/);
  assert.match(shelf, /shelfPreferenceKey\(groupId\)/);
  assert.match(shelf, /window\.localStorage\.getItem/);
  assert.match(shelf, /window\.localStorage\.setItem/);
  assert.match(shelf, /Свернуть активные разговоры/);
  assert.match(shelf, /Развернуть активные разговоры/);
  assert.match(shelf, /formatCollapsedRooms/);
  assert.match(shelf, /aria-expanded="false"/);
  assert.match(shelf, /aria-expanded="true"/);
  assert.doesNotMatch(shelf, /overflow-x-auto/);
  assert.match(roomCell, /room\.participants\.slice\(0, 3\)/);
  assert.match(roomCell, /ProfileAvatarVisual/);
  assert.match(roomCell, /onJoinRoom\(room\)/);
  assert.doesNotMatch(shelf, /text-\[(?:9|10|11)px\]/);
  assert.doesNotMatch(roomCell, /text-\[(?:9|10|11)px\]/);
  assert.match(roomCell, /text-sm font-semibold leading-4/);
  assert.match(roomCell, /text-xs leading-4 text-\[var\(--app-muted\)\]/);
  assert.match(styles, /container-type: inline-size/);
  assert.match(styles, /@container \(max-width: 520px\)/);
  assert.match(panel, /props\.variant === "shelf"/);
  assert.match(panel, /<GroupLiveShelfView/);
});

test("desktop messenger keeps the conversation header stack compact", () => {
  const frame = source("src/components/chat/ChatThreadFrameView.tsx");
  const tabs = source("src/components/chat/GroupSurfaceTabs.tsx");
  const styles = source("src/app/globals.css");

  assert.match(tabs, /min-h-10/);
  assert.doesNotMatch(frame, /"--theme-accent": accentColor/);
  assert.match(styles, /\.voople-panel-header \{[\s\S]*?min-height: 3\.5rem;/);
  assert.match(styles, /\.voople-chat-window__header--group \{[\s\S]*?min-height: 3\.5rem;/);
  assert.match(styles, /\.voople-group-surface-tabs \{[\s\S]*?min-height: 2\.25rem;/);
  assert.match(styles, /@media \(min-width: 1180px\)[\s\S]*?voople-group-surface-header--combined[\s\S]*?min-height: 4rem/);
});

test("chat stream lets metadata reach the canonical wide edge without stretching message copy", () => {
  const frame = source("src/components/chat/ChatThreadFrameView.tsx");
  const bubble = source("src/components/chat/ChatMessageBubbleVisual.tsx");

  assert.match(frame, /max-w-\[65rem\]/);
  assert.match(bubble, /voople-chat-bubble relative min-w-0 flex-1/);
  assert.match(bubble, /voople-chat-bubble__body flex max-w-\[44rem\]/);
});

test("full Group Now follows the flat live hierarchy from the canonical plan", () => {
  const panel = source("src/components/chat/GroupNowPanelView.tsx");
  const room = source("src/components/chat/GroupNowRoomSection.tsx");

  assert.match(panel, /voople-group-now__rooms/);
  assert.match(panel, /max-w-\[960px\]/);
  assert.match(panel, /mr-auto/);
  assert.match(panel, /voople-group-now__create/);
  assert.match(panel, /voople-group-now__grid/);
  assert.match(room, /voople-group-now-room/);
  assert.doesNotMatch(room, /padStart/);
  const roomSectionClass = room.match(/data-layout="room-section"[\s\S]*?className=\{cn\(([\s\S]*?)\)\}/)?.[1] ?? "";
  assert.doesNotMatch(roomSectionClass, /rounded-/);
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
  assert.match(view, /max-w-\[760px\]/);
  assert.match(view, /title="В разговоре"/);
  assert.match(view, /title="Онлайн"/);
  assert.match(view, /title="Остальные"/);
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
    assert.match(host, /combineHeader:/);
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
  const sectionPicker = source("src/components/chat/ChatSectionPicker.tsx");
  const composer = source("src/components/chat/ChatComposerVisual.tsx");
  const styles = source("src/app/globals.css");

  for (const host of [web, desktop]) {
    assert.match(host, /voople-chat-window__header--group/);
  }
  assert.match(identity, /voople-group-header-identity/);
  assert.match(identity, /voople-group-identity__name/);
  assert.match(identity, /voople-group-identity__meta/);
  assert.match(sectionPicker, /voople-chat-sections__item--active/);
  assert.match(sections, /ChatSectionPicker/);
  assert.match(sectionPicker, /Найти раздел/);
  assert.match(composer, /voople-chat-composer__surface/);
  assert.match(styles, /\.voople-chat-window__header--group/);
  assert.match(styles, /\.voople-chat-sections__item--active::after/);
  assert.match(styles, /\.voople-chat-bubble__body,/);
});

test("group visual gate includes section selection and collapsed voice shelf at wide and mobile widths", () => {
  const visualGate = source("scripts/verify-core-rework-group-surface.mjs");

  assert.match(visualGate, /state: "sections"/);
  assert.match(visualGate, /state: "create"/);
  assert.match(visualGate, /state: "collapsed"/);
  assert.match(visualGate, /Текущий раздел: Общий/);
  assert.match(visualGate, /Выбор раздела группы/);
  assert.match(visualGate, /getByRole\("form", \{ name: "Новый раздел" \}\)/);
  assert.match(visualGate, /Свернуть активные разговоры/);
  assert.match(visualGate, /Развернуть активные разговоры/);
  assert.match(visualGate, /stateSuffix/);
});
