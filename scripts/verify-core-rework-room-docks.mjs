import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../", import.meta.url)).replaceAll("\\", "/").replace(/\/$/, "");
const distRoot = path.resolve(process.argv[2] ?? path.join(repo, "desktop/dist"));
const artifacts = await mkdtemp(path.join(os.tmpdir(), "voople-core-room-docks-"));
console.log(`Screenshots: ${artifacts}`);

const require = createRequire(`${repo}/package.json`);
const { build } = require("esbuild");
const { chromium } = require("playwright");

const entry = `import {createRoot} from 'react-dom/client';
  import {ConnectionQuality} from 'livekit-client';
  import {AppThemeProvider} from '@/components/theme/AppThemeProvider';
  import {VoiceSessionDock} from '@/components/chat/voice/VoiceSessionDock';
  import {VoiceMiniStage} from '@/components/chat/voice/VoiceMiniStage';
  const noop=()=>{};
  const participants=[
    {id:'nmggk',username:'nmggk',displayName:'nmggk',avatarUrl:null,avatarDecorationUrl:null,avatarRingId:null,micMuted:false,isMe:true},
    {id:'biba',username:'biba',displayName:'Biba',avatarUrl:null,avatarDecorationUrl:null,avatarRingId:null,micMuted:false,isMe:false},
  ];
  const bindScreen=(element)=>{if(!element||element.childNodes.length)return;const mock=document.createElement('div');mock.className='grid h-full w-full place-items-center bg-slate-950 text-center text-white/70';mock.innerHTML='<div><strong class="block text-sm text-white">Экран nmggk</strong><span class="mt-1 block text-[10px]">DEEP ROCK GALACTIC</span></div>';element.append(mock)};
  function Demo(){
    const media=new URLSearchParams(location.search).get('media')||'voice';
    const preview=<VoiceMiniStage screenContainerRef={bindScreen} screenShareOwner={media==='screen'?'nmggk':null} participants={participants} activeSpeakerIds={new Set(['biba'])} cameraParticipantIds={new Set()} onCameraContainerChange={noop} onOpen={noop}/>;
    return <main className="h-dvh overflow-hidden bg-[var(--background)]"><div className="mx-auto max-w-3xl px-5 pt-10"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">Чат остаётся доступен</p><h1 className="mt-3 text-2xl font-semibold">Разговор продолжается поверх приложения</h1><div className="mt-8 h-40 border-y border-[var(--app-border)]"/></div><VoiceSessionDock chatName="DRG" participantCount={2} activeSpeakerName="Biba" durationLabel="18:42" mediaStatus="connected" connectionLabel="Голос подключён" connectionQuality={ConnectionQuality.Excellent} micMuted={false} outputMuted={false} cameraEnabled={false} screenSharing={media==='screen'} mediaActionPending={false} leavePending={false} mediaPreview={preview} onOpen={noop} onToggleMic={noop} onToggleOutput={noop} onLeave={noop}/></main>
  }
  createRoot(document.getElementById('root')).render(<AppThemeProvider><Demo/></AppThemeProvider>);`;

const bundle = await build({
  stdin: { contents: entry, resolveDir: repo, loader: "tsx" },
  bundle: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  alias: { "@": `${repo}/src` },
  define: { "process.env.NODE_ENV": '"development"' },
});
const cssFiles = (await readdir(path.join(distRoot, "assets"), { recursive: true })).filter((file) => file.endsWith(".css"));
const css = (await Promise.all(cssFiles.map((file) => readFile(path.join(distRoot, "assets", file), "utf8")))).join("\n");
const server = createServer((request, response) => {
  if (request.url === "/app.js") { response.setHeader("Content-Type", "text/javascript"); response.end(bundle.outputFiles[0].text); return; }
  if (request.url === "/style.css") { response.setHeader("Content-Type", "text/css"); response.end(css); return; }
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end('<!doctype html><html><head><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>');
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

let browser;
try {
  browser = await chromium.launch({ headless: true });
  for (const { width, height, theme, mode, media } of [
    { width: 390, height: 800, theme: "light", mode: "mini", media: "voice" },
    { width: 390, height: 800, theme: "void", mode: "compact", media: "screen" },
    { width: 390, height: 800, theme: "light", mode: "minimal", media: "voice" },
    { width: 1280, height: 800, theme: "void", mode: "mini", media: "screen" },
    { width: 1280, height: 800, theme: "light", mode: "compact", media: "voice" },
    { width: 1280, height: 800, theme: "void", mode: "minimal", media: "screen" },
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.addInitScript(({ theme, mode }) => {
      window.localStorage.setItem("voople:app-theme", theme);
      window.localStorage.setItem("voople:voice-dock-mode:v1", mode);
      window.localStorage.removeItem("voople:voice-dock-geometry:v2");
    }, { theme, mode });
    await page.goto(`http://127.0.0.1:${server.address().port}?media=${media}`);
    const selector = mode === "mini" ? ".voople-voice-dock" : `.voople-voice-dock--${mode}`;
    await page.locator(selector).waitFor();
    assert.equal(await page.locator(selector).count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: path.join(artifacts, `dock-${width}-${theme}-${mode}-${media}.png`) });
    console.log(`PASS dock ${width}px ${theme} ${mode} ${media}: no overflow or runtime errors`);
    await page.close();
  }
} finally {
  await browser?.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
