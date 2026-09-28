import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("authenticated beta navigation never derives Voice from feed", () => {
  const nav = read("src/lib/constants/nav.ts");
  const mobile = nav.slice(nav.indexOf("export const MOBILE_NAV_ITEMS"), nav.indexOf("export const PUBLIC_NAV_ITEMS"));
  assert.match(mobile, /MAIN_NAV_ITEMS\[0\], label: "Войс", icon: AudioLines/);
  assert.match(nav, /href: "\/messages"/);
  assert.match(nav, /href: "\/search"/);
  assert.doesNotMatch(nav.slice(0, nav.indexOf("export const PROFILE_NAV_ITEM")), /href: "\/feed"|href: "\/events"|href: "\/explore"/);
  assert.doesNotMatch(mobile, /\/feed|\/explore/);
  const topBar = read("src/components/layout/AppTopBar.tsx");
  assert.match(topBar, /authenticated \? "\/messages" : "\/feed"/);
  const chatMobile = read("src/components/chat/ChatMobileNavigation.tsx");
  assert.match(chatMobile, /MAIN_NAV_ITEMS\.map/);
});

test("search is canonical while explore remains a query-preserving web alias", () => {
  const search = read("src/app/(main)/search/page.tsx");
  const alias = read("src/app/(main)/explore/page.tsx");
  const sidebar = read("src/components/layout/MessengerSidebarView.tsx");
  const view = read("src/components/explore/ExploreView.tsx");
  assert.match(search, /<UserSearch initialQuery=/);
  assert.match(alias, /redirect\(query \? `\/search\?q=\$\{encodeURIComponent\(query\)\}` : "\/search"\)/);
  assert.equal((sidebar.match(/href: "\/search"/g) ?? []).length, 2);
  assert.doesNotMatch(view, /SectionPageHeader|SectionHeaderGlow|ExploreSearchResults/);
  assert.match(view, /type="search"/);
  assert.match(view, /aria-label="Раздел поиска"/);
});

test("post composer is restricted to direct legacy feed, not beta profile", () => {
  const web = read("src/components/layout/MainShell.tsx");
  const desktop = read("desktop/src/shell/DesktopShell.tsx");
  assert.match(web, /const showFab = pathname === "\/feed"/);
  assert.match(desktop, /\{pathname === "\/feed" && \(/);
  assert.match(desktop, /if \(pathname !== "\/feed"\) return/);
  assert.match(desktop, /pathname === "\/search" \?/);
  assert.doesNotMatch(desktop, /navigate\("\/explore"\)/);
});

test("privacy wrappers use current names while deferred settings and hotkeys remain stored", () => {
  const web = read("src/components/settings/AppSettingsPage.tsx");
  const desktop = read("desktop/src/settings/DesktopSettings.tsx");
  const shared = read("src/components/settings/AppSettingsView.tsx");
  const hotkeys = read("src/components/settings/HotkeySettings.tsx");
  assert.match(web, /privacySettings=\{<WebPrivacySettings/);
  assert.match(desktop, /privacySettings=\{<DesktopPrivacySettings/);
  assert.match(shared, /activeSection === "privacy" \? privacySettings/);
  assert.match(shared, /hiddenActions=\{\["newPost"\]\}/);
  assert.match(hotkeys, /visibleHotkeys = hotkeys\.filter/);
  assert.match(read("src/components/social/UserPrivacySettingsPanel.tsx"), /запросы в друзья и новые личные диалоги/);
});
