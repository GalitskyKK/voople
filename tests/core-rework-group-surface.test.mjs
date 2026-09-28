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
  const workspace = source("src/components/chat/GroupWorkspaceView.tsx");
  const mode = source("src/hooks/useGroupWorkspaceMode.ts");
  const tabs = source("src/components/chat/GroupSurfaceTabs.tsx");

  assert.match(shell, /useState<GroupSurfaceTab>\(config\.initialTab \?\? "now"\)/);
  assert.match(shell, /<GroupWorkspaceView/);
  assert.doesNotMatch(shell, /variant="shelf"/);
  assert.match(shell, /variant="surface"/);
  assert.match(shell, /<GroupPeoplePanel/);
  assert.match(shell, /onVoop=\{config\.onVoop\}/);
  assert.match(workspace, /voople-group-surface-header--combined/);
  assert.match(workspace, /!desktop \? <GroupSurfaceTabs/);
  assert.match(workspace, /desktop \|\| activeTab === "now"/);
  assert.match(workspace, /desktop \|\| activeTab === "chat"/);
  assert.match(workspace, /mode === "wide" \|\| activeTab === "people"/);
  assert.match(workspace, /mode === "medium" && peopleOpen/);
  assert.match(workspace, /event\.key !== "Escape"/);
  assert.match(workspace, /peopleTrigger\.current\?\.focus\(\)/);
  assert.match(mode, /ResizeObserver/);
  assert.match(mode, /width >= 1120/);
  assert.match(mode, /width >= 800/);
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
  assert.match(source("src/app/styles/messenger-glass.css"), /flex: 0 1 360px;/);
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
  const styles = source("src/app/styles/messenger-glass.css");
  const globals = source("src/app/globals.css");

  assert.match(tabs, /min-h-10/);
  assert.doesNotMatch(frame, /"--theme-accent": accentColor/);
  assert.match(styles, /\.voople-panel-header \{[\s\S]*?min-height: 62px;/);
  assert.match(styles, /\.voople-chat-window__header--group \{[\s\S]*?min-height: 62px;/);
  assert.match(styles, /\.voople-group-surface-tabs \{[\s\S]*?min-height: 38px;/);
  assert.match(styles, /\.voople-group-surface-header \{[\s\S]*?background: var\(--material-chrome\)/);
  assert.doesNotMatch(globals, /\.voople-group-now-room \{[\s\S]{0,400}?linear-gradient/);
});

test("Group chrome shares its actions across web and desktop without a channel title", () => {
  const group = source("src/components/chat/GroupInfoDrawerView.tsx");
  const chrome = source("src/components/chat/GroupTopChrome.tsx");
  const titlebar = source("desktop/src/shell/DesktopTitleBar.tsx");
  assert.doesNotMatch(group, /voople-group-current-context|# Общий/);
  assert.match(group, /createPortal\(<GroupTopChrome/);
  assert.match(group, /<GroupTopChrome/);
  assert.match(chrome, /Пригласить в группу/);
  assert.match(chrome, /Информация о группе/);
  assert.match(titlebar, /voople-desktop-group-chrome-root/);
  assert.match(titlebar, /className="desktop-titlebar__drag" data-tauri-drag-region/);
  assert.doesNotMatch(titlebar.match(/<div ref=\{onGroupChromeSlotChange\}[^>]+>/)?.[0] ?? "", /data-tauri-drag-region/);
  assert.doesNotMatch(titlebar, /desktop-titlebar__channel/);
  assert.ok(titlebar.indexOf("desktop-titlebar__group-slot") < titlebar.indexOf("desktop-titlebar__controls"));
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

test("Group Voice is an ordered Room list with complete independent rosters", () => {
  const panel = source("src/components/chat/GroupNowPanelView.tsx");
  const room = source("src/components/chat/GroupNowRoomSection.tsx");
  assert.doesNotMatch(panel, /voople-group-now__grid|GroupNowCreateCard/);
  assert.match(panel, /persistentRooms.map\(renderRoom\)/);
  assert.match(panel, /temporaryRooms.map\(renderRoom\)/);
  assert.match(panel, /room.kind === "temporary" && room.participantCount > 0/);
  assert.doesNotMatch(panel, /\.sort\(/);
  assert.match(room, /<section data-layout="room-section"/);
  assert.match(room, /room.participants.map/);
  assert.doesNotMatch(room, /slice\(|visibleParticipantLimit|overflowCount|voople-room-material/);
  assert.ok(room.indexOf("</button>") < room.indexOf("<GroupNowParticipant"));
  assert.match(room, /current \? onExpandCurrent\?\.\(room\) : onJoinRoom\(room\)/);
  assert.match(room, /Войти в комнату/);
  assert.match(room, /Перейти в комнату/);
  assert.match(room, /Открыть текущую комнату/);
  assert.match(room, /Вы здесь/);
  assert.match(room, /Подключаемся…/);
  assert.doesNotMatch(room, /onLeaveCurrent/);
});

test("only matching current-session roster gets media, volume, Split and Voop", () => {
  const room = source("src/components/chat/GroupNowRoomSection.tsx");
  const person = source("src/components/chat/GroupNowParticipant.tsx");
  const bridge = source("src/components/chat/voice/useVoiceParticipantBridge.ts");
  const provider = source("src/components/chat/voice/VoiceSessionProvider.tsx");
  const connected = source("src/components/chat/GroupNowConnectedPanel.tsx");
  assert.match(room, /current && room.liveSessionId && sessionDetails\?\.sessionId === room.liveSessionId/);
  assert.match(room, /detail=\{live\?\.participants\[user.id\]\}/);
  assert.match(room, /live && onCreateSplit/);
  assert.match(room, /!user.guest && !user.isMe/);
  assert.match(connected, /onVoop=\{create.startVoop\}/);
  assert.doesNotMatch(connected, /fixed bottom-20/);
  assert.match(person, /VoiceParticipantContextMenu/);
  assert.match(person, /ContextMenu/);
  assert.match(person, /event.shiftKey && event.key === "F10"/);
  assert.match(person, /onClick=\{menuAvailable \? openMenu : undefined\}/);
  assert.match(person, /previewOnClick=\{!menuAvailable\}/);
  assert.match(bridge, /setParticipantVolume: onParticipantVolumeChange/);
  assert.doesNotMatch(bridge, /new Room|useQuery|setInterval|\.on\(/);
  assert.match(provider, /participantDetails\?\.sessionId === activeSession\?\.coreSession\?\.join.sessionId/);
});

test("people view uses real member data and exposes room, presence and role context", () => {
  const controller = source("src/components/chat/GroupPeoplePanel.tsx");
  const view = source("src/components/chat/GroupPeoplePanelView.tsx");
  const section = source("src/components/chat/GroupPeopleSection.tsx");
  const voopAction = source("src/components/chat/GroupPeopleVoopAction.tsx");

  assert.match(controller, /trpc\.chat\.groupMembers\.useQuery/);
  assert.match(controller, /useGroupNowRoomCreate/);
  assert.match(controller, /split\.startVoop/);
  assert.match(controller, /voopingUserId=\{props\.voopingUserId \?\? split\.targetUserId\}/);
  assert.match(controller, /allowVoop === false[\s\S]*?onVoop=\{undefined\}/);
  assert.match(controller, /!nowRefreshedElsewhere \? 15_000 : false/);
  assert.match(controller, /enabled/);
  assert.match(controller, /trpc\.chat\.coreGroupNow\.useQuery/);
  assert.match(view, /groupPeopleSections\(members \?\? \[\], onlineUserIds, now\)/);
  assert.match(section, /onlineUserIds\.has/);
  assert.match(section, /roleLabels\[member\.role\]/);
  assert.match(section, /shape="square"/);
  assert.match(view, /max-w-\[960px\]/);
  assert.match(view, /В голосе: \$\{sections\.live\.length\}/);
  assert.match(view, /title="Доступны"/);
  assert.match(view, /title="Не в сети"/);
  assert.match(view, /<GroupPeopleSection/);
  assert.match(section, /GroupPeopleVoopAction/);
  assert.match(voopAction, /voople-group-people-voop/);
  assert.match(section, /canVoopGroupMember\(member, currentUserId, currentParticipantIds\)/);
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

test("the matte route owns inherited ink, viewport gutter and keyboard focus", () => {
  const people = source("src/components/chat/GroupPeoplePanelView.tsx");
  const styles = source("src/app/styles/messenger-glass.css");

  assert.match(people, /text-\[var\(--foreground\)\]/);
  assert.match(styles, /\.voople-shell\[data-route-kind="messages"\][\s\S]*?color: var\(--foreground\);/);
  assert.match(styles, /html:has\(body \.voople-shell\[data-route-kind="messages"\]\)/);
  assert.match(styles, /button\.voople-room-material:focus-visible/);
  assert.match(styles, /\.voople-group-now-room__header:focus-visible/);
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

test("visual gate exercises both themes, hosts, full rosters and interactions", () => {
  const gate = source("scripts/verify-core-rework-group-surface.mjs");
  assert.match(gate, /count:20/);
  assert.match(gate, /width:1440/);
  assert.match(gate, /width:1100/);
  assert.match(gate, /width:390/);
  assert.match(gate, /width:360/);
  assert.match(gate, /"web", "desktop"/);
  assert.match(gate, /theme:"light"/);
  assert.match(gate, /Shift\+F10/);
  assert.match(gate, /Stage stays above mobile dock/);
  assert.match(gate, /getByRole\('slider'\).fill\('150'\)/);
});

test("Stage never becomes transparent because a Group roster is mounted", () => {
  const css = source("src/app/globals.css");
  assert.doesNotMatch(css, /:has\(> \.voople-group-now\)/);
  assert.match(css, /\.voople-stage \{[\s\S]*?background-color: var\(--material-stage\)/);
  assert.match(css, /grid-template-columns: repeat\(auto-fill, minmax\(180px, 1fr\)\)/);
  assert.match(css, /\.voople-group-now__participants \{ grid-template-columns: minmax\(0, 1fr\)/);
});
