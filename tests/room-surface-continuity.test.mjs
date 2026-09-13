import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  resolveVoiceRoomErrorTitle,
  resolveVoiceRoomSurfacePhase,
  waitForVoiceRoomLifecycle,
} from "../src/components/chat/voice/voice-room-surface.ts";
import {
  clampRoomChatPanelWidth,
  ROOM_CHAT_PANEL_DEFAULT_WIDTH,
} from "../src/components/chat/voice/room-chat-panel-width.ts";

const read = (path) => readFileSync(path, "utf8");

test("room surface phase keeps explicit transitions ahead of stale server state", () => {
  assert.equal(resolveVoiceRoomSurfacePhase({ transition: "connecting", loading: false, inside: false, mediaStatus: "idle", hasError: false }), "connecting");
  assert.equal(resolveVoiceRoomSurfacePhase({ transition: "leaving", loading: false, inside: true, mediaStatus: "connected", hasError: false }), "leaving");
  assert.equal(resolveVoiceRoomSurfacePhase({ transition: "post-leave", loading: false, inside: false, mediaStatus: "idle", hasError: false }), "post-leave");
  assert.equal(resolveVoiceRoomSurfacePhase({ transition: null, loading: true, inside: false, mediaStatus: "idle", hasError: false }), "loading");
  assert.equal(resolveVoiceRoomSurfacePhase({ transition: null, loading: false, inside: true, mediaStatus: "reconnecting", hasError: false }), "reconnecting");
  assert.equal(resolveVoiceRoomSurfacePhase({ transition: null, loading: false, inside: true, mediaStatus: "connected", hasError: true }), "inside");
  assert.equal(resolveVoiceRoomSurfacePhase({ transition: null, loading: false, inside: true, mediaStatus: "idle", hasError: false }), "connecting");
  assert.equal(resolveVoiceRoomSurfacePhase({ transition: null, loading: false, inside: false, mediaStatus: "error", hasError: true }), "error");
  assert.equal(resolveVoiceRoomSurfacePhase({ transition: null, loading: false, inside: false, mediaStatus: "idle", hasError: false }), "preview");
});

