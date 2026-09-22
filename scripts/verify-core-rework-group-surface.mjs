import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCurrentVisualCss } from "./lib/load-current-visual-css.mjs";

const repo = fileURLToPath(new URL("../", import.meta.url)).replaceAll("\\", "/").replace(/\/$/, "");
const captureDirIndex = process.argv.indexOf("--capture-dir");
const captureDirectory = captureDirIndex >= 0 ? process.argv[captureDirIndex + 1] : null;
const captureOnly = process.argv.includes("--capture-only");
const artifacts = captureDirectory
  ? path.resolve(repo, captureDirectory)
  : await mkdtemp(path.join(os.tmpdir(), "voople-core-group-surface-"));
await mkdir(artifacts, { recursive: true });
console.log(`Screenshots: ${artifacts}`);

const require = createRequire(`${repo}/package.json`);
const { build } = require("esbuild");
const { chromium } = require("playwright");

const entry = `import {useState} from 'react';import {createRoot} from 'react-dom/client';
  import {AppThemeProvider} from '@/components/theme/AppThemeProvider';
  import {AppSidebarVisual} from '@/components/layout/AppNavigationVisual';
  import {AppShellFrame} from '@/components/layout/AppShellFrame';
  import {MessengerSidebarView} from '@/components/layout/MessengerSidebarView';
  import {MessagesLayoutView} from '@/components/chat/MessagesLayoutView';
  import {GroupAvatar} from '@/components/chat/GroupAvatar';
  import {ProfileAvatar} from '@/components/profile/ProfileAvatar';
  import {GroupIdentity} from '@/components/chat/GroupManagementTrigger';
  import {GroupSurfaceTabs} from '@/components/chat/GroupSurfaceTabs';
  import {ChatSectionsBarView} from '@/components/chat/ChatSectionsBarView';
  import {SubchatCreatorView} from '@/components/chat/SubchatCreatorView';
  import {ChatMessageBubbleVisual} from '@/components/chat/ChatMessageBubbleVisual';
  import {ChatComposerFrame,CHAT_COMPOSER_SURFACE_CLASS} from '@/components/chat/ChatComposerVisual';
  import {GroupLiveShelfView} from '@/components/chat/GroupLiveShelfView';
  import {GroupNowPanelView} from '@/components/chat/GroupNowPanelView';
  import {GroupPeoplePanelView} from '@/components/chat/GroupPeoplePanelView';
  const users=[
    {id:'biba',username:'biba',displayName:'Biba',avatarUrl:null,isMe:false,micMuted:false,cameraEnabled:false,screenSharing:false},
    {id:'kk',username:'kk',displayName:'kk',avatarUrl:null,isMe:false,micMuted:false,cameraEnabled:false,screenSharing:false},
    {id:'anya',username:'anya',displayName:'Anya',avatarUrl:null,isMe:false,micMuted:true,cameraEnabled:false,screenSharing:false},
    {id:'nmggk',username:'nmggk',displayName:'nmggk',avatarUrl:null,isMe:true,micMuted:false,cameraEnabled:false,screenSharing:true},
    {id:'test',username:'test',displayName:'Test',avatarUrl:null,isMe:false,micMuted:null,cameraEnabled:null,screenSharing:null}
  ];
  const rooms=[
    {id:'lobby',kind:'lobby',name:'Лобби',joinTarget:{kind:'room',roomId:'lobby'},state:'active',liveSessionId:'s1',startedAt:'2026-09-06T10:00:00Z',startedBy:'biba',participantCount:3,hasScreenShare:false,participants:users.slice(0,3)},
    {id:'drg',kind:'pinned',name:'DRG',joinTarget:{kind:'room',roomId:'drg'},state:'active',liveSessionId:'s2',startedAt:'2026-09-06T10:10:00Z',startedBy:'nmggk',participantCount:1,hasScreenShare:true,participants:[users[3]]}
  ];
  const members=users.map((user,index)=>({type:'user',id:user.id,username:user.username,displayName:user.displayName,bio:null,avatarUrl:null,role:index===0?'owner':index===1?'admin':'member',roleColor:null,activeRoom:index===0?{chatId:'lobby',name:'Лобби'}:index===3?{chatId:'drg',name:'DRG'}:null}));
  const common={parentChatId:null,topicsEnabled:false,topicsLayout:'tabs',topicIcon:null,groupVisibility:'private',joinPolicy:'invite_only',sectionAccessMode:'inherit',favoritePosition:1,groupBannerUrl:null,groupTag:null,boostCount:0,boostedByMe:false,viewerRole:'member',lastMessage:null,unreadCount:0,channels:[]};
  const chats=[{...common,id:'group-1',type:'group',name:'VOICEKK',groupIcon:'V',groupAvatarUrl:null,groupAccentColor:'#8b5cf6',memberCount:7,unreadCount:5,otherUser:null},{...common,id:'direct-1',type:'direct',name:null,groupIcon:null,groupAvatarUrl:null,groupAccentColor:null,memberCount:2,unreadCount:2,otherUser:{id:'astra',username:'astra',displayName:'Astra',hasVooplePlus:false,avatarUrl:null,avatarDecorationUrl:null,avatarRingId:null,lastSeenAt:null}}];
  const renderDestination=({href,label,className,active,children})=><button type="button" data-href={href} aria-label={label} aria-current={active?'page':undefined} className={className} onClick={()=>{if(href.includes('surface=now'))window.setGroupTab?.('now')}}>{children}</button>;
  function GroupSurface(){const [tab,setTab]=useState('chat');window.setGroupTab=setTab;const messages=[
    {id:'message-1',senderId:'biba',text:'Кто сегодня в голос?',createdAt:'2026-09-08T18:38:00Z',isMine:false,readAt:null,reactions:[],sender:{displayName:'Biba',hasVooplePlus:false,avatarUrl:null}},
    {id:'message-2',senderId:'nmggk',text:'Я зайду после девяти. Можно сразу в DRG.',createdAt:'2026-09-08T18:41:00Z',isMine:true,readAt:'2026-09-08T18:42:00Z',reactions:[{emoji:'👍',count:2,reactedByMe:false}],sender:{displayName:'nmggk',hasVooplePlus:false,avatarUrl:null},roomContext:{roomId:'drg',liveSessionId:'s2',roomName:'DRG: Deep Rock Galactic',roomKind:'pinned',capturedAt:'2026-09-08T18:41:00Z'}},
    {id:'message-3',senderId:'anya',text:'Ок, позовите меня через Вуп.',createdAt:'2026-09-08T18:43:00Z',isMine:false,readAt:null,reactions:[],sender:{displayName:'Anya',hasVooplePlus:false,avatarUrl:null}}
  ];return <div className="flex min-h-0 flex-1 flex-col"><div className="voople-group-surface-header voople-group-surface-header--combined"><header className="voople-panel-header voople-chat-window__header voople-chat-window__header--group flex items-center gap-3 border-b border-[var(--app-border)] px-4"><button className="voople-group-header-identity flex min-w-0 flex-1 items-center gap-3 text-left"><GroupIdentity chatName="VOICEKK" memberCount={7} groupIcon="V" groupAvatarUrl={null} groupAccentColor="#8b5cf6" groupTag={null}/></button><button className="h-8 rounded-[var(--app-radius-sm)] border border-[var(--app-border)] px-3 text-xs font-semibold">Войти в Лобби</button></header><GroupSurfaceTabs activeTab={tab} onTabChange={setTab}/></div>{tab==='chat'?<><GroupLiveShelfView groupId="group-1" rooms={rooms} currentUserRoomId="drg" onJoinRoom={()=>{}}/><div className="flex min-h-0 flex-1 flex-col"><ChatSectionsBarView rootChat={{...chats[0],topicsEnabled:true,channels:[{...chats[0],id:'game',name:'Game',parentChatId:'group-1',topicIcon:null},{...chats[0],id:'memes',name:'Мемы',parentChatId:'group-1',topicIcon:null}]}} activeChatId="group-1" createAction={({open,onOpenChange})=><SubchatCreatorView open={open} onOpenChange={onOpenChange} createSubchat={async()=> 'created-section'} onCreated={()=>{}}/>} renderDestination={(chat,className,children)=><button key={chat.id} className={className}>{children}</button>}/><div className="flex min-h-0 flex-1 flex-col justify-end gap-1 px-5 py-4">{messages.map((message)=><ChatMessageBubbleVisual key={message.id} message={message} showSender groupPosition="only" senderAvatar={<ProfileAvatar displayName={message.sender.displayName} size="sm" shape="square"/>}/>)}</div><ChatComposerFrame className="px-3"><div className={CHAT_COMPOSER_SURFACE_CLASS}><div className="h-8 px-2 py-1.5 text-sm text-[var(--app-muted)]">Сообщение VOICEKK…</div></div></ChatComposerFrame></div></>:tab==='now'?<GroupNowPanelView mode="ready" value={{groupId:'group-1',groupName:'VOICEKK',rooms,onlineOutsideRooms:[],visibleOnlineCount:7,currentUserRoomId:'drg'}} onJoinRoom={()=>{}} onLeaveCurrent={()=>{}} onCreateSplit={()=>{}} onCreateRoom={()=>{}}/>:<GroupPeoplePanelView members={members} onlineUserIds={new Set(users.slice(0,3).map(user=>user.id))} onRetry={()=>{}} onVoop={()=>{}}/>}</div>}
  function Demo(){const sidebar=<AppSidebarVisual pathname="/messages/group-1" collapsed={false} renderDestination={renderDestination} primaryNavigation={<MessengerSidebarView pathname="/messages/group-1" chats={chats} loading={false} onlineUserIds={new Set(['astra'])} liveByGroup={new Map([['group-1',{groupId:'group-1',participantCount:4,roomCount:2,hasScreenShare:true}]])} createGroupAction={<button type="button" aria-label="Создать группу" className="h-5 w-5 border border-[var(--app-border)] text-xs">+</button>} renderDestination={renderDestination} onRetry={()=>{}}/>} accountNavigation={<button type="button" className="flex w-full items-center gap-2 px-2 py-1 text-left"><ProfileAvatar displayName="Yozhik" size="sm" shape="square" isOnline/><span className="text-xs">Yozhik</span></button>}/>;return <AppShellFrame routeKind="messages" fixedViewport sidebar={sidebar}><MessagesLayoutView isThread list={<div/>} thread={<GroupSurface/>}/></AppShellFrame>}
  createRoot(document.getElementById('root')).render(<AppThemeProvider><Demo/></AppThemeProvider>);`;

