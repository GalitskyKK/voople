import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  const content = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  return path === "src/app/globals.css"
    ? `${content}\n${readFileSync(new URL("../src/app/styles/messenger-glass.css", import.meta.url), "utf8")}`
    : content;
}

test("group surface defaults to Voice and keeps the three product modes accessible", () => {
  const shell = source("src/components/chat/GroupSurfaceShell.tsx");
  const tabs = source("src/components/chat/GroupSurfaceTabs.tsx");

  assert.match(shell, /useState<GroupSurfaceTab>\(config\.initialTab \?\? "now"\)/);
  assert.match(shell, /activeTab === "chat"/);
  assert.match(shell, /voople-group-surface-header--combined/);
  assert.match(shell, /\{header\}/);
  assert.match(shell, /variant="shelf"/);
  assert.match(shell, /activeTab === "now"/);
  assert.match(shell, /variant="surface"/);
  assert.match(shell, /<GroupPeoplePanel/);
  assert.match(shell, /onVoop=\{config\.onVoop\}/);
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
  assert.match(roomCell, /onExpandCurrent\?\.\(room\)/);
  assert.match(source("src/app/styles/messenger-glass.css"), /flex: 0 1 360px !important/);
  assert.doesNotMatch(shelf, /text-\[(?:9|10|11)px\]/);
  assert.doesNotMatch(roomCell, /text-\[(?:9|10|11)px\]/);
  assert.match(roomCell, /text-sm font-semibold leading-4/);
  assert.match(roomCell, /"min-w-0 truncate text-xs leading-4"/);
  assert.match(roomCell, /"text-\[var\(--app-muted\)\]"/);
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

test("chat stream uses the wider centered canvas without stretching message copy or metadata", () => {
  const frame = source("src/components/chat/ChatThreadFrameView.tsx");
  const bubble = source("src/components/chat/ChatMessageBubbleVisual.tsx");

  assert.match(frame, /mx-auto[\s\S]*?max-w-\[72rem\]/);
  assert.match(bubble, /voople-chat-bubble relative min-w-0 flex-1/);
  assert.match(bubble, /voople-chat-bubble__body flex max-w-\[44rem\]/);
  assert.doesNotMatch(bubble, /ml-auto inline-flex items-center gap-0\.5 text-\[11px\]/);
  assert.doesNotMatch(bubble, /float-right/);
});

test("full Group Voice follows the approved glass card hierarchy", () => {
  const panel = source("src/components/chat/GroupNowPanelView.tsx");
  const room = source("src/components/chat/GroupNowRoomSection.tsx");
  const styles = source("src/app/globals.css");

  assert.match(panel, /voople-group-now__grid/);
  assert.doesNotMatch(panel, />Голос</);
  assert.doesNotMatch(panel, /formatRoomCount/);
  assert.match(room, /voople-group-now-room__current-actions/);
  assert.match(room, /Отделиться во временную комнату/);
  assert.match(room, /"Сплит"/);
  assert.match(panel, /<GroupNowCreateCard/);
  assert.match(panel, /otherRooms\.map/);
  assert.match(room, /voople-group-now-room/);
  assert.match(room, /voople-room-material/);
  assert.match(room, /voople-group-now-room__action-cue/);
  assert.match(room, /<button[\s\S]*?onClick=\{\(\) => onJoinRoom\(room\)\}/);
  assert.match(room, /aria-label=\{`\$\{actionLabel\}: \$\{room\.name\}`\}/);
  assert.doesNotMatch(room, />\s*(?:Зайти|Присоединиться|Перейти)\s*</);
  assert.doesNotMatch(panel, /text-\[(?:9|10|11)px\]/);
  assert.doesNotMatch(room, /text-\[(?:9|10|11)px\]/);
  assert.doesNotMatch(room, /padStart/);
  assert.match(styles, /--voople-glass-fill:/);
  assert.match(styles, /--voople-room-radius: 18px/);
  assert.match(styles, /\.voople-room-material__reflection/);
});

test("people view uses real member data and exposes room, presence and role context", () => {
  const controller = source("src/components/chat/GroupPeoplePanel.tsx");
  const view = source("src/components/chat/GroupPeoplePanelView.tsx");
  const voopAction = source("src/components/chat/GroupPeopleVoopAction.tsx");

  assert.match(controller, /trpc\.chat\.groupMembers\.useQuery/);
  assert.match(controller, /useGroupNowRoomCreate/);
  assert.match(controller, /split\.startVoop/);
  assert.match(controller, /voopingUserId=\{voopingUserId \?\? split\.targetUserId\}/);
  assert.match(controller, /enabled/);
  assert.match(view, /member\.activeRoom/);
  assert.match(view, /onlineUserIds\.has/);
  assert.match(view, /roleLabels\[member\.role\]/);
  assert.match(view, /shape="square"/);
  assert.match(view, /max-w-\[960px\]/);
  assert.match(view, /title="В голосе"/);
  assert.match(view, /title="Доступны"/);
  assert.match(view, /title="Не в сети"/);
  assert.match(view, /<GroupPeopleSection/);
  assert.match(view, /GroupPeopleVoopAction/);
  assert.match(voopAction, /voople-group-people-voop/);
  assert.match(view, /canVoopGroupMember\(member, currentUserId, currentParticipantIds\)/);
  assert.match(voopAction, /отдельный разговор/);
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
  assert.match(sectionPicker, /voople-chat-sections__selector/);
  assert.match(sections, /ChatSectionPicker/);
  assert.match(sectionPicker, /Найти раздел/);
  assert.match(composer, /voople-chat-composer__surface/);
  assert.match(styles, /\.voople-chat-window__header--group/);
  assert.match(styles, /\.voople-chat-sections__selector\[aria-expanded="true"\]/);
  assert.match(styles, /\.voople-chat-bubble__body,/);
});

test("the dark glass route owns inherited ink, viewport gutter and keyboard focus", () => {
  const people = source("src/components/chat/GroupPeoplePanelView.tsx");
  const styles = source("src/app/globals.css");

  assert.match(people, /text-\[var\(--foreground\)\]/);
  assert.match(styles, /\.voople-shell\[data-route-kind="messages"\][\s\S]*?color: var\(--foreground\);/);
  assert.match(styles, /html:has\(body \.voople-shell\[data-route-kind="messages"\]\)/);
  assert.match(styles, /button\.voople-room-material:focus-visible/);
  assert.match(styles, /\.voople-group-now-create-tile:focus-visible/);
  assert.match(styles, /\.voople-group-surface-tabs__tab:focus-visible/);
});

test("messenger dropdown portals retain the glass route scope", () => {
  const dropdown = source("src/components/ui/DropdownMenu.tsx");
  const picker = source("src/components/chat/ChatSectionPicker.tsx");
  const creator = source("src/components/chat/SubchatCreatorView.tsx");
  const composer = source("src/components/chat/ChatComposerFormView.tsx");
  const styles = source("src/app/globals.css");

  assert.match(dropdown, /closest<HTMLElement>\("\[data-route-kind\]"\)/);
  assert.match(dropdown, /data-route-kind=\{routeKind \?\? undefined\}/);
  assert.match(picker, /voople-chat-section-menu/);
  assert.match(creator, /voople-subchat-creator/);
  assert.doesNotMatch(composer, /text-\[(?:9|10|11)px\]/);
  assert.match(styles, /\.voople-dropdown-menu\[data-route-kind="messages"\]/);
  assert.match(styles, /\.voople-chat-section-menu\[data-route-kind="messages"\]/);
  assert.match(styles, /\.voople-chat-composer__reply/);
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