test("prejoin, connecting and active room reuse one stable main-area geometry", () => {
  const surface = read("src/components/chat/voice/VoiceRoomMainSurface.tsx");
  const header = read("src/components/chat/voice/VoiceRoomHeader.tsx");
  const content = read("src/components/chat/voice/VoiceRoomContent.tsx");
  const control = read("src/components/chat/voice/useChatRoomControl.ts");
  const surfaceSession = read("src/components/chat/voice/useVoiceRoomSurfaceSession.ts");

  assert.match(surface, /voople-full-room h-full min-h-0 w-full/);
  assert.doesNotMatch(surface, /identity\.active\s*\?/);
  assert.doesNotMatch(header, /identity\.active\s*\?\s*\([\s\S]{0,240}onToggleFullscreen/);
  assert.match(surface, /session=\{session\}/);
  assert.match(content, /sessionPhase === "connecting"/);
  assert.match(content, /sessionPhase === "leaving"/);
  assert.match(content, /sessionPhase === "loading"/);
  assert.match(content, /sessionPhase === "post-leave"/);
  assert.match(content, /sessionPhase === "preview" && identity\.active/);
  assert.ok(content.indexOf('sessionPhase === "post-leave"') < content.indexOf("if (directCallState)"));
  assert.match(surfaceSession, /setTransition\("connecting"\)/);
  assert.match(surfaceSession, /setTransition\("leaving"\)/);
  assert.match(surfaceSession, /setTransition\("post-leave"\)/);
  assert.match(surfaceSession, /await server\.room\.refetch\(\)/);
  assert.match(control, /server\.room\.error\?\.message/);
});

test("room errors name the failed operation instead of using generic copy", () => {
  assert.equal(resolveVoiceRoomErrorTitle("Повторить выход"), "Не удалось выйти из комнаты");
  assert.equal(resolveVoiceRoomErrorTitle("Повторить загрузку"), "Не удалось загрузить комнату");
  assert.equal(resolveVoiceRoomErrorTitle("Повторить подключение"), "Не удалось подключиться к комнате");
});

test("Group Chat drawer width stays inside the product bounds", () => {
  assert.equal(ROOM_CHAT_PANEL_DEFAULT_WIDTH, 360);
  assert.equal(clampRoomChatPanelWidth(240), 320);
  assert.equal(clampRoomChatPanelWidth(404.4), 404);
  assert.equal(clampRoomChatPanelWidth(600), 480);
});

test("full Room replaces main content and minimizes without ending its session", () => {
  const shell = read("src/components/layout/AppShellFrame.tsx");
  const surface = read("src/components/chat/voice/VoiceRoomMainSurface.tsx");
  const view = read("src/components/chat/voice/ChatRoomControlView.tsx");
  const header = read("src/components/chat/voice/VoiceRoomHeader.tsx");
  const control = read("src/components/chat/voice/useChatRoomControl.ts");
  const provider = read("src/components/chat/voice/VoiceSessionProvider.tsx");
  const webShell = read("src/components/layout/MainShell.tsx");
  const desktopShell = read("desktop/src/shell/DesktopShell.tsx");

  assert.match(shell, /data-voople-main-area=""/);
  assert.match(shell, /voople-shell__main relative/);
  assert.match(surface, /querySelector<HTMLElement>\("\[data-voople-main-area\]"\)/);
  assert.match(surface, /createPortal\(/);
  assert.match(surface, /data-voople-room-surface="full"/);
  assert.doesNotMatch(surface, /<Sheet\s+open=\{open\}/);
  assert.match(header, /label="Свернуть комнату"/);
  assert.match(view, /dock && !sheet\.overlay\.open/);
  assert.match(control, /minimize: closeRoom/);
  assert.doesNotMatch(control, /minimize:[\s\S]{0,120}leaveRoom/);
  assert.match(provider, /minimizePanel: \(\) => void/);
  assert.match(provider, /controlRef\.current\?\.minimize\(\)/);
  assert.match(webShell, /minimizeVoicePanel\?\.\(\)/);
  assert.match(desktopShell, /minimizeVoicePanel\(\)/);
});

test("full room uses one shared reference-aligned visual frame", () => {
  const surface = read("src/components/chat/voice/VoiceRoomMainSurface.tsx");
  const header = read("src/components/chat/voice/VoiceRoomHeader.tsx");
  const content = read("src/components/chat/voice/VoiceRoomContent.tsx");
  const stage = read("src/components/chat/voice/VoiceRoomStage.tsx");
  const media = read("src/components/chat/voice/VoiceMediaStage.tsx");
  const participant = read("src/components/chat/voice/VoiceParticipantCard.tsx");
  const empty = read("src/components/chat/voice/VoiceRoomEmptyState.tsx");
  const switcher = read("src/components/chat/voice/VoiceRoomSwitcher.tsx");
  const switchStatus = read("src/components/chat/voice/VoiceRoomSwitchStatus.tsx");
  const states = read("src/components/chat/voice/VoiceRoomSessionStates.tsx");
  const footer = read("src/components/chat/voice/VoiceRoomFooter.tsx");
  const styles = read("src/app/globals.css");

  assert.match(surface, /voople-full-room/);
  assert.match(header, /voople-full-room__header/);
  assert.match(header, /voople-full-room__title/);
  assert.match(header, /px-4 py-2/);
  assert.doesNotMatch(header, /pr-14/);
  assert.match(header, /text-\[var\(--foreground\)\] opacity-70/);
  assert.match(content, /voople-full-room__content/);
  assert.match(stage, /voople-full-room__stage/);
  assert.match(media, /voople-full-room__media/);
  assert.match(participant, /voople-full-room__participant/);
  assert.match(switcher, /aria-label="Комнаты группы"/);
  assert.match(switcher, /aria-current=\{current \? "true" : undefined\}/);
  assert.match(switcher, /aria-busy=\{pending \|\| undefined\}/);
  assert.match(surface, /roomSwitcher \? <VoiceRoomSwitcher/);
  assert.match(surface, /pendingRoom \? <VoiceRoomSwitchStatus roomName=\{pendingRoom\.name\}/);
  assert.match(switchStatus, /role="status"/);
  assert.match(switchStatus, /aria-live="polite"/);
  assert.match(switchStatus, /motion-reduce:animate-none/);
  assert.match(footer, /voople-full-room__footer/);
  assert.match(styles, /\.voople-full-room\s*\{/);
  assert.match(styles, /\.voople-full-room__header \{[\s\S]*?min-height: 3\.5rem;/);
  assert.match(styles, /\.voople-full-room__switcher \{[\s\S]*?width: 10rem;[\s\S]*?min-width: 10rem;/);
  assert.doesNotMatch(participant, /shadow-\[0_0_0_2px/);
  assert.match(content, /sessionPhase === "reconnecting"/);
  assert.match(content, /role="status" aria-live="polite"/);
  assert.doesNotMatch(content, /blur-xl|animate-pulse/);
  assert.doesNotMatch(states, /rounded-3xl/);
  assert.match(stage, /auto-rows-fr/);
  assert.match(stage, /grid-rows-\[minmax\(0,1fr\)_5rem\]/);
  assert.match(stage, /grid-flow-col auto-cols-\[minmax\(7rem,10rem\)\]/);
  assert.match(participant, /compact \? "min-h-20 gap-1 px-2 py-2"/);
  assert.match(participant, /size=\{compact \? "sm" : "lg"\}/);
  assert.match(media, /"min-h-20 border-\[var\(--app-border\)\]"/);
  assert.match(participant, /color-mix\(in_srgb,var\(--app-border\)_65%,var\(--app-muted\)\)/);
  assert.match(empty, /voople-full-room__solo/);
  assert.match(empty, /sm:grid-cols-\[minmax\(0,1fr\)_minmax\(13rem,0\.55fr\)\]/);
  assert.doesNotMatch(empty, /rounded-3xl|linear-gradient/);
});

test("full Room gives its identity a dedicated mobile row without hiding actions", () => {
  const header = read("src/components/chat/voice/VoiceRoomHeader.tsx");
  const styles = read("src/app/globals.css");

  assert.match(
    styles,
    /@media \(max-width: 639px\)[\s\S]*?\.voople-full-room__header \{[\s\S]*?flex-direction: column;[\s\S]*?align-items: stretch;/,
  );
  assert.match(
    styles,
    /\.voople-full-room__header-actions \{[\s\S]*?align-self: flex-end;/,
  );
  assert.match(
    styles,
    /@media \(max-width: 639px\)[\s\S]*?\.voople-full-room__switcher \{[\s\S]*?display: none;/,
  );
  assert.doesNotMatch(header, /hidden.*voople-full-room__header-actions/);
});

test("Full Room adapts the Group Chat drawer without collapsing the media stage", () => {
  const surface = read("src/components/chat/voice/VoiceRoomMainSurface.tsx");
  const header = read("src/components/chat/voice/VoiceRoomHeader.tsx");
  const panel = read("src/components/chat/voice/RoomMessagesPanel.tsx");
  const width = read("src/components/chat/voice/useRoomChatPanelWidth.ts");
  const styles = read("src/app/globals.css");

  assert.match(surface, /data-chat-open=\{secondaryPanel === "messages" \? "true" : "false"\}/);
  assert.match(surface, /current === "messages" \? current : null/);
  assert.match(header, /voople-full-room__room-selector/);
  assert.match(header, /roomSwitcher\.onSelect\(room\)/);
  assert.match(panel, /voople-room-chat-panel__resize/);
  assert.match(width, /ArrowLeft/);
  assert.match(width, /ArrowRight/);
  assert.match(styles, /max-width: 40cqw/);
  assert.match(styles, /@container \(max-width: 999px\)[\s\S]*?\.voople-room-chat-panel \{[\s\S]*?position: absolute;[\s\S]*?width: 100%;/);
  assert.match(styles, /@container \(max-width: 799px\)[\s\S]*?\.voople-full-room__switcher \{[\s\S]*?display: none;/);
});

test("desktop conversation and Room drawer share the authenticated tRPC cache", () => {
  const desktopThread = read("desktop/src/chat/useDesktopChatThread.ts");
  const desktopRealtime = read("desktop/src/chat/useDesktopChatRealtime.ts");
  const desktopComposer = read("desktop/src/adapters/DesktopChatComposerAdapter.tsx");
  const roomMessages = read("src/components/chat/voice/RoomMessagesPanel.tsx");

  assert.match(desktopThread, /trpc\.chat\.observeMessages\.useQuery/);
  assert.match(desktopThread, /utils\.chat\.observeMessages\.setData/);
  assert.doesNotMatch(desktopThread, /createDesktopTrpcClient|useState<DesktopChatThreadData/);
  assert.match(desktopRealtime, /utils\.chat\.observeMessages\.invalidate/);
  assert.match(roomMessages, /trpc\.chat\.observeMessages\.useQuery/);
  assert.match(roomMessages, /useChatComposerSession\(model\.chatId\)/);
  assert.match(desktopComposer, /pendingTrack/);
  assert.match(desktopComposer, /ChatMusicAttachSheet/);
  assert.match(desktopThread, /sharedTrackId: draft\.pendingTrack\?\.id/);
});

test("room recovery is bounded, actionable and restores dialog focus", async () => {
  const states = read("src/components/chat/voice/VoiceRoomSessionStates.tsx");
  const surfaceSession = read("src/components/chat/voice/useVoiceRoomSurfaceSession.ts");
  const sheet = read("src/components/ui/Sheet.tsx");
  const styles = read("src/app/globals.css");

  await assert.rejects(
    waitForVoiceRoomLifecycle(new Promise(() => undefined), 5),
    /Не удалось подтвердить изменение комнаты вовремя/,
  );
  assert.equal(await waitForVoiceRoomLifecycle(Promise.resolve("ok"), 50), "ok");
  assert.match(states, /retryLabel/);
  assert.match(states, /Вы вышли из комнаты/);
  assert.match(surfaceSession, /setFailedOperation\("leave"\)/);
  const control = read("src/components/chat/voice/useChatRoomControl.ts");
  assert.match(control, /failedSessionOperation === "leave"/);
  assert.match(control, /roomLoadFailed[\s\S]*"Повторить загрузку"/);
  assert.match(control, /hasError: Boolean\(surfaceErrorMessage\)/);
  assert.match(sheet, /returnTarget\.focus\(\{ preventScroll: true \}\)/);
  assert.match(sheet, /autoFocus/);
  assert.match(styles, /@media \(prefers-reduced-motion: no-preference\)[\s\S]*\.voople-room-surface__state/);
});
