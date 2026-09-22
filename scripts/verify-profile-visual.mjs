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
const artifacts = captureDirectory
  ? path.resolve(repo, captureDirectory)
  : await mkdtemp(path.join(os.tmpdir(), "voople-profile-visual-"));
await mkdir(artifacts, { recursive: true });
console.log(`Screenshots: ${artifacts}`);

const require = createRequire(`${repo}/package.json`);
const { build } = require("esbuild");
const { chromium } = require("playwright");

const entry = `import {Heart,MessageCircle,Repeat2} from 'lucide-react';
  import {createRoot} from 'react-dom/client';
  import {AppThemeProvider} from '@/components/theme/AppThemeProvider';
  import {AppSidebarVisual} from '@/components/layout/AppNavigationVisual';
  import {AppShellFrame} from '@/components/layout/AppShellFrame';
  import {MessengerSidebarView} from '@/components/layout/MessengerSidebarView';
  import {ProfilePageView} from '@/components/profile/ProfilePageView';
  import {ProfileCardVisual} from '@/components/profile/ProfileCardVisual';
  import {ProfileCardIdentityVisual} from '@/components/profile/ProfileCardIdentityVisual';
  import {ProfileCardBodyVisual} from '@/components/profile/ProfileCardBodyVisual';
  import {ProfileBanner} from '@/components/profile/ProfileBanner';
  import {ProfileAvatar} from '@/components/profile/ProfileAvatar';
  import {PostCardSurface,PostCardBody,PostCardActions} from '@/components/feed/PostCardVisual';
  import {MOCK_PROFILE_DEFAULT} from '@/lib/mocks/profile';
  const profile={...MOCK_PROFILE_DEFAULT,displayName:'nmggk',username:'nmggk',bio:'Deep Rock Galactic, музыка и вечерние разговоры.',interests:[{slug:'games',name:'Игры'},{slug:'music',name:'Музыка'}],stats:{posts:18,followers:46,following:31,views:284},status:{thought:'Кто сегодня в войс?'}};
  const posts=[
    {id:'p1',author:{username:'nmggk',displayName:'nmggk'},text:'Сегодня после девяти собираемся в DRG.',likeCount:6,replyCount:3,viewCount:41,repostCount:1,createdAt:'2026-09-22T15:20:00Z'},
    {id:'p2',author:{username:'nmggk',displayName:'nmggk'},text:'Сохранил новый состав комнаты для следующего захода.',likeCount:4,replyCount:1,viewCount:28,repostCount:0,createdAt:'2026-09-21T18:10:00Z'}
  ];
  const common={parentChatId:null,topicsEnabled:false,topicsLayout:'tabs',topicIcon:null,groupVisibility:'private',joinPolicy:'invite_only',sectionAccessMode:'inherit',favoritePosition:1,groupBannerUrl:null,groupTag:null,boostCount:0,boostedByMe:false,viewerRole:'member',lastMessage:null,unreadCount:0,channels:[]};
  const chats=[{...common,id:'group-1',type:'group',name:'VOICEKK',groupIcon:'V',groupAvatarUrl:null,groupAccentColor:'#8b5cf6',memberCount:7,unreadCount:2,otherUser:null},{...common,id:'direct-1',type:'direct',name:null,groupIcon:null,groupAvatarUrl:null,groupAccentColor:null,memberCount:2,unreadCount:0,otherUser:{id:'biba',username:'biba',displayName:'Biba',hasVooplePlus:false,avatarUrl:null,avatarDecorationUrl:null,avatarRingId:null,lastSeenAt:null}}];
  const destination=({href,label,className,active,children})=><a href={href} aria-label={label} aria-current={active?'page':undefined} className={className}>{children}</a>;
  function ProfileCard(){return <ProfileCardVisual customization={profile.customization} banner={<ProfileBanner customization={profile.customization} className="h-[var(--profile-banner-height)] aspect-auto"/>} header={<ProfileCardIdentityVisual customization={profile.customization} displayName={profile.displayName} username={profile.username} avatar={<ProfileAvatar displayName={profile.displayName} size="xl" shape="square" isOnline/>}/>} body={<ProfileCardBodyVisual profile={profile} status={<div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-2 text-sm">Кто сегодня в войс?</div>} reactions={<div className="text-xs text-[var(--app-muted)]">Реакции профиля · 12</div>} shareAction={<button className="h-9 w-full rounded-xl border border-[var(--app-border)] text-xs font-semibold">Поделиться профилем</button>}/>} />}
  function Post({post}){return <PostCardSurface><header className="flex items-center gap-3 px-4 pt-4"><ProfileAvatar displayName="nmggk" size="sm" shape="square"/><div><strong className="block text-sm">nmggk</strong><span className="text-xs text-[var(--app-muted)]">@nmggk</span></div><time className="ml-auto text-xs text-[var(--app-muted)]">сегодня</time></header><PostCardBody><p className="text-sm leading-6">{post.text}</p><PostCardActions><span className="voople-post-action"><Heart/> {post.likeCount}</span><span className="voople-post-action"><MessageCircle/> {post.replyCount}</span><span className="voople-post-action"><Repeat2/> {post.repostCount}</span></PostCardActions></PostCardBody></PostCardSurface>}
  function Demo(){const sidebar=<AppSidebarVisual pathname="/nmggk" collapsed={false} renderDestination={destination} primaryNavigation={<MessengerSidebarView pathname="/nmggk" chats={chats} loading={false} onlineUserIds={new Set(['biba'])} liveByGroup={new Map([['group-1',{groupId:'group-1',participantCount:3,roomCount:2,hasScreenShare:false}]])} createGroupAction={<button type="button" aria-label="Создать группу">+</button>} renderDestination={destination} onRetry={()=>{}}/>} accountNavigation={<button className="flex w-full items-center gap-2 px-2 py-1 text-left"><ProfileAvatar displayName="nmggk" size="sm" shape="square" isOnline/><span className="text-xs">nmggk</span></button>}/>;return <AppShellFrame routeKind="profile" navigationKind="messenger" fixedViewport sidebar={sidebar}><div data-voople-scroll="" className="voople-scroll h-full overflow-y-auto px-5"><ProfilePageView posts={posts} card={<ProfileCard/>} renderPost={(post)=><Post key={post.id} post={post}/>} initialTab="posts"/></div></AppShellFrame>}
  createRoot(document.getElementById('root')).render(<AppThemeProvider><Demo/></AppThemeProvider>);`;

