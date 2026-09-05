import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../", import.meta.url)).replaceAll("\\", "/").replace(/\/$/, "");
const distRoot = path.resolve(process.argv[2] ?? path.join(repo, "desktop/dist"));
const artifacts = await mkdtemp(path.join(os.tmpdir(), "voople-user-blocking-"));
console.log(`Screenshots: ${artifacts}`);

const require = createRequire(`${repo}/package.json`);
const { build } = require("esbuild");
const { chromium } = require("playwright");

const mockTrpc = `import {useState} from 'react';
  let updateBlockState=()=>{};
  export const trpc={
    useUtils:()=>({
      social:{blockState:{setData:(_input,value)=>updateBlockState(value.blockedByMe)},myPinnedContacts:{invalidate:async()=>{}}},
      profile:{getFollowState:{invalidate:async()=>{}}},feed:{getPage:{invalidate:async()=>{}}}
    }),
    social:{
      blockState:{useQuery:()=>{const [blocked,setBlocked]=useState(window.initialBlocked);updateBlockState=setBlocked;return {data:{blockedByMe:blocked},isLoading:false}}},
      setUserBlock:{useMutation:(options)=>({isPending:false,error:window.blockError?{message:window.blockError}:null,mutate:(input)=>options.onSuccess({blocked:input.blocked})})}
    }
  };`;
const mockAuth = `export function useAuthGate(){return {authenticated:true,requireAuth:()=>true}};`;
const mockActions = `export function ProfileFollowButton(){return <button type="button" className="inline-flex h-8 items-center rounded-lg bg-[var(--theme-accent)] px-3 text-sm font-medium text-white">Подписаться</button>}
  export function ProfileMessageButton(){return <button type="button" aria-label="Написать сообщение" className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--app-border)]">✉</button>}
  export function ProfileMessageAction(){return <button type="button" aria-label="Написать сообщение" className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--app-border)]">✉</button>}`;
const entry = `import {StrictMode} from 'react';import {createRoot} from 'react-dom/client';
  import {AppThemeProvider,useAppTheme} from '@/components/theme/AppThemeProvider';
  import {ProfileRelationshipActions} from '@/components/profile/ProfileRelationshipActions';
  function ThemeControl(){const theme=useAppTheme();window.changeTheme=theme.setThemeId;return null}
  function Demo(){return <main className="min-h-screen bg-[var(--background)] p-4 text-[var(--foreground)]"><section className="mx-auto mt-20 max-w-xl rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4"><p className="mb-3 text-sm text-[var(--app-muted)]">Профиль @friend</p><div className="flex flex-wrap items-end gap-2"><ProfileRelationshipActions userId="00000000-0000-4000-8000-000000000001" username="friend" canFollow/></div></section></main>}
  createRoot(document.getElementById('root')).render(<StrictMode><AppThemeProvider><ThemeControl/><Demo/></AppThemeProvider></StrictMode>);`;
const bundle = await build({
  stdin: { contents: entry, resolveDir: repo, loader: "tsx" },
  bundle: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  alias: { "@": `${repo}/src` },
  define: { "process.env.NODE_ENV": '"development"' },
  plugins: [{
    name: "blocking-mocks",
    setup(builder) {
      builder.onResolve({ filter: /^@\/lib\/trpc\/client$/ }, () => ({ path: "trpc", namespace: "mock" }));
      builder.onResolve({ filter: /^@\/components\/auth\/AuthGateContext$/ }, () => ({ path: "auth", namespace: "mock" }));
      builder.onResolve({ filter: /ProfileFollowButton$/ }, () => ({ path: "actions", namespace: "mock" }));
      builder.onResolve({ filter: /ProfileMessageButton$/ }, () => ({ path: "actions", namespace: "mock" }));
      builder.onResolve({ filter: /ProfileMessageAction$/ }, () => ({ path: "actions", namespace: "mock" }));
      builder.onLoad({ filter: /^trpc$/, namespace: "mock" }, () => ({ contents: mockTrpc, loader: "tsx", resolveDir: repo }));
      builder.onLoad({ filter: /^auth$/, namespace: "mock" }, () => ({ contents: mockAuth, loader: "tsx", resolveDir: repo }));
      builder.onLoad({ filter: /^actions$/, namespace: "mock" }, () => ({ contents: mockActions, loader: "tsx", resolveDir: repo }));
    },
  }],
});

const cssFiles = (await readdir(path.join(distRoot, "assets"), { recursive: true }))
  .filter((file) => file.endsWith(".css"));
const css = (await Promise.all(cssFiles.map((file) => readFile(path.join(distRoot, "assets", file), "utf8"))))
  .join("\n");
const server = createServer((request, response) => {
  if (request.url === "/app.js") {
    response.setHeader("Content-Type", "text/javascript");
    response.end(bundle.outputFiles[0].text);
    return;
  }
  if (request.url === "/style.css") {
    response.setHeader("Content-Type", "text/css");
    response.end(css);
    return;
  }
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end('<!doctype html><html><head><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>');
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

let browser;
try {
  browser = await chromium.launch({ headless: true });
  for (const { width, height, theme } of [
    { width: 360, height: 800, theme: "void" },
    { width: 360, height: 800, theme: "light" },
    { width: 1440, height: 900, theme: "void" },
    { width: 1440, height: 900, theme: "light" },
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.addInitScript(() => {
      window.initialBlocked = false;
      window.blockError = null;
      window.confirm = () => true;
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(() => typeof window.changeTheme === "function");
    await page.evaluate((value) => window.changeTheme(value), theme);
    await page.waitForFunction((value) => document.documentElement.dataset.appTheme === value, theme);
    await page.getByRole("button", { name: "Действия с пользователем" }).click();
    const menu = page.getByRole("menu");
    await menu.waitFor();
    await page.waitForTimeout(200);
    const menuBox = await menu.boundingBox();
    assert.ok(menuBox && menuBox.x >= 0 && menuBox.x + menuBox.width <= width);
    await page.screenshot({ path: path.join(artifacts, `block-menu-${width}-${theme}.png`), fullPage: true });
    await page.getByRole("menuitem", { name: "Заблокировать" }).click();
    await page.getByRole("button", { name: "Разблокировать" }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(artifacts, `blocked-${width}-${theme}.png`), fullPage: true });
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px ${theme}: menu, blocked state, no overflow or page errors`);
    await page.close();
  }
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
