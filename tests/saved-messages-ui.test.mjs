import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("Saved Messages uses one shared web and desktop controller", () => {
  const route = read("src/app/(main)/messages/saved/page.tsx");
  const web = read("src/components/chat/SavedMessagesPage.tsx");
  const desktop = read("desktop/src/adapters/DesktopMessagesAdapter.tsx");

  assert.match(route, /SavedMessagesPage/);
  assert.match(web, /SavedMessagesController/);
  assert.match(desktop, /<SavedMessagesController/);
  assert.doesNotMatch(desktop, /savedMessages\.list\.query|client\.query\("savedMessages/);
});

test("Saved Messages exposes complete private loading and recovery states", () => {
  const controller = read("src/components/chat/SavedMessagesController.tsx");
  const view = read("src/components/chat/SavedMessagesView.tsx");
  const state = read("src/components/chat/ChatConversationState.tsx");
  const savedState = read("src/components/chat/SavedMessagesConnectionState.tsx");

  assert.match(controller, /savedMessages\.availability\.useQuery/);
  assert.match(controller, /savedMessages\.list\.useInfiniteQuery/);
  assert.match(controller, /getNextPageParam/);
  assert.match(view, /SavedMessagesConnectionState/);
  assert.match(savedState, /ChatConversationState mode="offline"/);
  assert.match(state, /Черновик останется на месте/);
  assert.match(view, /messages\.length === 0/);
  assert.match(view, /SavedMessagesEmptyState/);
  assert.match(view, /Показать более ранние/);
  assert.match(view, /Повторить/);
  assert.match(view, /onReply/);
  assert.match(view, /onEdit/);
  assert.match(view, /onDelete/);
  assert.match(view, /uploadChatId=\{null\}/);
});

test("Saved Messages reconciles optimistic mutations and restores the cache on failure", () => {
  const controller = read("src/components/chat/SavedMessagesController.tsx");
  const view = read("src/components/chat/SavedMessagesView.tsx");

  assert.match(controller, /getInfiniteData\(listInput\)/);
  assert.match(controller, /setInfiniteData\(listInput/);
  assert.match(controller, /if \(previous\) utils\.savedMessages\.list\.setInfiniteData/);
  assert.match(controller, /item\.id === saved\.id \? saved : item/);
  assert.match(controller, /items: page\.items\.filter\(\(item\) => item\.id !== messageId\)/);
  assert.match(view, /buildOptimisticMessage/);
  assert.match(view, /await onCreate\(draft,/);
  assert.match(view, /clearDraft\(\);/);
});

test("Saved Messages shortcuts stay fail-closed on web and desktop", () => {
  const webSidebar = read("src/components/layout/MessengerSidebar.tsx");
  const desktopSidebar = read("desktop/src/adapters/DesktopMessengerSidebarAdapter.tsx");
  const inbox = read("src/components/chat/ChatList.tsx");

  for (const source of [webSidebar, desktopSidebar, inbox]) {
    assert.match(source, /savedMessages\.availability\.useQuery/);
    assert.match(source, /data\?\.enabled/);
  }
});
