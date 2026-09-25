import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadCurrentVisualCss } from "./lib/load-current-visual-css.mjs";

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
  const people=[{type:'user',id:'person-1',username:'astra',displayName:'Астра',bio:null,avatarUrl:null,online:true,commonGroups:{count:1,groups:[{id:'group-1',name:'DRG'}]},canMessage:true}];
  const groups=[{id:'group-1',name:'DRG',description:'Компания друзей',publicSlug:'drg',icon:null,avatarUrl:null,tag:'DRG',memberCount:8,joined:false,joinPolicy:'open',joinRequestPending:false}];
  const renderDestination=({href,className,children})=><a href={href} className={className}>{children}</a>;
  const renderAvatar=({author})=><span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--material-border)] bg-[var(--material-raised-fill)] text-sm">{author.displayName[0]}</span>;
  function Demo(){return <AppShellFrame routeKind="standard" navigationKind="messenger" mainClassName="h-full min-h-0 overflow-hidden" sidebar={<aside className="fixed left-0 top-0 hidden h-full w-48 flex-col border-r border-[var(--app-border)] p-4 text-sm lg:flex">VOOPLE</aside>}><main className="voople-scroll h-full overflow-y-auto px-4 sm:px-6"><ExploreView query="drg" debouncedQuery="drg" onQueryChange={()=>{}} result={{people}} communities={groups} searching={false} renderDestination={renderDestination} renderAvatar={renderAvatar} onNavigate={()=>{}}/></main></AppShellFrame>}
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
const server = createServer((request, response) => {
  if (request.url === "/app.js") { response.setHeader("Content-Type", "text/javascript"); response.end(bundle.outputFiles[0].text); return; }
  if (request.url === "/style.css") { response.setHeader("Content-Type", "text/css"); response.end(css); return; }
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
      await page.waitForFunction(() => document.documentElement.style.getPropertyValue("--foreground") === "#191921");
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const bounds = await page.getByRole("heading", { name: "Поиск", exact: true }).boundingBox();
    assert.ok(bounds && bounds.y < height, `Search heading is outside viewport at ${width}px: ${JSON.stringify(bounds)}`);
    assert.equal(await page.getByRole("heading", { name: "Люди" }).count(), 1);
    assert.equal(await page.getByRole("heading", { name: "Публичные группы" }).count(), 1);
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