const bundle = await build({
  stdin: { contents: entry, resolveDir: repo, loader: "tsx" }, bundle: true, write: false,
  format: "iife", jsx: "automatic", alias: { "@": `${repo}/src` },
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
  const visualCases = captureOnly
    ? [
        { width: 1440, height: 900, tab: "chat", theme: "void", host: "web", outputName: "chat.png" },
        { width: 1440, height: 900, tab: "now", theme: "void", host: "web", outputName: "now.png" },
        { width: 1440, height: 900, tab: "people", theme: "void", host: "web", outputName: "people.png" },
      ]
    : [
      ...["web", "desktop"].flatMap((host) => [
      { width: 1280, height: 800, tab: "chat", theme: "void", host },
      { width: 1280, height: 800, tab: "chat", theme: "void", host, state: "sections" },
      { width: 1280, height: 800, tab: "chat", theme: "void", host, state: "create" },
      { width: 1280, height: 800, tab: "chat", theme: "void", host, state: "collapsed" },
      { width: 1280, height: 800, tab: "now", theme: "void", host },
      { width: 1280, height: 800, tab: "people", theme: "void", host },
      { width: 390, height: 800, tab: "chat", theme: "light", host },
      { width: 390, height: 800, tab: "chat", theme: "light", host, state: "sections" },
      { width: 390, height: 800, tab: "chat", theme: "light", host, state: "create" },
      { width: 390, height: 800, tab: "chat", theme: "light", host, state: "collapsed" },
      { width: 390, height: 800, tab: "now", theme: "light", host },
      { width: 390, height: 800, tab: "people", theme: "light", host },
      ]),
    ];
  for (const { width, height, tab, theme, host, state = "default", outputName } of visualCases) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.addInitScript((value) => {
      window.localStorage.setItem("voople:app-theme", value);
    }, theme);
    await page.goto(`http://127.0.0.1:${server.address().port}?host=${host}`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => typeof window.setGroupTab === "function");
    if (tab === "now" && width >= 1024) {
      await page.getByRole("button", { name: /Голосовые комнаты группы VOICEKK/ }).click();
    } else {
      await page.evaluate((value) => window.setGroupTab(value), tab);
    }
    await page.getByRole("tab", { name: tab === "chat" ? "Чат" : tab === "now" ? "Войс" : "Люди" }).waitFor();
    await page.waitForTimeout(250);
    if (tab === "chat") {
      await page.getByText("Из комнаты DRG: Deep Rock Galactic", { exact: true }).waitFor();
      await page.waitForFunction(() => {
        const shelf = document.querySelector(".voople-group-live-shelf");
        return shelf && getComputedStyle(shelf).opacity === "1";
      });
      if (width >= 1024) {
        await page.locator(".voople-sidebar").getByLabel("Непрочитанных сообщений: 5").waitFor();
        await page.locator(".voople-sidebar").getByLabel("Непрочитанных сообщений: 2").waitFor();
        await page.getByRole("button", { name: /Голосовые комнаты группы VOICEKK: 4 в голосе/ }).waitFor();
      }
      if (state === "sections") {
        await page.getByRole("button", { name: /Текущий раздел: Общий/ }).click();
        await page.getByRole("dialog", { name: "Выбор раздела группы" }).waitFor();
        await page.waitForTimeout(200);
      }
      if (state === "create") {
        await page.getByRole("button", { name: "Новый раздел" }).click();
        await page.getByRole("form", { name: "Новый раздел" }).waitFor();
        await page.waitForTimeout(200);
      }
      if (state === "collapsed") {
        await page.getByRole("button", { name: "Свернуть активные разговоры" }).click();
        await page.getByRole("button", { name: "Развернуть активные разговоры" }).waitFor();
        await page.waitForTimeout(200);
      }
    }
    if (tab === "now") {
      assert.equal(await page.locator('[data-layout="room-section"]').count(), 2);
      await page.getByRole("button", { name: "Выйти из разговора: DRG" }).waitFor();
      await page.getByRole("button", { name: "Отделиться во временную комнату" }).waitFor();
      await page.getByRole("button", { name: "Создать постоянную комнату" }).waitFor();
    }
    if (tab === "people") {
      await page.getByLabel("В разговоре: 2").waitFor();
      await page.getByLabel("Онлайн: 2").waitFor();
      await page.getByLabel("Остальные: 1").waitFor();
      await page.getByRole("button", { name: /Вуп: позвать/ }).first().waitFor();
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    const stateSuffix = state === "default" ? "" : `-${state}`;
    await page.screenshot({ path: path.join(artifacts, outputName ?? `group-${host}-${tab}-${width}-${theme}${stateSuffix}.png`) });
    console.log(`PASS ${host} ${tab}${stateSuffix} ${width}px ${theme}: no overflow or runtime errors`);
    await page.close();
  }
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
