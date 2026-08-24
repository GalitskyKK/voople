import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("web and desktop home use one responsive feed layout", () => {
  const web = read("src/app/(main)/feed/page.tsx");
  const webController = read("src/components/home/HomeOverviewPanels.tsx");
  const desktop = read("desktop/src/adapters/DesktopFeedAdapter.tsx");
  const shell = read("desktop/src/shell/DesktopShell.tsx");
  const layout = read("src/components/home/HomeFeedLayoutView.tsx");
  const view = read("src/components/home/HomeOverviewPanelsView.tsx");
  const data = read("src/server/data/home-overview-rest.ts");
  const webChat = read("src/components/chat/ChatWindow.tsx");
  const desktopComposer = read("desktop/src/adapters/DesktopChatComposerAdapter.tsx");

  assert.match(web, /HomeFeedLayoutView/);
  assert.match(desktop, /HomeFeedLayoutView/);
  assert.match(layout, /xl:grid-cols-\[minmax\(0,2fr\)_minmax\(17rem,0\.85fr\)\]/);
  assert.doesNotMatch(desktop, /xl:grid-cols/);
  assert.match(webController, /chat\.openDirect/);
  assert.match(desktop, /chat\.openDirect/);
  assert.doesNotMatch(view, /trpc|createDesktopTrpcClient/);
  assert.match(data, /listSharedGroupPeopleRest/);
  assert.match(webChat, /useChatConversationAttention/);
  assert.match(desktopComposer, /useLocalChatDraft/);
  assert.match(desktopComposer, /ChatComposerFormView/);
  assert.match(desktopComposer, /ChatComposerPreviewView/);
  assert.match(view, /selectContinueWithLocalAttention/);
  const renderedHeader = shell.indexOf('{pathname === "/feed" ? <FeedHeaderVisual');
  assert.ok(renderedHeader > 0);
  assert.ok(renderedHeader < shell.indexOf('<div className="desktop-shell-scroll'));
});

test("web and desktop chat composer share one presentation layer", () => {
  const web = read("src/components/chat/ChatComposer.tsx");
  const desktop = read("desktop/src/adapters/DesktopChatComposerAdapter.tsx");
  const form = read("src/components/chat/ChatComposerFormView.tsx");
  const preview = read("src/components/chat/ChatComposerPreviewView.tsx");
  const baseline = JSON.parse(read(".architecture-baseline.json"));

  assert.match(web, /ChatComposerFormView/);
  assert.match(web, /ChatComposerPreviewView/);
  assert.match(desktop, /ChatComposerFormView/);
  assert.match(desktop, /ChatComposerPreviewView/);
  assert.match(form, /ChatComposerInputView/);
  assert.match(preview, /editableAudioMetadata/);
  assert.equal(
    baseline.desktopPortableUi.some((file) => file.includes("ChatComposer")),
    false,
  );
});

test("portable desktop UI baseline is empty and migrated domains use shared views", () => {
  const baseline = JSON.parse(read(".architecture-baseline.json"));
  const webThread = read("src/components/chat/ChatWindow.tsx");
  const desktopThread = read("desktop/src/adapters/DesktopChatThreadAdapter.tsx");
  const desktopMessages = read("desktop/src/adapters/DesktopMessagesAdapter.tsx");
  const desktopCreate = read("desktop/src/adapters/DesktopCreatePostAdapter.tsx");
  const desktopComments = read("desktop/src/adapters/DesktopPostCommentsAdapter.tsx");
  const desktopDetail = read("desktop/src/adapters/DesktopPostDetailAdapter.tsx");
  const desktopExplore = read("desktop/src/adapters/DesktopExploreAdapter.tsx");
  const desktopGroup = read("desktop/src/adapters/DesktopGroupManagementAdapter.tsx");
  const architectureGate = read("scripts/check-architecture.mjs");

  assert.deepEqual(baseline.desktopPortableUi, []);
  assert.match(webThread, /ChatThreadFrameView/);
  assert.match(desktopThread, /ChatThreadFrameView/);
  assert.match(desktopMessages, /MessagesLayoutView/);
  assert.match(desktopCreate, /CreatePostDialogView/);
  assert.match(desktopComments, /PostCommentsView/);
  assert.match(desktopComments, /MediaUploadDropzoneView/);
  assert.match(desktopDetail, /PostDetailViewVisual/);
  assert.match(desktopExplore, /ExploreView/);
  assert.match(desktopGroup, /GroupManagementSheetView/);
  assert.match(architectureGate, /desktopPortableUi must remain empty/);
});

test("home live state is sticky and Group Info exposes one settings action", () => {
  const home = read("src/components/home/HomeOverviewPanelsView.tsx");
  const groupInfo = read("src/components/chat/GroupInfoDrawerView.tsx");

  assert.match(home, /lg:sticky lg:top-4 lg:z-20/);
  assert.match(home, /max-h-\[calc\(100dvh-7rem\)\] overflow-y-auto/);
  assert.equal(groupInfo.match(/onClick=\{onManage\}/g)?.length, 1);
});

test("search title, query and scopes share one sticky stack", () => {
  const explore = read("src/components/explore/ExploreView.tsx");
  const stickyStack = read("src/components/layout/SectionStickyHeaderStack.tsx");

  const stackStart = explore.indexOf("<SectionStickyHeaderStack>");
  const stackEnd = explore.indexOf("</SectionStickyHeaderStack>");
  assert.ok(stackStart > 0);
  assert.ok(stackEnd > stackStart);
  const contents = explore.slice(stackStart, stackEnd);
  assert.match(contents, /SectionPageHeader/);
  assert.match(contents, /type="search"/);
  assert.match(contents, /aria-label="Раздел поиска"/);
  assert.match(stickyStack, /sticky top-14/);
  assert.match(stickyStack, /lg:top-4/);
});
