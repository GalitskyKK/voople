import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
const repo = fileURLToPath(new URL("../", import.meta.url)).replaceAll("\\", "/").replace(/\/$/, "");
const artifacts = await mkdtemp(path.join(os.tmpdir(), "voople-invite-preview-"));
console.log(`Screenshots: ${artifacts}`);
const require = createRequire(`${repo}/package.json`);
const { build } = require("esbuild");
const { chromium } = require("playwright");
const mocks = {
  "@/lib/trpc/client": `import {useState} from 'react';
    const invalidate=async()=>{};
    export const trpc={useUtils:()=>({notifications:{list:{invalidate},unreadCount:{invalidate}},chat:{coreRoomInvitePreview:{invalidate}}}),chat:{
      coreRoomInvitePreview:{useQuery:(input,options)=>{window.queryOptions=options;const [query,setQuery]=useState({isPending:true,fetchStatus:'fetching'});window.setPreview=setQuery;return {...query,refetch:()=>{window.retries++;return Promise.resolve()}}}},
      coreRespondRoomInvite:{useMutation:({onSuccess})=>{const [data,setData]=useState();const run=async(input)=>{const result={status:input.response};setData(result);await onSuccess(result);return result};return {data,isPending:false,error:null,mutate:run,mutateAsync:run}}}}};`,
  "@/hooks/useGroupNowRoomJoin": `export const useGroupNowRoomJoin=()=>({pending:false,requestJoin:async()=>{window.joins++},confirmationTarget:null,cancelSwitch(){},confirmSwitch(){}});`,
  "@/components/chat/voice/VoiceSessionProvider": `export const useVoiceSession=()=>({openCoreRoom(){}});`,
};
const entry = `import {StrictMode} from 'react';import {createRoot} from 'react-dom/client';
  import {CoreRoomInvitePreview} from '@/components/chat/voice/CoreRoomInvitePreview';
  import {AppThemeProvider,useAppTheme} from '@/components/theme/AppThemeProvider';
  function ThemeControl(){const theme=useAppTheme();window.changeTheme=theme.setThemeId;return null}
  window.retries=0;window.joins=0;createRoot(document.getElementById('root')).render(<StrictMode><AppThemeProvider><ThemeControl/><CoreRoomInvitePreview inviteId="10000000-0000-4000-8000-000000000001"/></AppThemeProvider></StrictMode>);`;
const bundle=await build({stdin:{contents:entry,resolveDir:repo,loader:'tsx'},bundle:true,write:false,format:'iife',jsx:'automatic',alias:{'@':`${repo}/src`},define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'isolated-transports',setup(builder){builder.onResolve({filter:/.*/},args=>mocks[args.path]?{path:args.path,namespace:'mock'}:undefined);builder.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:mocks[args.path],loader:'tsx',resolveDir:repo}));}}]});
const cssRoot=path.join(repo,'desktop/dist/assets');
const cssFiles=(await readdir(cssRoot,{recursive:true})).filter(file=>file.endsWith('.css'));
const css=(await Promise.all(cssFiles.map(file=>readFile(path.join(cssRoot,file),'utf8')))).join('\n');
const server=createServer((req,res)=>{if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text)}else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(css)}else{res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html><head><link rel="stylesheet" href="/style.css"></head><body><main id="root"></main><script src="/app.js"></script></body></html>')}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
  browser=await chromium.launch({headless:true});
  for(const width of [360,1280])for(const theme of ['void','light']){
    const page=await browser.newPage({viewport:{width,height:800}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.clock.install({time:new Date('2026-09-04T10:00:00Z')});
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByText('Загружаем приглашение',{exact:true}).waitFor();
    await page.evaluate(theme=>window.changeTheme(theme),theme);
    await page.waitForFunction(theme=>document.documentElement.dataset.appTheme===theme,theme);
    const invite={id:'10000000-0000-4000-8000-000000000001',status:'pending',expiresAt:'2026-09-04T10:15:00Z',groupId:'group',groupName:'Группа с длинным названием для проверки переноса',inviter:{id:'sender',displayName:'УчастникСОченьДлиннымИменемБезПробеловДляПроверкиПереноса',username:'sender',avatarUrl:null},room:{id:'room',name:'КомнатаСОченьДлиннымНазваниемБезПробеловДляПроверкиПереноса',participantCount:3,hasScreenShare:true}};
    const set=async(value)=>page.evaluate(value=>window.setPreview(value),value);
    await set({data:invite,isPending:false,fetchStatus:'idle'});
    const join=page.getByRole('button',{name:/^Зайти в /});
    await join.waitFor();await join.click();assert.equal(await page.evaluate(()=>window.joins),1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    const box=await join.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width);
    await page.screenshot({path:path.join(artifacts, `invite-${width}-${theme}.png`)});
    await page.context().setOffline(true);
    await page.getByText('Нет подключения',{exact:true}).waitFor();assert.equal(await join.count(),0);
    assert.equal(await page.getByText(invite.room.name,{exact:true}).count(),0);
    await page.context().setOffline(false);await join.waitFor();
    await set({data:invite,isPending:false,fetchStatus:'idle',error:{message:'private backend details'}});
    await page.getByRole('alert').waitFor();assert.equal(await join.count(),0);
    assert.equal(await page.getByText('private backend details',{exact:true}).count(),0);
    await page.getByRole('button',{name:'Повторить',exact:true}).click();assert.equal(await page.evaluate(()=>window.retries),1);
    await set({data:null,isPending:false,fetchStatus:'idle'});
    await page.getByText('Приглашение недоступно',{exact:true}).waitFor();
    await set({data:invite,isPending:false,fetchStatus:'idle'});await join.waitFor();
    await page.clock.fastForward(15*60*1000+1000);
    await page.getByText('Приглашение истекло',{exact:true}).waitFor();assert.equal(await join.count(),0);
    await set({data:{...invite,expiresAt:'2026-09-04T11:00:00Z'},isPending:false,fetchStatus:'idle'});await join.waitFor();
    await page.getByRole('button',{name:'Отклонить',exact:true}).click();
    await page.getByText('Приглашение отклонено',{exact:true}).waitFor();
    await set({data:{...invite,status:'cancelled',room:null},isPending:false,fetchStatus:'idle'});
    await page.getByText('Приглашение отменено',{exact:true}).waitFor();
    await page.getByRole('link',{name:'К уведомлениям'}).focus();
    assert.equal(await page.getByRole('link',{name:'К уведомлениям'}).evaluate(el=>el===document.activeElement),true);
    assert.deepEqual(errors,[]);
    console.log(`PASS ${width}px ${theme}: loading, long names, join delegation, offline/recovery, error/retry, unavailable, expiry, decline/cancel, keyboard; no page errors`);
    await page.close();
  }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
