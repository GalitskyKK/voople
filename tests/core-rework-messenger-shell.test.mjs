import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("authenticated routes keep the shared messenger sidebar mounted", () => {
  const webSidebar = source("src/components/layout/DesktopSidebar.tsx");
  const desktopSidebar = source(
    "desktop/src/adapters/DesktopAppSidebarAdapter.tsx",
  );

  for (const implementation of [webSidebar, desktopSidebar]) {
    assert.match(implementation, /const messengerShell = (authenticated|true)/);
    assert.match(implementation, /primaryNavigation=/);
    assert.match(implementation, /MessengerSidebar/);
  }
});

test("messenger sidebar follows the rework information hierarchy", () => {
  const view = source("src/components/layout/MessengerSidebarView.tsx");
  const rows = source("src/components/layout/MessengerSidebarRows.tsx");

  assert.match(view, /title="Группы"/);
  assert.match(view, /title="Личные"/);
  assert.match(view, /href: "\/search"/);
  assert.match(view, /aria-expanded=\{expanded\}/);
  assert.match(view, /label: "Новый диалог"/);
  assert.match(view, /voople:messenger-sidebar:\$\{id\}:expanded/);
  assert.match(view, /window\.localStorage\.setItem\(storageKey, String\(expanded\)\)/);
  assert.doesNotMatch(view, /Главная|События|Магазин/);
  assert.match(rows, /shape="square"/);
  assert.match(rows, /text-emerald-400/);
  assert.match(rows, /roomCountLabel\(live\.roomCount\)/);
});

test("messenger identity microtype stays restrained and host-shared", () => {
  const layout = source("src/app/layout.tsx");
  const navigation = source("src/components/layout/AppNavigationVisual.tsx");
  const topBar = source("src/components/layout/AppTopBar.tsx");
  const profileAvatar = source("src/components/profile/ProfileAvatarVisual.tsx");
  const groupAvatar = source("src/components/chat/GroupAvatar.tsx");
  const badge = source("src/components/chat/ChatUnreadBadge.tsx");
  const styles = source("src/app/globals.css");
  const desktopStyles = source("desktop/src/styles.css");

  assert.match(layout, /GeistPixelSquare/);
  assert.match(navigation, /COPY\.wordmark/);
  assert.match(topBar, /COPY\.wordmark/);
  assert.match(profileAvatar, /voople-avatar-token__glyph/);
  assert.doesNotMatch(profileAvatar, /bg-gradient-to-br/);
  assert.match(groupAvatar, /voople-avatar-token__glyph/);
  assert.match(badge, /voople-counter/);
  assert.match(styles, /--font-voople-pixel/);
  assert.match(styles, /\.voople-wordmark,[\s\S]*?\.voople-avatar-token__glyph,[\s\S]*?\.voople-counter/);
  assert.match(desktopStyles, /Geist Pixel Square Voople/);
});

test("web and desktop share chat data and presentation without duplicate desktop polling", () => {
  const provider = source("desktop/src/chat/useDesktopChats.ts");
  const authenticatedApp = source("desktop/src/DesktopAuthenticatedApp.tsx");
  const desktopMessages = source(
    "desktop/src/adapters/DesktopMessagesAdapter.tsx",
  );
  const desktopSidebar = source(
    "desktop/src/adapters/DesktopMessengerSidebarAdapter.tsx",
  );

  assert.match(authenticatedApp, /DesktopChatsProvider/);
  assert.match(provider, /createContext<DesktopChatsContextValue/);
  assert.match(desktopMessages, /useDesktopChats\(\)/);
  assert.match(desktopSidebar, /useDesktopChats\(\)/);
  assert.match(desktopSidebar, /MessengerSidebarView/);
});

test("messages shell geometry is dense and route-scoped", () => {
  const css = source("src/app/globals.css");
  const layout = source("src/components/chat/MessagesLayoutView.tsx");

  assert.match(
    css,
    /\.voople-shell\[data-route-kind="messages"\][\s\S]*--voople-sidebar-width: 200px/,
  );
  assert.match(css, /@media \(min-width: 1200px\)[\s\S]*--voople-sidebar-width: 216px/);
  assert.match(css, /border-radius: 4px/);
  assert.match(css, /\.voople-messenger-sidebar__row--active \{[\s\S]*?background: color-mix/);
  assert.doesNotMatch(css, /\.voople-messenger-sidebar__row--active \{[\s\S]{0,260}?linear-gradient/);
  assert.match(layout, /data-thread=/);
});
