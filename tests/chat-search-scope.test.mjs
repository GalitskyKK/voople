import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const webAdapter = readFileSync(
  new URL("../src/components/chat/ChatList.tsx", import.meta.url),
  "utf8",
);
const desktopAdapter = readFileSync(
  new URL("../desktop/src/chat/DesktopMessages.tsx", import.meta.url),
  "utf8",
);
const sharedView = readFileSync(
  new URL("../src/components/chat/ChatListView.tsx", import.meta.url),
  "utf8",
);

test("chat search stays scoped to chats, groups and existing contacts", () => {
  for (const adapter of [webAdapter, desktopAdapter]) {
    assert.match(adapter, /chat\.contacts/);
    assert.doesNotMatch(adapter, /chat\.publicGroups/);
    assert.doesNotMatch(adapter, /user\.search/);
  }
  assert.doesNotMatch(sharedView, /ChatPublicGroupResults|usePublicGroupSearch/);
  assert.match(sharedView, /renderGlobalSearchAction/);
});
