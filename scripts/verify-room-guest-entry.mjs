import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../", import.meta.url)).replaceAll("\\", "/").replace(/\/$/, "");
const artifacts = await mkdtemp(path.join(os.tmpdir(), "voople-room-guest-"));
console.log(`Screenshots: ${artifacts}`);
const require = createRequire(`${repo}/package.json`);
const { build } = require("esbuild");
const { chromium } = require("playwright");

const mockHook = `import {useState} from 'react';
  const noop=async()=>{};
  export function useRoomGuestSession(){
    const [state,setState]=useState(window.initialGuestState);
    window.setGuestState=setState;
    return {...state,loadPreview:noop,join:async(name)=>{window.joinName=name},connect:noop,toggleMicrophone:noop,leave:noop};
  }`;
const entry = `import {StrictMode} from 'react';import {createRoot} from 'react-dom/client';
  import {RoomGuestPage} from '@/components/chat/RoomGuestPage';
  import {AppThemeProvider,useAppTheme} from '@/components/theme/AppThemeProvider';
  function ThemeControl(){const theme=useAppTheme();window.changeTheme=theme.setThemeId;return null}
  createRoot(document.getElementById('root')).render(<StrictMode><AppThemeProvider><ThemeControl/><RoomGuestPage token="${"a".repeat(43)}"/></AppThemeProvider></StrictMode>);`;
const bundle = await build({
  stdin: { contents: entry, resolveDir: repo, loader: "tsx" },
  bundle: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  alias: { "@": `${repo}/src` },
  define: { "process.env.NODE_ENV": '"development"' },
  plugins: [{
    name: "guest-hook",
    setup(builder) {
      builder.onResolve({ filter: /^@\/hooks\/useRoomGuestSession$/ }, () => ({ path: "guest-hook", namespace: "mock" }));
      builder.onLoad({ filter: /.*/, namespace: "mock" }, () => ({ contents: mockHook, loader: "tsx", resolveDir: repo }));
    },
  }],
});

const cssRoot = path.join(repo, "desktop/dist/assets");
const cssFiles = (await readdir(cssRoot, { recursive: true })).filter((file) => file.endsWith(".css"));
const css = (await Promise.all(cssFiles.map((file) => readFile(path.join(cssRoot, file), "utf8")))).join("\n");
const mark = await readFile(path.join(repo, "public/favicon/android-chrome-192x192.png"));
const server = createServer((request, response) => {
  if (request.url === "/app.js") {
    response.setHeader("Content-Type", "text/javascript");
    response.end(bundle.outputFiles[0].text);
  } else if (request.url === "/style.css") {
    response.setHeader("Content-Type", "text/css");
    response.end(css);
  } else if (request.url === "/favicon/android-chrome-192x192.png") {
    response.setHeader("Content-Type", "image/png");
    response.end(mark);
  } else {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end('<!doctype html><html><head><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/style.css"></head><body><main id="root"></main><script src="/app.js"></script></body></html>');
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

const preview = {
  available: true,
  reason: "active",
  groupName: "Сообщество дизайнеров",
  roomName: "Вечерний разбор интерфейсов",
  participantCount: 3,
  participants: [
    { id: "one", displayName: "Никита", avatarUrl: null, guest: false },
    { id: "two", displayName: "Саша", avatarUrl: null, guest: false },
    { id: "guest:three", displayName: "Маша", avatarUrl: null, guest: true },
  ],
  expiresAt: "2026-09-05T15:00:00.000Z",
};
const baseState = {
  preview,
  previewLoading: false,
  previewError: null,
  joined: null,
  mediaStatus: "idle",
  mediaError: null,
  micMuted: true,
  participantCount: 3,
  screenVisible: false,
};

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
    await page.addInitScript((state) => { window.initialGuestState = state; }, baseState);
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate((value) => window.changeTheme(value), theme);
    await page.waitForFunction((value) => document.documentElement.dataset.appTheme === value, theme);
    const joinButton = page.getByRole("button", { name: "Зайти гостем" });
    await joinButton.waitFor();
    await page.getByLabel("Ваше имя").fill("Гость");
    await page.waitForFunction(() => document.querySelector('button[type="submit"]')?.disabled === false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(artifacts, `guest-entry-${width}-${theme}.png`), fullPage: true });
    await joinButton.click();
    assert.equal(await page.evaluate(() => window.joinName), "Гость");

    await page.evaluate((state) => window.setGuestState(state), {
      ...baseState,
      joined: { guestId: "guest", sessionId: "session", displayName: "Гость", expiresAt: "2026-09-05T15:00:00.000Z" },
      mediaStatus: "connected",
      participantCount: 4,
    });
    await page.getByText("Вы в комнате как Гость", { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(artifacts, `guest-room-${width}-${theme}.png`), fullPage: true });
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px ${theme}: entry, keyboard form, joined Room, no overflow or page errors`);
    await page.close();
  }
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
