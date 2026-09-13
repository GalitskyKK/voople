import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCurrentVisualCss } from "./lib/load-current-visual-css.mjs";

const repo = fileURLToPath(new URL("../", import.meta.url)).replaceAll("\\", "/").replace(/\/$/, "");
const artifacts = await mkdtemp(path.join(os.tmpdir(), "voople-core-room-surface-"));
console.log(`Screenshots: ${artifacts}`);

const require = createRequire(`${repo}/package.json`);
const { build } = require("esbuild");
const { chromium } = require("playwright");

const entry = `import {createRoot} from 'react-dom/client';
  import {ConnectionQuality} from 'livekit-client';
  import {AppThemeProvider} from '@/components/theme/AppThemeProvider';
  import {AppSidebarVisual} from '@/components/layout/AppNavigationVisual';
  import {AppShellFrame} from '@/components/layout/AppShellFrame';
  import {ProfileAvatar} from '@/components/profile/ProfileAvatar';
  import {ChatComposerSessionProvider} from '@/components/chat/ChatComposerSessionProvider';
  import {VoiceRoomContent} from '@/components/chat/voice/VoiceRoomContent';
  import {VoiceRoomHeader} from '@/components/chat/voice/VoiceRoomHeader';
  import {RoomMessagesPanel} from '@/components/chat/voice/RoomMessagesPanel';
  import {VoiceRoomSwitcher} from '@/components/chat/voice/VoiceRoomSwitcher';
  import {VoiceRoomSwitchStatus} from '@/components/chat/voice/VoiceRoomSwitchStatus';
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
  const renderDestination=({href,label,className,active,children})=><button type="button" data-href={href} aria-label={label} aria-current={active?'page':undefined} className={className}>{children}</button>;
  const bindScreen=(element)=>{if(!element||element.childNodes.length)return;const mock=document.createElement('div');mock.className='grid h-full w-full place-items-center bg-[linear-gradient(145deg,#111827,#1f2937)] text-center text-white/70';mock.innerHTML='<div><strong class="block text-lg text-white">Экран nmggk</strong><span class="mt-2 block text-xs">DEEP ROCK GALACTIC</span></div>';element.append(mock)};
  function Demo(){
    const params=new URLSearchParams(location.search);
    const phase=params.get('phase')||'inside';
    const fullscreen=params.get('fullscreen')==='1';
    const media=params.get('media')||'screen';
    const messagesOpen=params.get('messages')==='1';
    const participantCount=Number(params.get('people')||3);
    const participants=allParticipants.slice(0,participantCount);
    const screenShareOwner=media==='screen'?'nmggk':null;
    const connected=phase==='inside'||phase==='reconnecting'||phase==='leaving'||phase==='switching';
    const identity={isDirect:false,callPhase:'connected',chatName:'VOICEKK / DRG',active:true,durationLabel:'01:42'};
    const connection={label:phase==='reconnecting'?'Восстанавливаем связь…':connected?'Голос подключён':null,status:phase==='reconnecting'?'reconnecting':phase==='error'?'error':connected?'connected':'idle',quality:phase==='reconnecting'?ConnectionQuality.Poor:ConnectionQuality.Excellent,audioBlocked:false,errorMessage:phase==='error'?'Сервер комнаты не ответил вовремя.':null,onResumeAudio:noop};
    const access={canManage:true,mode:'open',pending:false,onToggle:noop};
    const controls={micMuted:false,outputMuted:false,mediaActionPending:false,screenSharePending:false,screenSharing:false,screenShareHasAudio:true,cameraEnabled:false,cameraPending:false,onMicToggle:noop,onOutputToggle:noop,onScreenShareToggle:noop,onCameraToggle:noop};
    const session={phase,inside:connected,leavePending:phase==='leaving',onLeave:noop,connectPending:phase==='loading',connectDisabled:false,onConnect:noop,connectLabel:'Войти',retryLabel:phase==='error'?'Повторить загрузку':'Повторить подключение',retryPending:false,onRetry:noop};
    const stage={screenContainerRef:bindScreen,screenShareOwner,screenShareAvailable:null,screenShareTrackId:screenShareOwner?'screen-1':null,screenShareIsLocal:false,watchingScreenShare:Boolean(screenShareOwner),screenShareVolume:1,participants,groupSounds:[],participantVolumes:{},remoteMicMutedById:{},activeSpeakerIds:new Set(['biba']),cameraParticipantIds:new Set(),onCameraContainerChange:noop,onParticipantVolumeChange:noop,onScreenShareVolumeChange:noop,onGroupSoundPlay:noop,onWatchScreenShare:noop,onStopWatchingScreenShare:noop};
    const room=<section data-chat-open={messagesOpen?'true':'false'} className="voople-full-room flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden border-0 shadow-none">
      <div className="voople-full-room__frame relative flex h-full min-h-0 min-w-0 max-sm:flex-col">
        <VoiceRoomSwitcher rooms={rooms} currentRoomId="drg" pendingRoomId={phase==='switching'?'lobby':null} errorMessage={null} refreshing={false} onSelect={noop} onRetry={noop}/>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <VoiceRoomHeader identity={identity} connection={connection} participantCount={participants.length} hasGroupSounds hasRoomMessages roomMessagesOpen={messagesOpen} roomSwitcher={{rooms,currentRoomId:'drg',pendingRoomId:phase==='switching'?'lobby':null,errorMessage:null,refreshing:false,onSelect:noop,onRetry:noop}} access={access} fullscreen={fullscreen} fullscreenPending={false} onMinimize={noop} onOpenSoundboard={noop} onToggleRoomMessages={noop} onOpenSettings={noop} onToggleFullscreen={noop}/>
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
            <VoiceRoomContent identity={identity} stage={stage} controls={controls} session={session} errorMessage={connection.errorMessage} onInvite={noop} onClose={noop}/>
            {phase==='switching'?<VoiceRoomSwitchStatus roomName="Лобби"/>:null}
          </div>
          <VoiceRoomFooter connection={connection} controls={controls} access={access} session={session}/>
        </div>
        {messagesOpen?<RoomMessagesPanel model={{chatId:'group-1',roomId:'drg',liveSessionId:'live-2',roomName:'DRG',roomKind:'temporary'}} onClose={noop}/>:null}
      </div>
    </section>;
    if(fullscreen)return <main className="h-dvh w-full overflow-hidden bg-[var(--background)]">{room}</main>;
    const sidebar=<AppSidebarVisual pathname="/messages/group-1" collapsed={false} renderDestination={renderDestination} primaryNavigation={<nav className="voople-sidebar__nav flex min-h-0 flex-1 flex-col gap-1 px-2" aria-label="Группы и личные сообщения"><p className="px-2 pb-1 text-[10px] uppercase tracking-[0.12em] text-[var(--app-muted)]">Группы</p><button type="button" className="voople-messenger-sidebar__row flex min-h-12 items-center gap-2 border-l-2 border-[var(--theme-accent)] bg-[var(--app-accent-soft)] px-2 text-left"><span className="grid h-8 w-8 place-items-center rounded-[var(--app-radius-sm)] bg-[var(--app-surface-soft)] text-[var(--theme-accent)]">V</span><span className="min-w-0"><strong className="block text-[13px]">VOICEKK</strong><span className="block text-[11px] text-emerald-400">3 в голосе</span></span></button></nav>} accountNavigation={<button type="button" className="flex w-full items-center gap-2 px-2 py-1 text-left"><ProfileAvatar displayName="Yozhik" size="sm" shape="square" isOnline/><span className="text-xs">Yozhik</span></button>}/>;
    return <AppShellFrame routeKind="messages" fixedViewport sidebar={sidebar}>{room}</AppShellFrame>;
  }
  createRoot(document.getElementById('root')).render(<AppThemeProvider><ChatComposerSessionProvider><Demo/></ChatComposerSessionProvider></AppThemeProvider>);`;

