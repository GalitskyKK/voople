import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";

const repo = fileURLToPath(new URL("../", import.meta.url)).replaceAll("\\", "/").replace(/\/$/, "");
const require = createRequire(`${repo}/package.json`);
const { build } = require("esbuild");
const { chromium } = require("playwright");
const artifacts = await mkdtemp(path.join(os.tmpdir(), "voople-invite-sharing-"));
console.log(`Screenshots: ${artifacts}`);
const mock = `import {useState} from 'react';const invalidate=async()=>{};
  export const trpc={useUtils:()=>({chat:{coreRoomInviteCandidates:{invalidate}}}),chat:{
    coreRoomInviteCandidates:{useQuery:()=>{const [state,setState]=useState({data:[],isLoading:true,fetchStatus:'fetching'});window.setCandidates=setState;return {...state,refetch:async()=>{}}}},
    coreSendRoomInvite:{useMutation:()=>({isPending:false,mutateAsync:async()=>{}})},
    coreCancelRoomInvite:{useMutation:()=>({isPending:false,mutateAsync:async()=>{}})}
  }};`;
const entry = `import {StrictMode} from 'react';import {createRoot} from 'react-dom/client';
  import {CoreRoomInvitePanel} from '@/components/chat/voice/CoreRoomInvitePanel';
  import {AppThemeProvider,useAppTheme} from '@/components/theme/AppThemeProvider';
  function Theme(){const theme=useAppTheme();window.changeTheme=theme.setThemeId;return null}
  createRoot(document.getElementById('root')).render(<StrictMode><AppThemeProvider><Theme/><div className="mx-auto max-w-xl bg-[var(--app-surface)] p-4"><CoreRoomInvitePanel sessionId="session" enabled/></div></AppThemeProvider></StrictMode>);`;
const bundle = await build({
  stdin: { contents: entry, resolveDir: repo, loader: "tsx" }, bundle: true, write: false,
  format: "iife", jsx: "automatic", alias: { "@": `${repo}/src` }, define: { "process.env.NODE_ENV": '"development"' },
  plugins: [{ name: "mock-query", setup(builder) {
    builder.onResolve({ filter: /^@\/lib\/trpc\/client$/ }, () => ({ path: "query", namespace: "mock" }));
    builder.onLoad({ filter: /.*/, namespace: "mock" }, () => ({ contents: mock, loader: "tsx", resolveDir: repo }));
  } }],
});
const cssRoot = path.join(repo, "desktop/dist/assets");
const cssFiles = (await readdir(cssRoot, { recursive: true })).filter(file => file.endsWith(".css"));
const css = (await Promise.all(cssFiles.map(file => readFile(path.join(cssRoot, file), "utf8")))).join("\n");
const server = createServer((request, response) => {
  if (request.url === "/app.js") { response.setHeader("Content-Type", "text/javascript"); response.end(bundle.outputFiles[0].text); }
  else if (request.url === "/style.css") { response.setHeader("Content-Type", "text/css"); response.end(css); }
  else { response.setHeader("Content-Type", "text/html; charset=utf-8"); response.end('<!doctype html><html><head><link rel="stylesheet" href="/style.css"></head><body style="background:var(--background)"><main id="root"></main><script src="/app.js"></script></body></html>'); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true });
  for (const width of [360, 1280]) for (const theme of ["void", "light"]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.clock.install({ time: new Date("2026-09-04T10:00:00Z") });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByText("Загружаем участников", { exact: true }).waitFor();
    await page.evaluate(theme => {
      window.changeTheme(theme);window.copies=[];window.shares=[];window.mode="copy";
      Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async(value)=>{
        if(window.mode==="denied")throw new Error("test denied");
        if(window.mode==="pending")await new Promise(resolve=>window.finishCopy=resolve);
        window.copies.push(value);
      }}});
      Object.defineProperty(navigator,"share",{configurable:true,value:async(data)=>{
        if(window.mode==="abort")throw new DOMException("cancelled","AbortError");window.shares.push(data);
      }});
    }, theme);
    await page.waitForFunction(theme => document.documentElement.dataset.appTheme === theme, theme);
    const url="https://voople.ru/room-invites/10000000-0000-4000-8000-000000000001";
    const candidate={id:"person",displayName:"Участник с длинным именем",username:"long_username_for_invitation",avatarUrl:null,invite:{id:"10000000-0000-4000-8000-000000000001",status:"pending",expiresAt:"2026-09-04T10:15:00Z",shareUrl:url}};
    const set=async(data)=>page.evaluate(data=>window.setCandidates({data:[data],isLoading:false,fetchStatus:"idle"}),data);
    await set(candidate);
    const copy=page.getByRole("button",{name:"Скопировать ссылку",exact:true});
    const share=page.getByRole("button",{name:"Поделиться",exact:true});
    await copy.waitFor();await page.screenshot({path:path.join(artifacts,`sharing-${width}-${theme}.png`)});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await copy.focus();assert.equal(await copy.evaluate(el=>el===document.activeElement),true);
    await page.evaluate(()=>window.mode="pending");await copy.click();assert.equal(await copy.isDisabled(),true);
    await page.evaluate(()=>window.finishCopy());await page.getByRole("button",{name:"Ссылка скопирована",exact:true}).waitFor();
    assert.deepEqual(await page.evaluate(()=>window.copies),[url]);
    await page.clock.fastForward(2100);
    await page.evaluate(()=>window.mode="abort");await share.click();await share.waitFor();
    assert.deepEqual(await page.evaluate(()=>window.copies),[url]);
    await page.evaluate(()=>window.mode="share");await share.click();await page.getByRole("button",{name:"Ссылка отправлена",exact:true}).waitFor();
    assert.deepEqual(await page.evaluate(()=>window.shares.map(item=>Object.keys(item).filter(key=>item[key]!==undefined).sort())),[["title","url"]]);
    await page.evaluate(()=>window.mode="denied");await copy.click();await page.getByRole("alert").waitFor();
    await page.evaluate(()=>window.mode="copy");await copy.click();await page.getByRole("button",{name:"Ссылка скопирована",exact:true}).waitFor();
    assert.equal(await page.getByRole("alert").count(),0);
    await page.context().setOffline(true);await page.getByText(/Нет подключения/).waitFor();assert.equal(await share.count(),0);
    await page.context().setOffline(false);await copy.waitFor();
    await page.clock.fastForward(16*60*1000);await page.getByText("Истекло",{exact:true}).waitFor();assert.equal(await copy.count(),0);
    await set({...candidate,invite:{...candidate.invite,status:"cancelled"}});await page.getByText("Отменено",{exact:true}).waitFor();assert.equal(await share.count(),0);
    assert.deepEqual(errors,[]);
    console.log(`PASS ${width}px ${theme}: pending/copy, share/cancel, clipboard retry, offline, expiry, revoked status, keyboard and overflow`);
    await page.close();
  }
} finally {
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
