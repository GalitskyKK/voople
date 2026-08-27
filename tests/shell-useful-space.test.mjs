import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  COMPACT_SIDEBAR_WIDTH,
  EXPANDED_SIDEBAR_WIDTH,
  resolveSidebarCollapsed,
} from "../src/lib/layout/sidebar-preference.ts";

const read = (path) => readFileSync(path, "utf8");

test("compact navigation is the safe default and only an explicit preference pins expansion", () => {
  assert.equal(COMPACT_SIDEBAR_WIDTH, "72px");
  assert.equal(EXPANDED_SIDEBAR_WIDTH, "216px");
  assert.equal(resolveSidebarCollapsed(null), true);
  assert.equal(resolveSidebarCollapsed("true"), true);
  assert.equal(resolveSidebarCollapsed("false"), false);
  assert.equal(resolveSidebarCollapsed("invalid"), true);
});

test("web and desktop share pinned compact state, account menu and item tooltips", () => {
  const web = read("src/components/layout/DesktopSidebar.tsx");
  const desktop = read("desktop/src/shell/DesktopShell.tsx");
  const sidebar = read("src/components/layout/AppNavigationVisual.tsx");
  const accountMenu = read("src/components/layout/AccountMenuVisual.tsx");
  const mobileTopBar = read("src/components/layout/AppTopBar.tsx");
  const tooltip = read("src/components/layout/SidebarItemTooltip.tsx");
  const tooltipPrimitive = read("src/components/ui/Tooltip.tsx");
  const navigation = read("src/lib/constants/nav.ts");
  const globals = read("src/app/globals.css");
  const desktopStyles = read("desktop/src/styles.css");

  assert.match(web, /useSidebarPreference/);
  assert.match(desktop, /useSidebarPreference/);
  assert.match(web, /AppAccountMenu/);
  assert.match(desktop, /AccountMenuVisual/);
  assert.match(accountMenu, /role="menuitem"/);
  assert.match(accountMenu, /onOpenSettings/);
  assert.match(accountMenu, /onOpenHelp/);
  assert.match(accountMenu, /onLogout/);
  assert.match(sidebar, /collapsed = true/);
  assert.match(sidebar, /SidebarItemTooltip/);
  assert.match(tooltip, /components\/ui\/Tooltip/);
  assert.match(tooltipPrimitive, /createPortal/);
  assert.match(tooltipPrimitive, /role="tooltip"/);
  assert.match(globals, /\.voople-sidebar:is\(:hover, :focus-within\) \.voople-sidebar__collapse/);
  assert.doesNotMatch(globals, /data-collapsed="true"\]:is\(:hover, :focus-within\)[\s\S]{0,120}width: 216px/);
  assert.match(navigation, /href: "\/help"/);
  assert.doesNotMatch(navigation, /href: "\/settings"/);
  assert.doesNotMatch(navigation, /href: "\/login"/);
  assert.doesNotMatch(mobileTopBar, /href="\/explore"/);
  assert.doesNotMatch(desktopStyles, /\.voople-sidebar button \{[\s\S]{0,80}background: transparent/);
});

test("content columns are governed by available shell width", () => {
  const messages = read("src/components/chat/MessagesLayoutView.tsx");
  const homeLayout = read("src/components/home/HomeFeedLayoutView.tsx");
  const homeView = read("src/components/home/HomeOverviewPanelsView.tsx");
  const globals = read("src/app/globals.css");

  assert.match(messages, /clamp\(17\.5rem,24vw,20rem\)/);
  assert.match(homeLayout, /voople-feed-page-container/);
  assert.match(homeView, /voople-home-secondary-rail/);
  assert.match(globals, /container-type: inline-size/);
  assert.match(globals, /@container \(min-width: 64rem\)/);
});