const bundle = await build({
  stdin: { contents: entry, resolveDir: repo, loader: "tsx" },
  bundle: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  alias: { "@": `${repo}/src` },
  plugins: [{
    name: "room-messages-trpc-fixture",
    setup(build) {
      build.onResolve({ filter: /^@\/lib\/trpc\/client$/ }, () => ({ path: "trpc-client", namespace: "room-fixture" }));
      build.onLoad({ filter: /.*/, namespace: "room-fixture" }, () => ({
        loader: "js",
        contents: `const roomContext={roomId:'drg',liveSessionId:'live-2',roomName:'DRG',roomKind:'temporary',capturedAt:'2026-09-08T18:41:00Z'};
          const chat={id:'group-1',type:'group',name:'VOICEKK',parentChatId:null,parentName:null,topicsEnabled:true,topicsLayout:'tabs',topicIcon:null,groupVisibility:'private',joinPolicy:'invite_only',sectionAccessMode:'inherit',groupIcon:'V',groupAvatarUrl:null,groupBannerUrl:null,groupTag:null,groupAccentColor:'#8b5cf6',boostCount:0,boostedByMe:false,memberCount:7,viewerRole:'member'};
          const messages=[
            {id:'message-1',senderId:'biba',text:'Пойдём ещё один заход?',createdAt:'2026-09-08T18:41:00Z',isMine:false,readAt:null,reactions:[],sender:{username:'biba',displayName:'Biba',hasVooplePlus:false,avatarUrl:null},roomContext},
            {id:'message-2',senderId:'me',text:'Да, я в комнате.',createdAt:'2026-09-08T18:42:00Z',isMine:true,readAt:null,reactions:[],sender:{username:'nmggk',displayName:'nmggk',hasVooplePlus:false,avatarUrl:null},roomContext},
          ];
          const mutation={mutate(){},mutateAsync:async()=>({}),isPending:false,error:null};
          export const trpc={
            useUtils:()=>({chat:{observeMessages:{cancel:async()=>{},getData:()=>({messages}),setData(){}},list:{invalidate:async()=>{}}}}),
            user:{me:{useQuery:()=>({data:{id:'me'}})}},
            chat:{observeMessages:{useQuery:()=>({data:{chat,messages},isLoading:false,error:null,refetch:async()=>{}})},groupEmojis:{useQuery:()=>({data:{items:[]}})},send:{useMutation:()=>mutation},markRead:{useMutation:()=>mutation},editMessage:{useMutation:()=>mutation},deleteMessage:{useMutation:()=>mutation},toggleReaction:{useMutation:()=>mutation}},
            upload:{createPresigned:{useMutation:()=>mutation}},
            playlist:{listMine:{useQuery:()=>({data:{tracks:[]},isLoading:false})},createFromUpload:{useMutation:()=>mutation},addFromChatMessage:{useMutation:()=>mutation}},
          };`,
      }));
    },
  }],
  define: { "process.env.NODE_ENV": '"development"' },
});
const cssByHost = {
  web: await loadCurrentVisualCss(repo, { host: "web" }),
  desktop: await loadCurrentVisualCss(repo, { host: "desktop" }),
};
const logo = await readFile(path.join(repo, "public/favicon/android-chrome-192x192.png"));
const geistSans = await readFile(path.join(repo, "node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2"));
const geistMono = await readFile(path.join(repo, "node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2"));
const geistPixelSquare = await readFile(path.join(repo, "node_modules/geist/dist/fonts/geist-pixel/GeistPixel-Square.woff2"));
const server = createServer((request, response) => {
  if (request.url === "/favicon/android-chrome-192x192.png") { response.setHeader("Content-Type", "image/png"); response.end(logo); return; }
  if (request.url === "/fonts/geist-sans.woff2") { response.setHeader("Content-Type", "font/woff2"); response.end(geistSans); return; }
  if (request.url === "/fonts/geist-mono.woff2") { response.setHeader("Content-Type", "font/woff2"); response.end(geistMono); return; }
  if (request.url === "/fonts/geist-pixel-square.woff2") { response.setHeader("Content-Type", "font/woff2"); response.end(geistPixelSquare); return; }
  if (request.url === "/app.js") { response.setHeader("Content-Type", "text/javascript"); response.end(bundle.outputFiles[0].text); return; }
  if (request.url?.startsWith("/style.css")) { const host = new URL(request.url, "http://localhost").searchParams.get("host") === "desktop" ? "desktop" : "web"; response.setHeader("Content-Type", "text/css"); response.end(cssByHost[host]); return; }
  const host = new URL(request.url ?? "/", "http://localhost").searchParams.get("host") === "desktop" ? "desktop" : "web";
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end(`<!doctype html><html data-app-theme="void" data-visual-host="${host}"><head><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/style.css?host=${host}"></head><body><div id="root"></div><script src="/app.js"></script></body></html>`);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const cases = ["web", "desktop"].flatMap((host) => [
    { width: 390, height: 800, theme: "light", phase: "inside", expected: "Демонстрация экрана: nmggk", host },
    { width: 390, height: 800, theme: "void", phase: "inside", media: "voice", people: 1, expected: "Вы пока один", host },
    { width: 1024, height: 720, theme: "void", phase: "reconnecting", expected: "Восстанавливаем связь", host },
    { width: 1280, height: 800, theme: "void", phase: "inside", expected: "Демонстрация экрана: nmggk", host },
    { width: 1280, height: 800, theme: "void", phase: "inside", media: "screen", messages: true, expected: "Чат группы", host },
    { width: 1440, height: 900, theme: "void", phase: "inside", fullscreen: true, expected: "Демонстрация экрана: nmggk", host },
  ]);
  const selectedCases = process.argv.includes("--messages-only")
    ? cases.filter((item) => item.messages)
    : process.argv.includes("--wide-stage-only")
      ? cases.filter((item) => item.width === 1280 && !item.messages)
      : cases;
  for (const { width, height, theme, phase, fullscreen = false, media = "screen", messages = false, people = 3, expected, host } of selectedCases) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.addInitScript((value) => window.localStorage.setItem("voople:app-theme", value), theme);
    await page.goto(`http://127.0.0.1:${server.address().port}?phase=${phase}&fullscreen=${fullscreen ? "1" : "0"}&media=${media}&messages=${messages ? "1" : "0"}&people=${people}&host=${host}`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    if (errors.length) throw new Error(errors.join("\n"));
    await page.getByRole("heading", { name: "VOICEKK / DRG" }).waitFor();
    const roomSwitcher = page.getByRole("complementary", { name: "Комнаты группы" });
    if (await roomSwitcher.isVisible()) {
      assert.equal(await roomSwitcher.getByRole("button", { name: /DRG/ }).getAttribute("aria-current"), "true");
    } else {
      await page.getByLabel("Текущая комната").waitFor();
      assert.equal(await page.getByLabel("Текущая комната").inputValue(), "drg");
    }
    if (expected === "Демонстрация экрана: nmggk") {
      await page.getByLabel(expected).waitFor();
      assert.equal(await page.locator(".voople-full-room__participant").count(), 3);
    } else if (expected === "voice-grid") {
      await page.locator(".voople-full-room__participant").first().waitFor();
      assert.equal(await page.locator(".voople-full-room__participant").count(), people);
    } else {
      await page.getByText(expected, { exact: false }).first().waitFor();
    }
    await page.waitForTimeout(180);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    const suffix = fullscreen ? "fullscreen" : `${phase}-${media}-${people}${messages ? "-messages" : ""}`;
    await page.screenshot({ path: path.join(artifacts, `room-${host}-${width}-${theme}-${suffix}.png`) });
    console.log(`PASS room ${host} ${width}px ${theme} ${suffix}: no overflow or runtime errors`);
    await page.close();
  }
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
