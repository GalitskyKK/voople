import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../", import.meta.url))
  .replaceAll("\\", "/")
  .replace(/\/$/, "");
const distRoot = path.resolve(
  process.argv[2] ?? path.join(repo, "desktop/dist"),
);
const artifacts = await mkdtemp(
  path.join(os.tmpdir(), "voople-core-rework-shell-"),
);
console.log(`Screenshots: ${artifacts}`);

const require = createRequire(`${repo}/package.json`);
const { build } = require("esbuild");
const { chromium } = require("playwright");

const entry = `import {useRef} from 'react';import {createRoot} from 'react-dom/client';
  import {Search} from 'lucide-react';
  import {AppThemeProvider,useAppTheme} from '@/components/theme/AppThemeProvider';
  import {AppSidebarVisual} from '@/components/layout/AppNavigationVisual';
  import {AppShellFrame} from '@/components/layout/AppShellFrame';
  import {MessengerSidebarView} from '@/components/layout/MessengerSidebarView';
  import {MessagesLayoutView} from '@/components/chat/MessagesLayoutView';
  import {ChatConversationStart} from '@/components/chat/ChatConversationStart';
  import {ChatThreadFrameView} from '@/components/chat/ChatThreadFrameView';
  import {GroupAvatar} from '@/components/chat/GroupAvatar';
  import {ProfileAvatar} from '@/components/profile/ProfileAvatar';
  function ThemeControl(){const theme=useAppTheme();window.changeTheme=theme.setThemeId;return null}
  const common={parentChatId:null,topicsEnabled:false,topicsLayout:'tabs',topicIcon:null,groupVisibility:'private',joinPolicy:'invite_only',sectionAccessMode:'inherit',groupBannerUrl:null,groupTag:null,boostCount:0,boostedByMe:false,viewerRole:'member',lastMessage:null,channels:[]};
  const chats=[
    {...common,id:'group-1',type:'group',name:'VOICEKK',groupIcon:'V',groupAvatarUrl:null,groupAccentColor:'#8b5cf6',memberCount:7,otherUser:null,lastMessage:{preview:'7 участников',text:null,createdAt:'',senderId:''}},
    {...common,id:'group-2',type:'group',name:'Мы',groupIcon:'W',groupAvatarUrl:null,groupAccentColor:'#4ade80',memberCount:2,otherUser:null},
    {...common,id:'direct-1',type:'direct',name:null,groupIcon:null,groupAvatarUrl:null,groupAccentColor:null,memberCount:2,otherUser:{id:'astra',username:'astra',displayName:'Astra',hasVooplePlus:false,avatarUrl:null,avatarDecorationUrl:null,avatarRingId:null,lastSeenAt:null},lastMessage:{preview:'почти здесь',text:'почти здесь',createdAt:'',senderId:''}},
    {...common,id:'direct-2',type:'direct',name:null,groupIcon:null,groupAvatarUrl:null,groupAccentColor:null,memberCount:2,otherUser:{id:'biba',username:'biba',displayName:'Biba',hasVooplePlus:false,avatarUrl:null,avatarDecorationUrl:null,avatarRingId:null,lastSeenAt:null}}
  ];
  const renderDestination=({href,label,className,active,children})=><button type="button" data-href={href} aria-label={label} aria-current={active?'page':undefined} className={className}>{children}</button>;
  function Inbox(){return <div className="flex min-h-0 flex-1 flex-col"><div className="border-b border-[var(--app-border)] px-3 py-3"><p className="text-xs font-semibold uppercase tracking-[0.12em]">Личные сообщения</p><div className="mt-2 flex h-8 items-center gap-2 border border-[var(--app-border)] px-2 text-xs text-[var(--app-muted)]"><Search className="h-3.5 w-3.5"/>Поиск</div></div><div className="space-y-0.5 p-2">{chats.filter(c=>c.type==='direct').map(c=><button key={c.id} className="flex h-11 w-full items-center gap-2 border-l-2 border-transparent px-2 text-left text-xs"><ProfileAvatar displayName={c.otherUser.displayName} size="sm" shape="square"/><span>{c.otherUser.displayName}</span></button>)}</div></div>}
  function Thread(){const messagesRef=useRef(null);const contentRef=useRef(null);return <ChatThreadFrameView accentColor="#8b5cf6" header={<header className="flex min-h-14 items-center gap-3 border-b border-[var(--app-border)] px-4"><GroupAvatar name="VOICEKK" icon="V" size="sm" shape="square"/><div><p className="text-sm font-semibold">VOICEKK</p><p className="text-[10px] text-emerald-400">7 участников</p></div></header>} timeline={[]} messagesRef={messagesRef} messagesContentRef={contentRef} renderMessage={()=>null} emptyState={<ChatConversationStart chatTitle="VOICEKK" isGroup isSubchat={false} memberCount={7} groupIcon="V" groupAccentColor="#8b5cf6" otherOnline={false}/>} composer={<div className="border-t border-[var(--app-border)] p-2"><div className="flex h-10 items-center border border-[var(--app-border)] px-3 text-xs text-[var(--app-muted)]">Сообщение VOICEKK…</div></div>}/>}
  function Demo(){const sidebar=<AppSidebarVisual pathname="/messages/group-1" collapsed={false} renderDestination={renderDestination} primaryNavigation={<MessengerSidebarView pathname="/messages/group-1" chats={chats} loading={false} onlineUserIds={new Set(['astra'])} createGroupAction={<button type="button" aria-label="Создать группу" className="h-5 w-5 border border-[var(--app-border)] text-xs">+</button>} renderDestination={renderDestination} onRetry={()=>{}}/>} accountNavigation={<button type="button" className="flex w-full items-center gap-2 px-2 py-1 text-left"><ProfileAvatar displayName="Yozhik" size="sm" shape="square" isOnline/><span className="text-xs">Yozhik</span></button>}/>;return <AppShellFrame routeKind="messages" fixedViewport sidebar={sidebar}><MessagesLayoutView isThread list={<Inbox/>} thread={<Thread/>}/></AppShellFrame>}
  createRoot(document.getElementById('root')).render(<AppThemeProvider><ThemeControl/><Demo/></AppThemeProvider>);`;