const bundle = await build({
  stdin: { contents: entry, resolveDir: repo, loader: "tsx" },
  bundle: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  alias: { "@": `${repo}/src` },
  define: { "process.env": '{"NODE_ENV":"development"}' },
});
const css = await loadCurrentVisualCss(repo, { host: "web" });
const logo = await readFile(path.join(repo, "public/favicon/android-chrome-192x192.png"));
const geistSans = await readFile(path.join(repo, "node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2"));
const server = createServer((request, response) => {
  if (request.url === "/favicon/android-chrome-192x192.png") { response.setHeader("Content-Type", "image/png"); response.end(logo); return; }
  if (request.url === "/fonts/geist-sans.woff2") { response.setHeader("Content-Type", "font/woff2"); response.end(geistSans); return; }
  if (request.url === "/app.js") { response.setHeader("Content-Type", "text/javascript"); response.end(bundle.outputFiles[0].text); return; }
  if (request.url === "/style.css") { response.setHeader("Content-Type", "text/css"); response.end(css); return; }
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end('<!doctype html><html data-app-theme="void"><head><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>');
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

let browser;
try {
  browser = await chromium.launch({ headless: true });
  for (const viewport of [{ width: 1440, height: 900, name: "profile.png" }, { width: 390, height: 844, name: "profile-mobile.png" }]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    if (await page.locator(".voople-profile-page").count() === 0) {
      throw new Error(`Profile fixture did not render: ${errors.join(" | ") || await page.locator("body").innerText()}`);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: path.join(artifacts, viewport.name), fullPage: false });
    console.log(`PASS profile ${viewport.width}px: no overflow or runtime errors`);
    await page.close();
  }
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
