import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("messages routes replace the legacy primary nav with the shared messenger sidebar", () => {
  const webSidebar = source("src/components/layout/DesktopSidebar.tsx");
  const desktopSidebar = source(
    "desktop/src/adapters/DesktopAppSidebarAdapter.tsx",
  );

  for (const implementation of [webSidebar, desktopSidebar]) {
    assert.match(implementation, /pathname\.startsWith\("\/messages"\)/);
    assert.match(implementation, /primaryNavigation=/);
    assert.match(implementation, /MessengerSidebar/);
  }
});

test("messenger sidebar follows the rework information hierarchy", () => {
  const view = source("src/components/layout/MessengerSidebarView.tsx");
  const rows = source("src/components/layout/MessengerSidebarRows.tsx");

  assert.match(view, /title="Группы"/);
  assert.match(view, /title="Личные"/);
  assert.match(view, /href: "\/explore"/);
  assert.doesNotMatch(view, /Главная|События|Магазин/);
  assert.match(rows, /shape="square"/);
  assert.match(rows, /text-emerald-400/);
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
  assert.match(layout, /data-thread=/);
});