const bundle = await build({
  stdin: { contents: entry, resolveDir: repo, loader: "tsx" },
  bundle: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  alias: { "@": `${repo}/src` },
  define: { "process.env.NODE_ENV": '"development"' },
});

const cssFiles = (
  await readdir(path.join(distRoot, "assets"), { recursive: true })
).filter((file) => file.endsWith(".css"));
const css = (
  await Promise.all(
    cssFiles.map((file) =>
      readFile(path.join(distRoot, "assets", file), "utf8"),
    ),
  )
).join("\n");
const logo = await readFile(
  path.join(repo, "public/favicon/android-chrome-192x192.png"),
);

const server = createServer((request, response) => {
  if (request.url === "/favicon/android-chrome-192x192.png") {
    response.setHeader("Content-Type", "image/png");
    response.end(logo);
    return;
  }
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
  response.end(
    '<!doctype html><html><head><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>',
  );
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

let browser;
try {
  browser = await chromium.launch({ headless: true });
  for (const { width, height, theme } of [
    { width: 360, height: 800, theme: "void" },
    { width: 1024, height: 720, theme: "void" },
    { width: 1280, height: 800, theme: "void" },
    { width: 1280, height: 800, theme: "light" },
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(() => typeof window.changeTheme === "function");
    await page.evaluate((value) => window.changeTheme(value), theme);
    await page.waitForFunction(
      (value) => document.documentElement.dataset.appTheme === value,
      theme,
    );
    await page.getByRole("heading", { name: "Начало группы VOICEKK" }).waitFor();

    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    );
    assert.equal(
      await page.evaluate(() =>
        [...document.images].every(
          (candidate) => candidate.complete && candidate.naturalWidth > 0,
        ),
      ),
      true,
    );
    if (width >= 1024) {
      assert.equal(
        await page.locator(".voople-sidebar").evaluate((node) =>
          Math.round(node.getBoundingClientRect().width),
        ),
        200,
      );
    }
    if (width === 1024) {
      assert.equal(
        await page.locator(".voople-messages-layout > div > aside").isVisible(),
        false,
      );
    }
    assert.deepEqual(errors, []);
    await page.screenshot({
      path: path.join(artifacts, `messenger-shell-${width}-${theme}.png`),
    });
    console.log(`PASS ${width}px ${theme}: dense shell, responsive priority, no overflow`);
    await page.close();
  }
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
