import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../", import.meta.url)).replaceAll("\\", "/").replace(/\/$/, "");
const distRoot = path.resolve(process.argv[2] ?? path.join(repo, "desktop/dist"));
const artifacts = await mkdtemp(path.join(os.tmpdir(), "voople-core-room-surface-"));
console.log(`Screenshots: ${artifacts}`);

const require = createRequire(`${repo}/package.json`);
const { build } = require("esbuild");
const { chromium } = require("playwright");

const entry = `import {createRoot} from 'react-dom/client';
  import {ConnectionQuality} from 'livekit-client';
  import {AppThemeProvider} from '@/components/theme/AppThemeProvider';
  import {VoiceRoomHeader} from '@/components/chat/voice/VoiceRoomHeader';
  import {VoiceRoomStage} from '@/components/chat/voice/VoiceRoomStage';
  import {VoiceRoomFooter} from '@/components/chat/voice/VoiceRoomFooter';
  const noop=()=>{};
  const participants=[
    {id:'nmggk',username:'nmggk',displayName:'nmggk',avatarUrl:null,avatarDecorationUrl:null,avatarRingId:null,micMuted:false,isMe:true},
    {id:'biba',username:'biba',displayName:'Biba',avatarUrl:null,avatarDecorationUrl:null,avatarRingId:null,micMuted:false,isMe:false},
    {id:'anya',username:'anya',displayName:'Anya',avatarUrl:null,avatarDecorationUrl:null,avatarRingId:null,micMuted:true,isMe:false},
  ];
  const bindScreen=(element)=>{if(!element||element.childNodes.length)return;const mock=document.createElement('div');mock.className='grid h-full w-full place-items-center bg-[linear-gradient(145deg,#111827,#1f2937)] text-center text-white/70';mock.innerHTML='<div><strong class="block text-lg text-white">Экран nmggk</strong><span class="mt-2 block text-xs">DEEP ROCK GALACTIC</span></div>';element.append(mock)};
  function Demo(){
    const identity={isDirect:false,callPhase:'connected',chatName:'VOICEKK / DRG',active:true,durationLabel:'01:42'};
    const connection={label:'Голос подключён',status:'connected',quality:ConnectionQuality.Excellent,audioBlocked:false,errorMessage:null,onResumeAudio:noop};
    const access={canManage:true,mode:'open',pending:false,onToggle:noop};
    const controls={micMuted:false,outputMuted:false,mediaActionPending:false,screenSharePending:false,screenSharing:false,screenShareHasAudio:true,cameraEnabled:false,cameraPending:false,onMicToggle:noop,onOutputToggle:noop,onScreenShareToggle:noop,onCameraToggle:noop};
    const session={phase:'inside',inside:true,leavePending:false,onLeave:noop,connectPending:false,connectDisabled:false,onConnect:noop,connectLabel:'Войти',retryLabel:'Повторить',retryPending:false,onRetry:noop};
    return <main className="grid h-dvh place-items-center bg-[var(--background)] p-4 max-sm:p-0"><section className="voople-full-room flex h-[min(92dvh,760px)] w-full max-w-6xl min-w-0 flex-col overflow-hidden border border-[var(--app-border)]">
      <VoiceRoomHeader identity={identity} connection={connection} participantCount={participants.length} hasGroupSounds access={access} fullscreen={false} fullscreenPending={false} onOpenSoundboard={noop} onOpenSettings={noop} onToggleFullscreen={noop}/>
      <div className="voople-full-room__content flex min-h-0 flex-1 flex-col p-3 sm:p-4"><VoiceRoomStage screenContainerRef={bindScreen} screenShareOwner="nmggk" screenShareTrackId="screen-1" screenShareIsLocal={false} participants={participants} participantVolumes={{}} micMuted={false} remoteMicMutedById={{}} activeSpeakerIds={new Set(['biba'])} cameraParticipantIds={new Set()} onCameraContainerChange={noop} onParticipantVolumeChange={noop}/></div>
      <VoiceRoomFooter connection={connection} controls={controls} access={access} session={session}/>
    </section></main>
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
  for (const { width, height, theme } of [
    { width: 1280, height: 800, theme: "void" },
    { width: 390, height: 800, theme: "light" },
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.addInitScript((value) => window.localStorage.setItem("voople:app-theme", value), theme);
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByRole("heading", { name: "VOICEKK / DRG" }).waitFor();
    await page.getByLabel("Демонстрация экрана: nmggk").waitFor();
    assert.equal(await page.locator(".voople-full-room__participant").count(), 3);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: path.join(artifacts, `room-${width}-${theme}.png`) });
    console.log(`PASS room ${width}px ${theme}: no overflow or runtime errors`);
    await page.close();
  }
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
