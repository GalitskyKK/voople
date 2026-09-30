import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("Desktop authenticated messenger sidebar hides its brand on Settings and Messages", async () => {
  const styles = await readFile(new URL("../desktop/src/styles.css", import.meta.url), "utf8");
  const shell = await readFile(new URL("../desktop/src/shell/DesktopShell.tsx", import.meta.url), "utf8");
  const sidebar = await readFile(new URL("../desktop/src/adapters/DesktopAppSidebarAdapter.tsx", import.meta.url), "utf8");
  assert.match(shell, /navigationKind="messenger"/);
  assert.match(shell, /pathname === "\/settings"/);
  assert.match(sidebar, /<AppSidebarVisual/);
  assert.match(styles, /\.desktop-window-content \.voople-shell\[data-navigation-kind="messenger"\] \.voople-sidebar__brand\s*\{\s*display: none;/);
  assert.doesNotMatch(styles, /\.desktop-window-content \.voople-sidebar__brand\s*\{/);
  assert.match(styles, /\.desktop-window-content \.voople-shell\[data-route-kind="messages"\] \.voople-chat-list__panel-header/);
});
