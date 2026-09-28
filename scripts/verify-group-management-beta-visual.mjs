import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCurrentVisualCss } from "./lib/load-current-visual-css.mjs";

const repo = fileURLToPath(new URL("../", import.meta.url)).replaceAll("\\", "/").replace(/\/$/, "");
const artifacts = await mkdtemp(path.join(os.tmpdir(), "voople-group-management-"));
console.log(`Screenshots: ${artifacts}`);
const require = createRequire(`${repo}/package.json`);
const { build } = require("esbuild");
const { chromium } = require("playwright");
const mocks = {
  "next/link": `export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>}`,
  "next/navigation": `export const useRouter=()=>({replace(){},push(){},refresh(){}});`,
  "@/lib/supabase/client": `export const createClient=()=>({auth:{getUser:async()=>({data:{user:window.mockAuth?{id:'me'}:null}})}});`,
  "@/lib/telemetry/client": `export const reportProductEvent=()=>{};`,
  "@/lib/trpc/client": `export const trpc={chat:{invitePreview:{useQuery:()=>({data:{available:true,chatName:'DRG',groupTag:'DRG',groupAvatarUrl:null,groupBannerUrl:null,groupIcon:'D',groupAccentColor:'#80bdf7',memberCount:6,onlineCount:3,roomParticipantCount:2},isLoading:false,error:null,refetch:async()=>{}})},acceptInvite:{useMutation:()=>({mutate(){},isPending:false,error:null})}}};`,
};
const entry = `import {useState} from 'react';import {createRoot} from 'react-dom/client';
import {AppThemeProvider} from '@/components/theme/AppThemeProvider';
import {GroupManagementSheetView} from '@/components/chat/GroupManagementSheetView';
import {GroupInfoDrawerView} from '@/components/chat/GroupInfoDrawerView';
import {ChatInvitePage} from '@/components/chat/ChatInvitePage';
const members=[{type:'user',id:'a',username:'astra',displayName:'Astra',avatarUrl:null,role:'owner',roleColor:null},{type:'user',id:'b',username:'biba',displayName:'Biba',avatarUrl:null,role:'member',roleColor:null}];
const community={description:'Команда для игр и разговоров.',icon:'D',avatarUrl:null,bannerUrl:null,effectiveBannerUrl:null,tag:'DRG',publicSlug:null,accentColor:'#80bdf7',effectiveAccentColor:'#80bdf7',vanityInviteSlug:null,roleColors:{owner:null,admin:null,member:null},animatedIconEnabled:false,animatedBannerEnabled:false,boostUnlocksTag:true,boostUnlocksAccent:true,boostUnlocksRoleStyles:false,boostUnlocksVanityInvite:false};
const props={chatId:'group',chatName:'DRG',memberCount:6,groupIcon:'D',groupAvatarUrl:null,groupAccentColor:'#80bdf7',groupTag:'DRG',viewerRole:'owner',canManage:true,topicsEnabled:false,topicsLayout:'tabs',groupVisibility:'private',joinPolicy:'invite_only',loadMembers:async()=>members,loadAudit:async()=>[],searchContacts:async()=>[],addMembers:async()=>{},createInvite:async()=>({token:'sample'}),revokeInvite:async()=>{},updateTopics:async()=>{},updateVisibility:async()=>{},loadJoinRequests:async()=>[],resolveJoinRequest:async()=>{},loadInterestCatalog:async()=>({categories:[],topics:[]}),loadDiscoveryProfile:async()=>({primaryCategorySlug:null,topicSlugs:[],language:'ru',region:null,topicLimit:5}),updateDiscoveryProfile:async(value)=>value,updateName:async(name)=>({name}),loadCommunity:async()=>community,updateCustomization:async()=>community,uploadAvatar:async()=>({mediaKey:'avatar',previewUrl:''}),uploadBanner:async()=>({mediaKey:'banner',previewUrl:''}),loadEmojis:async()=>({items:[],limit:0}),createEmoji:async()=>{},deleteEmoji:async()=>{},loadSounds:async()=>({items:[],limit:0}),createSound:async()=>{},deleteSound:async()=>{},setBoost:async()=>community,setPerk:async()=>community,removeMember:async()=>{},changeMemberRole:async()=>{},transferOwnership:async()=>{},leaveGroup:async()=>{},deleteGroup:async()=>{},onGroupClosed:()=>{},renderAvatar:()=>null,presentation:'page',onBack:()=>{}};
const now={groupId:'group',groupName:'DRG',visibleOnlineCount:3,onlineOutsideRooms:[],rooms:[{id:'lobby',kind:'lobby',name:'Лобби',state:'active',participantCount:2,participants:members,liveSessionId:'s1',joinTarget:{kind:'room',roomId:'lobby'},hasScreenShare:false}]};
function Info(){const [open,setOpen]=useState(true);return <GroupInfoDrawerView open={open} onOpenChange={setOpen} chatName="DRG" memberCount={6} groupIcon="D" groupAvatarUrl={null} groupBannerUrl={null} groupAccentColor="#80bdf7" groupTag="DRG" canManage description={community.description} members={members} now={now} onManage={()=>{}} onInvite={()=>{}} onOpenPeople={()=>{window.openedPeople=true}} onOpenProfile={()=>{}}/>}
const surface=new URLSearchParams(location.search).get('surface');window.mockAuth=new URLSearchParams(location.search).get('auth')!=='guest';
createRoot(document.getElementById('root')).render(<AppThemeProvider>{surface==='settings'?<GroupManagementSheetView {...props}/>:surface==='info'?<Info/>:<ChatInvitePage token="sample-token"/>}</AppThemeProvider>);`;
const bundle = await build({ stdin: { contents: entry, resolveDir: repo, loader: "tsx" }, bundle: true, write: false, format: "iife", jsx: "automatic", alias: { "@": `${repo}/src` }, define: { "process.env.NODE_ENV": '"development"' }, plugins: [{ name: "fixture-transports", setup(builder) { builder.onResolve({ filter: /.*/ }, (args) => mocks[args.path] ? { path: args.path, namespace: "mock" } : undefined); builder.onLoad({ filter: /.*/, namespace: "mock" }, (args) => ({ contents: mocks[args.path], loader: "tsx", resolveDir: repo })); } }] });
const baseCss = await loadCurrentVisualCss(repo, { host: "web" });
const css = baseCss.includes(".voople-group-surface-header") ? baseCss
  : `${baseCss}\n${await readFile(path.join(repo, "src/app/styles/messenger-glass.css"), "utf8")}`;
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
  const cases = [
    ...[1440, 1100, 390, 360].flatMap((width) => ["void", "light"].map((theme) => ({ surface: "settings", width, theme, section: "Основное" }))),
    ...["Люди", "Приглашения и доступ", "Оформление", "Дополнительно"].map((section) => ({ surface: "settings", width: 390, theme: "void", section })),
    ...[1440, 390, 360].flatMap((width) => ["void", "light"].map((theme) => ({ surface: "info", width, theme }))),
    ...[1280, 390, 360].flatMap((width) => ["void", "light"].map((theme) => ({ surface: "invite", width, theme }))),
    { surface: "invite", width: 390, theme: "void", auth: "guest" },
  ];
  for (const item of (process.argv.includes("--mobile-settings-only") ? cases.filter((item) => item.surface === "settings" && item.width === 390) : cases)) {
    const page = await browser.newPage({ viewport: { width: item.width, height: 844 } });
    const errors = []; page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((theme) => localStorage.setItem("voople:app-theme", theme), item.theme);
    await page.goto(`http://127.0.0.1:${server.address().port}/?surface=${item.surface}&auth=${item.auth ?? "user"}`);
    if (item.surface === "settings") {
      await page.getByRole("navigation", { name: "Настройки группы" }).getByRole("button", { name: item.section }).click();
      await page.getByRole("heading", { name: "Настройки группы" }).waitFor();
    } else if (item.surface === "info") await page.getByRole("button", { name: "Все люди" }).waitFor();
    else await page.getByRole("heading", { name: "DRG" }).waitFor();
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow ${JSON.stringify(item)}`);
    assert.deepEqual(errors, [], `runtime ${JSON.stringify(item)}`);
    const name = `${item.surface}-${item.section?.replaceAll(" ", "-") ?? "preview"}-${item.width}-${item.theme}${item.auth ? `-${item.auth}` : ""}.png`;
    await page.screenshot({ path: path.join(artifacts, name) });
    if (item.surface === "info") {
      await page.getByRole("button", { name: "Все люди" }).click();
      assert.equal(await page.evaluate(() => window.openedPeople), true);
    }
    if (item.surface === "invite" && item.auth === "guest") {
      assert.match(await page.getByRole("link", { name: "Войти" }).getAttribute("href"), /invite%2Fsample-token|invite\/sample-token/);
    }
    console.log(`PASS ${name}`);
    await page.close();
  }
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
