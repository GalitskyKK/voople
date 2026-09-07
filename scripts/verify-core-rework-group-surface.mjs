import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../", import.meta.url)).replaceAll("\\", "/").replace(/\/$/, "");
const distRoot = path.resolve(process.argv[2] ?? path.join(repo, "desktop/dist"));
const artifacts = await mkdtemp(path.join(os.tmpdir(), "voople-core-group-surface-"));
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
  import {GroupSurfaceTabs} from '@/components/chat/GroupSurfaceTabs';
  import {GroupLiveShelfView} from '@/components/chat/GroupLiveShelfView';
  import {GroupNowPanelView} from '@/components/chat/GroupNowPanelView';
  import {GroupPeoplePanelView} from '@/components/chat/GroupPeoplePanelView';
  const users=[
    {id:'biba',username:'biba',displayName:'Biba',avatarUrl:null,isMe:false,micMuted:false,cameraEnabled:false,screenSharing:false},
    {id:'kk',username:'kk',displayName:'kk',avatarUrl:null,isMe:false,micMuted:false,cameraEnabled:false,screenSharing:false},
    {id:'anya',username:'anya',displayName:'Anya',avatarUrl:null,isMe:false,micMuted:true,cameraEnabled:false,screenSharing:false},
    {id:'nmggk',username:'nmggk',displayName:'nmggk',avatarUrl:null,isMe:true,micMuted:false,cameraEnabled:false,screenSharing:true}
  ];
  const rooms=[
    {id:'lobby',kind:'lobby',name:'Лобби',joinTarget:{kind:'room',roomId:'lobby'},state:'active',liveSessionId:'s1',startedAt:'2026-09-06T10:00:00Z',startedBy:'biba',participantCount:3,hasScreenShare:false,participants:users.slice(0,3)},
    {id:'drg',kind:'pinned',name:'DRG',joinTarget:{kind:'room',roomId:'drg'},state:'active',liveSessionId:'s2',startedAt:'2026-09-06T10:10:00Z',startedBy:'nmggk',participantCount:1,hasScreenShare:true,participants:[users[3]]}
  ];
  const members=users.map((user,index)=>({type:'user',id:user.id,username:user.username,displayName:user.displayName,bio:null,avatarUrl:null,role:index===0?'owner':index===1?'admin':'member',roleColor:null,activeRoom:{chatId:index===3?'drg':'lobby',name:index===3?'DRG':'Лобби'}}));
  const common={parentChatId:null,topicsEnabled:false,topicsLayout:'tabs',topicIcon:null,groupVisibility:'private',joinPolicy:'invite_only',sectionAccessMode:'inherit',groupBannerUrl:null,groupTag:null,boostCount:0,boostedByMe:false,viewerRole:'member',lastMessage:null,channels:[]};
  const chats=[{...common,id:'group-1',type:'group',name:'VOICEKK',groupIcon:'V',groupAvatarUrl:null,groupAccentColor:'#8b5cf6',memberCount:7,otherUser:null},{...common,id:'direct-1',type:'direct',name:null,groupIcon:null,groupAvatarUrl:null,groupAccentColor:null,memberCount:2,otherUser:{id:'astra',username:'astra',displayName:'Astra',hasVooplePlus:false,avatarUrl:null,avatarDecorationUrl:null,avatarRingId:null,lastSeenAt:null}}];
  const renderDestination=({href,label,className,active,children})=><button type="button" data-href={href} aria-label={label} aria-current={active?'page':undefined} className={className} onClick={()=>{if(href.includes('surface=now'))window.setGroupTab?.('now')}}>{children}</button>;
  function GroupSurface(){const [tab,setTab]=useState('chat');window.setGroupTab=setTab;return <div className="flex min-h-0 flex-1 flex-col"><header className="flex min-h-14 items-center gap-3 border-b border-[var(--app-border)] px-4"><GroupAvatar name="VOICEKK" icon="V" size="sm" shape="square"/><div className="min-w-0 flex-1"><p className="text-sm font-semibold uppercase tracking-[0.06em]">VOICEKK</p><p className="text-[11px] text-emerald-400">7 участников</p></div><button className="h-8 rounded-xl border border-[var(--app-border)] px-3 text-xs font-semibold">Войти в Лобби</button></header><GroupSurfaceTabs activeTab={tab} onTabChange={setTab}/>{tab==='chat'?<><GroupLiveShelfView rooms={rooms} currentUserRoomId={null} onJoinRoom={()=>{}}/><div className="flex min-h-0 flex-1 flex-col"><nav className="flex h-9 items-center gap-5 border-b border-[var(--app-border)] px-4 text-xs"><span className="text-[var(--theme-accent)]"># Общий</span><span className="text-[var(--app-muted)]">Game</span><span className="text-[var(--app-muted)]">Мемы</span><button aria-label="Новый раздел" className="ml-auto">+</button></nav><div className="flex min-h-0 flex-1 flex-col justify-end px-5 py-4"><div className="flex gap-3"><ProfileAvatar displayName="nmggk" size="sm" shape="square"/><div><p className="text-xs font-semibold">nmggk <span className="font-mono text-[10px] text-[var(--app-muted)]">23:41</span></p><div className="mt-1 border border-[var(--app-border)] bg-[var(--app-surface)] p-3 text-sm">Кто сегодня в голос?</div></div></div></div><div className="border-t border-[var(--app-border)] p-3"><div className="h-10 border border-[var(--app-border)] px-3 py-2 text-sm text-[var(--app-muted)]">Сообщение VOICEKK…</div></div></div></>:tab==='now'?<GroupNowPanelView mode="ready" value={{groupId:'group-1',groupName:'VOICEKK',rooms,onlineOutsideRooms:[],visibleOnlineCount:7,currentUserRoomId:null}} onJoinRoom={()=>{}} onCreateRoom={()=>{}}/>:<GroupPeoplePanelView members={members} onlineUserIds={new Set(users.map(user=>user.id))} onRetry={()=>{}}/>}</div>}
  function Demo(){const sidebar=<AppSidebarVisual pathname="/messages/group-1" collapsed={false} renderDestination={renderDestination} primaryNavigation={<MessengerSidebarView pathname="/messages/group-1" chats={chats} loading={false} onlineUserIds={new Set(['astra'])} liveByGroup={new Map([['group-1',{groupId:'group-1',participantCount:4,roomCount:2,hasScreenShare:true}]])} createGroupAction={<button type="button" aria-label="Создать группу" className="h-5 w-5 border border-[var(--app-border)] text-xs">+</button>} renderDestination={renderDestination} onRetry={()=>{}}/>} accountNavigation={<button type="button" className="flex w-full items-center gap-2 px-2 py-1 text-left"><ProfileAvatar displayName="Yozhik" size="sm" shape="square" isOnline/><span className="text-xs">Yozhik</span></button>}/>;return <AppShellFrame routeKind="messages" fixedViewport sidebar={sidebar}><MessagesLayoutView isThread list={<div/>} thread={<GroupSurface/>}/></AppShellFrame>}
  createRoot(document.getElementById('root')).render(<AppThemeProvider><Demo/></AppThemeProvider>);`;

const bundle = await build({
  stdin: { contents: entry, resolveDir: repo, loader: "tsx" }, bundle: true, write: false,
  format: "iife", jsx: "automatic", alias: { "@": `${repo}/src` },
  define: { "process.env.NODE_ENV": '"development"' },
});
const cssFiles = (await readdir(path.join(distRoot, "assets"), { recursive: true })).filter((file) => file.endsWith(".css"));
const css = (await Promise.all(cssFiles.map((file) => readFile(path.join(distRoot, "assets", file), "utf8")))).join("\n");
const logo = await readFile(path.join(repo, "public/favicon/android-chrome-192x192.png"));
const server = createServer((request, response) => {
  if (request.url === "/favicon/android-chrome-192x192.png") { response.setHeader("Content-Type", "image/png"); response.end(logo); return; }
  if (request.url === "/app.js") { response.setHeader("Content-Type", "text/javascript"); response.end(bundle.outputFiles[0].text); return; }
  if (request.url === "/style.css") { response.setHeader("Content-Type", "text/css"); response.end(css); return; }
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end('<!doctype html><html data-app-theme="void"><head><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>');
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

let browser;
try {
  browser = await chromium.launch({ headless: true });
  for (const { width, height, tab } of [
    { width: 1280, height: 800, tab: "chat" }, { width: 1280, height: 800, tab: "now" },
    { width: 1280, height: 800, tab: "people" }, { width: 390, height: 800, tab: "chat" },
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(() => typeof window.setGroupTab === "function");
    if (tab === "now") {
      await page.getByRole("button", { name: /Сейчас в группе VOICEKK/ }).click();
    } else {
      await page.evaluate((value) => window.setGroupTab(value), tab);
    }
    await page.getByRole("tab", { name: tab === "chat" ? "Чат" : tab === "now" ? "Сейчас" : "Люди" }).waitFor();
    await page.waitForTimeout(250);
    if (tab === "chat") {
      await page.waitForFunction(() => {
        const shelf = document.querySelector(".voople-group-live-shelf");
        return shelf && getComputedStyle(shelf).opacity === "1";
      });
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: path.join(artifacts, `group-${tab}-${width}.png`) });
    console.log(`PASS ${tab} ${width}px: no overflow or runtime errors`);
    await page.close();
  }
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
