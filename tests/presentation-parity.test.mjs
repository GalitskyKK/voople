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
  assert.match(layout, /voople-feed-page-container/);
  assert.match(layout, /voople-feed-page grid/);
  assert.match(view, /voople-home-secondary-rail/);
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
  assert.ok(renderedHeader < shell.indexOf('<div data-voople-scroll="" className="desktop-shell-scroll'));
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

  assert.match(home, /useScrollCompaction/);
  assert.match(home, /sticky top-\[var\(--voople-sticky-offset\)\]/);
  assert.match(home, /aria-expanded=\{!compact\}/);
  assert.match(home, /compact=\{compact\}/);
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
  assert.match(stickyStack, /sticky top-\[var\(--voople-sticky-offset\)\]/);
  assert.doesNotMatch(stickyStack, /linear-gradient/);
});

test("authenticated sticky chrome uses one offset without masking strips", () => {
  const globals = read("src/app/globals.css");
  const sectionHeader = read("src/components/layout/SectionPageHeader.tsx");
  const feedHeader = read("src/components/layout/FeedHeaderVisual.tsx");
  const shop = read("src/components/shop/ShopPageView.tsx");
  const desktopShell = read("desktop/src/shell/DesktopShell.tsx");

  assert.match(sectionHeader, /top-\[var\(--voople-sticky-offset\)\]/);
  assert.match(shop, /voople-sticky-section-header/);
  assert.match(desktopShell, /data-voople-scroll=""/);
  assert.match(globals, /\.voople-sticky-section-stack[\s\S]*background: var\(--background\)/);
  assert.doesNotMatch(globals, /0 -4rem 0 var\(--background\)/);
  assert.doesNotMatch(feedHeader, /linear-gradient|sticky top-0/);
});

test("public group presentation is shared by Next and desktop routes", () => {
  const sharedView = read("src/components/chat/PublicGroupPageView.tsx");
  const webController = read("src/components/chat/PublicGroupPage.tsx");
  const desktopAdapter = read("desktop/src/adapters/DesktopPublicGroupAdapter.tsx");
  const desktopShell = read("desktop/src/shell/DesktopShell.tsx");

  assert.match(sharedView, /export function PublicGroupPageView/);
  assert.match(webController, /<PublicGroupView/);
  assert.match(desktopAdapter, /<PublicGroupPageView/);
  assert.match(desktopAdapter, /chat\.publicGroupBySlug/);
  assert.match(desktopShell, /groupSlugFromPath/);
  assert.match(desktopShell, /<DesktopPublicGroup/);
});

test("Room invitation links use one protected preview on web and desktop", () => {
  const web = read("src/app/(main)/room-invites/[inviteId]/page.tsx");
  const shared = read("src/components/chat/voice/CoreRoomInvitePreviewView.tsx");
  const desktop = read("desktop/src/shell/DesktopShell.tsx");

  assert.match(web, /CoreRoomInvitePreviewView/);
  assert.match(shared, /coreRoomInvitePreview\.useQuery/);
  assert.match(desktop, /DesktopRoomInvitePreview/);
  assert.match(desktop, /roomInviteIdFromPath/);
});
