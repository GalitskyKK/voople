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
  import {VoiceRoomContent} from '@/components/chat/voice/VoiceRoomContent';
  import {VoiceRoomHeader} from '@/components/chat/voice/VoiceRoomHeader';
  import {VoiceRoomSwitcher} from '@/components/chat/voice/VoiceRoomSwitcher';
  import {VoiceRoomFooter} from '@/components/chat/voice/VoiceRoomFooter';
  const noop=()=>{};
  const allParticipants=[
    {id:'nmggk',username:'nmggk',displayName:'nmggk',avatarUrl:null,avatarDecorationUrl:null,avatarRingId:null,micMuted:false,isMe:true},
    {id:'biba',username:'biba',displayName:'Biba',avatarUrl:null,avatarDecorationUrl:null,avatarRingId:null,micMuted:false,isMe:false},
    {id:'anya',username:'anya',displayName:'Anya',avatarUrl:null,avatarDecorationUrl:null,avatarRingId:null,micMuted:true,isMe:false},
  ];
  const rooms=[
    {id:'lobby',kind:'lobby',name:'Лобби',joinTarget:{kind:'room',roomId:'lobby'},state:'active',liveSessionId:'live-1',startedAt:null,startedBy:null,participantCount:2,hasScreenShare:false,participants:[]},
    {id:'drg',kind:'temporary',name:'DRG',joinTarget:{kind:'room',roomId:'drg'},state:'active',liveSessionId:'live-2',startedAt:null,startedBy:null,participantCount:3,hasScreenShare:true,participants:[]},
    {id:'chill',kind:'pinned',name:'Chill',joinTarget:{kind:'room',roomId:'chill'},state:'idle',liveSessionId:null,startedAt:null,startedBy:null,participantCount:0,hasScreenShare:false,participants:[]},
  ];
  const bindScreen=(element)=>{if(!element||element.childNodes.length)return;const mock=document.createElement('div');mock.className='grid h-full w-full place-items-center bg-[linear-gradient(145deg,#111827,#1f2937)] text-center text-white/70';mock.innerHTML='<div><strong class="block text-lg text-white">Экран nmggk</strong><span class="mt-2 block text-xs">DEEP ROCK GALACTIC</span></div>';element.append(mock)};
  function Demo(){
    const params=new URLSearchParams(location.search);
    const phase=params.get('phase')||'inside';
    const fullscreen=params.get('fullscreen')==='1';
    const media=params.get('media')||'screen';
    const participantCount=Number(params.get('people')||3);
    const participants=allParticipants.slice(0,participantCount);
    const screenShareOwner=media==='screen'?'nmggk':null;
    const connected=phase==='inside'||phase==='reconnecting'||phase==='leaving';
    const identity={isDirect:false,callPhase:'connected',chatName:'VOICEKK / DRG',active:true,durationLabel:'01:42'};
    const connection={label:phase==='reconnecting'?'Восстанавливаем связь…':connected?'Голос подключён':null,status:phase==='reconnecting'?'reconnecting':phase==='error'?'error':connected?'connected':'idle',quality:phase==='reconnecting'?ConnectionQuality.Poor:ConnectionQuality.Excellent,audioBlocked:false,errorMessage:phase==='error'?'Сервер комнаты не ответил вовремя.':null,onResumeAudio:noop};
    const access={canManage:true,mode:'open',pending:false,onToggle:noop};
    const controls={micMuted:false,outputMuted:false,mediaActionPending:false,screenSharePending:false,screenSharing:false,screenShareHasAudio:true,cameraEnabled:false,cameraPending:false,onMicToggle:noop,onOutputToggle:noop,onScreenShareToggle:noop,onCameraToggle:noop};
    const session={phase,inside:connected,leavePending:phase==='leaving',onLeave:noop,connectPending:phase==='loading',connectDisabled:false,onConnect:noop,connectLabel:'Войти',retryLabel:phase==='error'?'Повторить загрузку':'Повторить подключение',retryPending:false,onRetry:noop};
    const stage={screenContainerRef:bindScreen,screenShareOwner,screenShareAvailable:null,screenShareTrackId:screenShareOwner?'screen-1':null,screenShareIsLocal:false,watchingScreenShare:Boolean(screenShareOwner),screenShareVolume:1,participants,groupSounds:[],participantVolumes:{},remoteMicMutedById:{},activeSpeakerIds:new Set(['biba']),cameraParticipantIds:new Set(),onCameraContainerChange:noop,onParticipantVolumeChange:noop,onScreenShareVolumeChange:noop,onGroupSoundPlay:noop,onWatchScreenShare:noop,onStopWatchingScreenShare:noop};
    return <main className={fullscreen?'grid h-dvh place-items-center bg-[var(--background)]':'grid h-dvh place-items-center bg-[var(--background)] p-4 max-sm:p-0'}><section className={fullscreen?'voople-full-room flex h-dvh w-full min-w-0 flex-col overflow-hidden border-0':'voople-full-room flex h-[min(94dvh,860px)] max-h-[94dvh] w-full max-w-[86rem] min-w-0 flex-col overflow-hidden border border-[var(--app-border)]'}>
      <div className="voople-full-room__frame flex h-full min-h-0 min-w-0 max-sm:flex-col">
        <VoiceRoomSwitcher rooms={rooms} currentRoomId="drg" pendingRoomId={null} errorMessage={null} refreshing={false} onSelect={noop} onRetry={noop}/>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <VoiceRoomHeader identity={identity} connection={connection} participantCount={participants.length} hasGroupSounds access={access} fullscreen={fullscreen} fullscreenPending={false} onOpenSoundboard={noop} onOpenSettings={noop} onToggleFullscreen={noop}/>
          <VoiceRoomContent identity={identity} stage={stage} controls={controls} session={session} errorMessage={connection.errorMessage} onInvite={noop} onClose={noop}/>
          <VoiceRoomFooter connection={connection} controls={controls} access={access} session={session}/>
        </div>
      </div>
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
  for (const { width, height, theme, phase, fullscreen = false, media = "screen", people = 3, expected } of [
    { width: 390, height: 800, theme: "light", phase: "inside", expected: "Демонстрация экрана: nmggk" },
    { width: 390, height: 800, theme: "void", phase: "inside", media: "voice", people: 1, expected: "Вы пока один" },
    { width: 1024, height: 720, theme: "void", phase: "reconnecting", expected: "Восстанавливаем связь" },
    { width: 1024, height: 720, theme: "light", phase: "inside", media: "voice", expected: "voice-grid" },
    { width: 1280, height: 800, theme: "void", phase: "inside", expected: "Демонстрация экрана: nmggk" },
    { width: 1440, height: 900, theme: "light", phase: "loading", expected: "Открываем комнату" },
    { width: 1024, height: 720, theme: "light", phase: "error", expected: "Не удалось загрузить комнату" },
    { width: 1440, height: 900, theme: "void", phase: "post-leave", expected: "Вы вышли из комнаты" },
    { width: 1440, height: 900, theme: "void", phase: "inside", fullscreen: true, expected: "Демонстрация экрана: nmggk" },
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.addInitScript((value) => window.localStorage.setItem("voople:app-theme", value), theme);
    await page.goto(`http://127.0.0.1:${server.address().port}?phase=${phase}&fullscreen=${fullscreen ? "1" : "0"}&media=${media}&people=${people}`);
    await page.getByRole("heading", { name: "VOICEKK / DRG" }).waitFor();
    await page.getByRole("complementary", { name: "Комнаты группы" }).waitFor();
    assert.equal(await page.getByRole("button", { name: /DRG/ }).getAttribute("aria-current"), "true");
    if (expected === "Демонстрация экрана: nmggk") {
      await page.getByLabel(expected).waitFor();
      assert.equal(await page.locator(".voople-full-room__participant").count(), 3);
    } else if (expected === "voice-grid") {
      await page.locator(".voople-full-room__participant").first().waitFor();
      assert.equal(await page.locator(".voople-full-room__participant").count(), people);
    } else {
      await page.getByText(expected, { exact: false }).first().waitFor();
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    const suffix = fullscreen ? "fullscreen" : `${phase}-${media}-${people}`;
    await page.screenshot({ path: path.join(artifacts, `room-${width}-${theme}-${suffix}.png`) });
    console.log(`PASS room ${width}px ${theme} ${suffix}: no overflow or runtime errors`);
    await page.close();
  }
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
