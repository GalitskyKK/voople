import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadCurrentVisualCss } from "./lib/load-current-visual-css.mjs";
import { visualMessengerSidebarFixture } from "./lib/visual-messenger-sidebar.mjs";

const repo = fileURLToPath(new URL("../", import.meta.url)).replaceAll("\\", "/").replace(/\/$/, "");
const artifacts = await mkdtemp(path.join(os.tmpdir(), "voople-beta-search-visual-"));
const require = createRequire(`${repo}/package.json`);
const { build } = require("esbuild");
const { chromium } = require("playwright");

const entry = `import {createRoot} from 'react-dom/client';
  import {TRPCReactProvider} from '@/lib/trpc/client';
  import {AppThemeProvider} from '@/components/theme/AppThemeProvider';
  import {ExploreView} from '@/components/explore/ExploreView';
  import {AppShellFrame} from '@/components/layout/AppShellFrame';
  import {AppBottomNavigationVisual} from '@/components/layout/AppNavigationVisual';
  import {AppTopBar} from '@/components/layout/AppTopBar';
  const people=[{type:'user',id:'person-1',username:'astra',displayName:'Астра',bio:null,avatarUrl:null,online:true,commonGroups:{count:1,groups:[{id:'group-1',name:'DRG'}]},canMessage:true}];
  const groups=[{id:'group-1',name:'DRG',description:'Компания друзей',publicSlug:'drg',icon:null,avatarUrl:null,tag:'DRG',memberCount:8,joined:false,joinPolicy:'open',joinRequestPending:false}];
  const renderDestination=({href,className,children,label})=><a href={href} aria-label={label} className={className}>{children}</a>;
  const renderAvatar=(person)=><span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--material-border)] bg-[var(--material-raised-fill)] text-sm">{person.displayName[0]}</span>;
  ${visualMessengerSidebarFixture}
  function Demo(){return <AppShellFrame routeKind="standard" navigationKind="messenger" mainClassName="h-full min-h-0 overflow-hidden" sidebar={fixtureSidebar('/search')}><AppTopBar authenticated/><main className="voople-stage voople-scroll h-full overflow-y-auto px-4 sm:px-6"><ExploreView query="drg" debouncedQuery="drg" onQueryChange={()=>{}} result={{people}} communities={groups} searching={false} renderDestination={renderDestination} renderAvatar={renderAvatar} onNavigate={()=>{}}/></main><AppBottomNavigationVisual pathname="/search" renderDestination={renderDestination}/></AppShellFrame>}
  createRoot(document.getElementById('root')).render(<TRPCReactProvider><AppThemeProvider><Demo/></AppThemeProvider></TRPCReactProvider>);`;
const bundle = await build({
  stdin: { contents: entry, resolveDir: repo, loader: "tsx" },
  bundle: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  alias: { "@": `${repo}/src` },
  define: { "process.env": '{"NODE_ENV":"development"}' },
  plugins: [{
    name: "visual-action-stubs",
    setup(plugin) {
      plugin.onResolve({ filter: /^next\/(link|navigation)$/ }, (args) => ({ path: args.path, namespace: "visual-shell" }));
      plugin.onResolve({ filter: /\/(AppAccountMenu|NotificationNavBadge)$/ }, (args) => ({ path: args.path, namespace: "visual-shell" }));
      plugin.onLoad({ filter: /.*/, namespace: "visual-shell" }, (args) => ({
        contents: args.path === "next/link"
          ? 'export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>}'
          : args.path === "next/navigation"
            ? 'export function usePathname(){return "/search"}'
            : args.path.endsWith("AppAccountMenu")
              ? 'export function AppAccountMenu(){return <button type="button">Аккаунт</button>}'
              : 'export function NotificationNavBadge(){return null}',
        loader: "tsx",
        resolveDir: repo,
      }));
      plugin.onResolve({ filter: /Profile(Friend|Message)Action$/ }, (args) => ({ path: args.path, namespace: "visual-action" }));
      plugin.onLoad({ filter: /.*/, namespace: "visual-action" }, (args) => ({
        contents: args.path.endsWith("ProfileFriendAction")
          ? 'export function ProfileFriendAction(){return <button type="button" className="min-h-10 rounded-lg border border-[var(--material-border)] px-3 text-xs">Добавить</button>}'
          : 'export function ProfileMessageAction(){return <button type="button" className="min-h-10 rounded-lg border border-[var(--material-border)] px-3 text-xs">Сообщение</button>}',
        loader: "tsx",
        resolveDir: repo,
      }));
    },
  }],
});
const css = await loadCurrentVisualCss(repo, { host: "web" });
const brandIcon = await readFile(path.join(repo, "public/favicon/android-chrome-192x192.png"));
const server = createServer((request, response) => {
  if (request.url === "/app.js") { response.setHeader("Content-Type", "text/javascript"); response.end(bundle.outputFiles[0].text); return; }
  if (request.url === "/style.css") { response.setHeader("Content-Type", "text/css"); response.end(css); return; }
  if (request.url === "/favicon/android-chrome-192x192.png") { response.setHeader("Content-Type", "image/png"); response.end(brandIcon); return; }
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end('<!doctype html><html data-app-theme="void"><head><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>');
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

let browser;
try {
  browser = await chromium.launch({ headless: true });
  for (const { width, height, theme } of [
    { width: 1440, height: 800, theme: "void" },
    { width: 960, height: 800, theme: "void" },
    { width: 390, height: 844, theme: "void" },
    { width: 360, height: 800, theme: "void" },
    { width: 390, height: 844, theme: "light" },
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByRole("heading", { name: "Поиск", exact: true }).waitFor({ timeout: 5000 });
    if (theme === "light") await page.evaluate(() => { localStorage.setItem("voople:app-theme", "light"); });
    if (theme === "light") {
      await page.reload();
      await page.waitForFunction(() => document.documentElement.style.getPropertyValue("--foreground") === "#1B2938");
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const bounds = await page.getByRole("heading", { name: "Поиск", exact: true }).boundingBox();
    assert.ok(bounds && bounds.y < height, `Search heading is outside viewport at ${width}px: ${JSON.stringify(bounds)}`);
    assert.equal(await page.getByRole("heading", { name: "Люди" }).count(), 1);
    assert.equal(await page.getByRole("heading", { name: "Публичные группы" }).count(), 1);
    if (width < 900) {
      assert.equal(await page.getByRole("link", { name: "Войс" }).getAttribute("href"), "/messages");
      assert.equal(await page.getByRole("link", { name: "Поиск" }).getAttribute("href"), "/search");
      assert.equal(await page.getByRole("link", { name: "Профиль", exact: true }).getAttribute("href"), "/me");
      assert.equal(await page.locator(".voople-topbar a").first().getAttribute("href"), "/messages");
    }
    assert.deepEqual(errors, []);
    await page.screenshot({ path: path.join(artifacts, `search-${width}-${theme}.png`) });
    await page.close();
    console.log(`PASS search ${width}px ${theme}: result rows and no overflow`);
  }
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
console.log(`Screenshots: ${artifacts}`);
