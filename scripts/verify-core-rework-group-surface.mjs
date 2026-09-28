import { groupVoiceFixture } from "./lib/visual-group-voice.mjs";
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
  : await mkdtemp(path.join(os.tmpdir(), "voople-core-group-surface-"));
await mkdir(artifacts, { recursive: true });
console.log(`Screenshots: ${artifacts}`);

const require = createRequire(`${repo}/package.json`);
const { build } = require("esbuild");
const { chromium } = require("playwright");

const bundle = await build({
  stdin: { contents: groupVoiceFixture, resolveDir: repo, loader: "tsx" }, bundle: true, write: false,
  format: "iife", jsx: "automatic", alias: { "@": `${repo}/src` },
  define: { "process.env.NODE_ENV": '"development"' },
  plugins: [{ name: "profile-preview-fixture", setup(build) {
    build.onResolve({ filter: /^@tauri-apps\/api\/window$/ }, () => ({ path: "tauri-window", namespace: "fixture" }));
    build.onLoad({ filter: /^tauri-window$/, namespace: "fixture" }, () => ({ loader: "js", contents: "export const getCurrentWindow=()=>({minimize(){},toggleMaximize(){},close(){}});" }));
    // This layout fixture has no authenticated tRPC provider. Keep the preview trigger contract.
    build.onResolve({ filter: /^@\/components\/feed\/MiniProfilePopover$/ }, () => ({ path: "profile-preview", namespace: "fixture" }));
    build.onLoad({ filter: /^profile-preview$/, namespace: "fixture" }, () => ({ loader: "tsx", resolveDir: repo, contents: `
      import {useState} from 'react';
      export function MiniProfilePopover({author,children,renderDestination,previewOnClick,className}) {
        const [open,setOpen]=useState(false);
        return <span className={className} onClick={previewOnClick?()=>setOpen(true):undefined}>
          {children}{open ? renderDestination({href:'/'+author.username,label:'Открыть профиль '+author.displayName,className:'',active:false,children:'Профиль'}) : null}
        </span>;
      }
    ` }));
  } }],
});
const cssByHost = {
  web: await loadCurrentVisualCss(repo, { host: "web" }),
  desktop: await loadCurrentVisualCss(repo, { host: "desktop" }),
};
const messengerCss = await readFile(path.join(repo, "src/app/styles/messenger-glass.css"), "utf8");
for (const host of Object.keys(cssByHost)) {
  if (!cssByHost[host].includes(".voople-group-surface-header")) cssByHost[host] += `\n${messengerCss}`;
}
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
  const allVisualCases = ["web", "desktop"].flatMap(host => [
    {width:1440,theme:"void",host,count:8}, {width:1440,theme:"light",host,count:8},
    {width:1280,theme:"void",host,count:8}, {width:1100,theme:"void",host,count:8},
    {width:960,theme:"void",host,count:8},
    {width:390,theme:"void",host,count:8}, {width:390,theme:"light",host,count:8},
    {width:430,theme:"void",host,count:8}, {width:768,theme:"void",host,count:8},
    {width:360,theme:"light",host,count:8}, {width:1440,theme:"void",host,count:20},
    {width:390,theme:"light",host,count:20},
  ]);
  const visualCases = process.argv.includes("--correction-focus")
    ? allVisualCases.filter(({width,theme,count}) => [390,768,1100,1440].includes(width) && theme === "void" && count === 8)
    : allVisualCases;
  for (const {width, theme, host, count} of visualCases) {
    const page = await browser.newPage({viewport:{width,height:900}});
    const errors=[];
    page.on("pageerror", error=>errors.push(error.message));
    page.on("console", message=>{if(message.type()==="error")errors.push(message.text())});
    await page.addInitScript(value=>localStorage.setItem("voople:app-theme",value),theme);
    await page.goto(`http://127.0.0.1:${server.address().port}?host=${host}&count=${count}`);
    await page.evaluate(()=>document.fonts.ready);
    await page.getByRole("button",{name:"Открыть текущую комнату Лобби"}).waitFor();
    const groupWidth = width >= 1024 ? width - 220 : width;
    const expectedMode=groupWidth>=1120?"wide":groupWidth>=800?"medium":"compact";
    await page.locator(`.voople-group-surface[data-mode="${expectedMode}"]`).waitFor();
    assert.equal(await page.locator('.voople-group-workspace__live').count(),1);
    const groupIdentity = page.getByRole('button',{name:'Информация о группе VOICEKK'});
    assert.equal(await groupIdentity.count(),1);
    assert.equal(await page.getByRole('button',{name:'Пригласить в группу'}).count() >= 1,true);
    assert.equal(await page.locator('.voople-group-current-context').count(),0);
    if (host === 'desktop') {
      await page.locator('.desktop-titlebar__group-slot .voople-group-top-chrome').waitFor();
      assert.equal(await page.locator('.desktop-titlebar__controls button').count(),3);
      assert.equal(await page.locator('.voople-panel-header .voople-group-top-chrome').count(),0);
      assert.equal(await page.locator('.voople-sidebar__brand').evaluate(el=>getComputedStyle(el).display),'none');
      if (expectedMode !== 'compact') assert.equal(await page.locator('.voople-group-surface-header').evaluate(el=>getComputedStyle(el).display),'none');
    } else assert.equal(await page.locator('.voople-panel-header .voople-group-top-chrome').count(),1);
    assert.equal(await page.locator('.voople-group-pane-identity').count(),expectedMode==='compact'?0:1);
    assert.equal(await page.locator('.voople-group-pane-identity .voople-group-header-identity').count(),expectedMode==='compact'?0:1);
    if (expectedMode !== 'compact') assert.ok((await page.locator('.voople-group-pane-banner').boundingBox()).height >= 64);
    assert.equal(await page.locator('.voople-group-now').count(),1);
    assert.equal(await page.locator('.voople-group-workspace__chat').count(),expectedMode==="compact"?0:1);
    assert.equal(await page.locator('.voople-group-workspace__people').count(),expectedMode==="wide"?1:0);
    assert.equal(await page.locator('[role="tablist"][aria-label="Раздел группы"]').count(),expectedMode==="compact"?1:0);
    if(expectedMode!=="compact"){
      assert.equal(await page.getByRole('textbox',{name:'Сообщение группе'}).isVisible(),true);
      const chatWidth=await page.locator('.voople-group-workspace__chat').evaluate(el=>el.getBoundingClientRect().width);
      assert.ok(chatWidth>=520,`Chat remains readable: ${chatWidth}px`);
      assert.equal(await page.locator('.voople-group-workspace__live').evaluate(el=>getComputedStyle(el).overflowY),'hidden');
      assert.equal(await page.locator('.voople-group-workspace__rooms-scroll').evaluate(el=>getComputedStyle(el).overflowY),'auto');
      assert.equal(await page.locator('.voople-group-workspace__rooms-scroll').evaluate(el=>getComputedStyle(el).scrollbarWidth),'none');
      assert.equal(await page.locator('.voople-chat-window__messages').evaluate(el=>getComputedStyle(el).overflowY),'auto');
      const shadow=await page.locator('.voople-group-now-room--current').evaluate(el=>getComputedStyle(el).boxShadow);
      assert.ok(shadow==="none"||shadow.includes("inset"),`Current Room has no outer shadow: ${shadow}`);
    }
    if(expectedMode==="wide"){
      assert.equal(await page.locator('.voople-group-people').evaluate(el=>getComputedStyle(el).overflowY),'auto');
    }
    const room=page.locator('[data-layout="room-section"]');
    assert.deepEqual(await room.evaluateAll(nodes=>nodes.map(n=>n.dataset.roomKind)),["lobby","pinned","pinned","temporary"]);
    assert.equal(await room.first().locator('[data-participant-id]').count(),count);
    assert.equal(await page.locator('[data-participant-id]').count(),count+9);
    assert.equal(await room.nth(1).getByLabel("Микрофон выключен").count(),0);
    assert.equal(await room.nth(1).getByLabel("Камера включена").count(),0);
    assert.equal(await room.nth(1).locator('button button').count(),0);
    assert.equal(await page.getByText("Пустая временная").count(),0);
    assert.equal(await page.getByRole("button",{name:"Отделиться во временную комнату"}).count(),1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.notEqual(await page.locator('.voople-stage').evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
    if(width>=1024){
      await page.locator('#voople-sidebar-session-root .voople-voice-dock--compact').waitFor();
      assert.equal(await page.locator('.voople-sidebar').evaluate(el=>el.getBoundingClientRect().width),220);
      assert.ok((await page.locator('.voople-voice-dock--compact').boundingBox()).height<=84,'Sidebar dock stays compact');
    } else {
      assert.equal(await room.first().locator('.voople-group-now__participants').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),1);
      const dock=await page.locator('.voople-voice-dock--compact').boundingBox();
      const stage=await page.locator('.voople-stage').boundingBox();
      assert.ok(stage.y+stage.height<=dock.y,'Stage stays above mobile dock');
      assert.ok(dock.height<=90,`Mobile dock stays compact: ${dock.height}px`);
      for(const box of await page.locator('.voople-voice-compact__control').evaluateAll(nodes=>nodes.map(n=>({w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height}))))assert.ok(box.w>=44&&box.h>=44);
    }
    const compactControls=page.locator('.voople-voice-dock--compact');
    for(const label of ['Включить микрофон','Выключить звук собеседников','Включить камеру','Показать экран','Выйти из разговора']){
      assert.equal(await compactControls.getByRole('button',{name:label,exact:true}).isVisible(),true,`${label} is directly visible`);
    }
    assert.equal(await page.locator('.voople-voice-compact__controls button').count(),5);
    if (count===8 && theme==='void' && (width===390 || width===1440)) {
      await compactControls.getByRole('button',{name:'Включить микрофон'}).click();
      const speakingMic=compactControls.getByRole('button',{name:'Выключить микрофон'});
      await speakingMic.waitFor();
      assert.doesNotMatch(await speakingMic.getAttribute('class'),/voople-mic-speaking/);
      const localAvatar=room.first().locator('[data-participant-id="user-0"] .voople-avatar-speaking');
      await localAvatar.waitFor();
      await room.first().locator('[data-participant-id="user-1"] .voople-avatar-speaking').waitFor();
      await page.screenshot({path:path.join(artifacts,`group-${host}-speaking-${width}.png`)});
      await speakingMic.click();
    }
    await (expectedMode==="compact"
      ? page.locator('.voople-group-now__available [data-participant-id]').last()
      : room.first().locator('[data-participant-id]').last()).scrollIntoViewIfNeeded();
    assert.equal(await page.locator('.voople-stage').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
    await page.locator('.voople-group-workspace__rooms-scroll').evaluate(el=>{el.scrollTop=0});
    const file=path.join(artifacts,`group-${host}-workspace-${width}-${theme}-${count}.png`);
    await page.screenshot({path:file});
    const identityTop = expectedMode === 'compact' ? null : (await page.locator('.voople-group-pane-identity').boundingBox()).y;
    const roomsTop = expectedMode === 'compact' ? null : (await page.locator('.voople-group-workspace__rooms-scroll').boundingBox()).y;
    await groupIdentity.click();
    if (expectedMode === 'compact') {
      await page.getByRole('dialog',{name:'Информация о группе VOICEKK'}).waitFor();
      await page.keyboard.press('Escape');
      assert.equal(await page.getByRole('dialog',{name:'Информация о группе VOICEKK'}).count(),0);
    } else {
      assert.equal(await groupIdentity.getAttribute('aria-expanded'),'true');
      assert.equal(await page.getByRole('dialog',{name:'Информация о группе VOICEKK'}).count(),0);
      assert.equal((await page.locator('.voople-group-pane-identity').boundingBox()).y,identityTop);
      assert.ok((await page.locator('.voople-group-workspace__rooms-scroll').boundingBox()).y > roomsTop);
      await page.locator('.voople-group-workspace__rooms-scroll').evaluate(el=>{el.scrollTop=100});
      assert.equal((await page.locator('.voople-group-pane-identity').boundingBox()).y,identityTop);
      await groupIdentity.click();
      assert.equal(await groupIdentity.getAttribute('aria-expanded'),'false');
    }
    if(expectedMode==="medium" && count===8 && width===1100){
      const trigger=page.getByRole('button',{name:'Показать участников группы'});
      assert.ok(Math.abs((await trigger.boundingBox()).y-(await page.locator('.voople-chat-sections').boundingBox()).y) < 8);
      await trigger.click();
      await page.getByRole('complementary',{name:'Участники группы'}).waitFor();
      assert.equal(await page.locator('.voople-group-workspace__people').count(),0);
      assert.equal(await page.locator('.voople-group-workspace__people-drawer .voople-group-people').evaluate(el=>getComputedStyle(el).overflowY),'auto');
      await page.screenshot({path:path.join(artifacts,`group-${host}-people-drawer-1100-void.png`)});
      await page.keyboard.press('Escape');
      assert.equal(await page.getByRole('complementary',{name:'Участники группы'}).count(),0);
      assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
      for (const widthAfterLeavingMedium of [1440,390]) {
        await trigger.click();
        await page.getByRole('complementary',{name:'Участники группы'}).waitFor();
        await page.setViewportSize({width:widthAfterLeavingMedium,height:900});
        await page.locator(`.voople-group-surface[data-mode="${widthAfterLeavingMedium===1440?'wide':'compact'}"]`).waitFor();
        await page.setViewportSize({width:1100,height:900});
        await page.locator('.voople-group-surface[data-mode="medium"]').waitFor();
        assert.equal(await page.getByRole('complementary',{name:'Участники группы'}).count(),0);
        assert.equal(await trigger.getAttribute('aria-expanded'),'false');
      }
    }
    const person=room.first().getByRole('button',{name:'Действия участника Biba',exact:true});
    await person.click();
    await page.getByRole('slider').fill('150');
    assert.equal(await page.evaluate(()=>window.fixture.volumes['user-1']),1.5);
    await page.getByRole('menuitem',{name:'Сбросить до 100%'}).click();
    assert.equal(await page.evaluate(()=>window.fixture.volumes['user-1']),1);
    await person.focus();await person.press('Shift+F10');
    await page.getByRole('slider').waitFor();await page.getByRole('slider').focus();await page.keyboard.press('Escape');
    assert.equal(await person.evaluate(el=>el===document.activeElement),true);
    await person.click();await page.getByRole('menuitem',{name:'Заглушить',exact:true}).click();
    assert.equal(await page.evaluate(()=>window.fixture.volumes['user-1']),0);
    await person.click();await page.getByRole('menuitem',{name:'Вуп · отдельный разговор'}).click();
    assert.equal(await page.evaluate(()=>window.fixture.event),'voop:user-1');
    assert.equal(await room.count(),4);
    await page.getByRole('button',{name:'Отменить',exact:true}).click();
    await room.first().getByRole('button',{name:'Действия участника Гость',exact:true}).click();
    assert.equal(await page.getByRole('menuitem',{name:/Вуп/}).count(),0);
    assert.equal(await page.getByRole('menuitem',{name:'Открыть профиль'}).count(),0);
    await page.keyboard.press('Escape');
    await room.nth(1).locator('[data-participant-id]').first().click();
    await room.nth(1).getByRole('link',{name:/Открыть профиль/}).first().click();
    assert.match(await page.evaluate(()=>window.fixture.event),/^profile:/);
    await page.getByRole('button',{name:'Перейти в комнату DRG',exact:true}).click();
    await room.nth(1).getByText('Подключаемся…').waitFor();
    assert.equal(await room.first().getByText('Вы здесь').count(),1);
    await page.evaluate(()=>{window.fixture.setPending(null);window.fixture.setError('Пробное отключение: текущий разговор сохранён')});
    await page.getByRole('alert').waitFor();
    assert.equal(await room.first().getByText('Вы здесь').count(),1);
    if(expectedMode==="compact"){
      await page.getByRole('tab',{name:'Чат',exact:true}).click();
      assert.equal(await page.locator('.voople-group-workspace__live').count(),0);
      assert.equal(await page.locator('.voople-group-workspace__chat').count(),1);
      await page.getByRole('tab',{name:'Люди',exact:true}).click();
      assert.equal(await page.locator('.voople-group-workspace__chat').count(),0);
      assert.equal(await page.locator('.voople-group-workspace__people').count(),1);
    }
    assert.equal(await page.locator('.voople-group-live-shelf').count(),0);
    assert.equal(await page.locator('.voople-voice-dock--compact').count(),1);
    await page.getByRole('region',{name:'Компактный голосовой разговор'}).waitFor();
    if(host==="web" && width===1440 && theme==="void" && count===8){
      await page.setViewportSize({width:390,height:900});
      await page.locator('.voople-group-surface[data-mode="compact"]').waitFor();
      await page.getByRole('tab',{name:'Чат',exact:true}).click();
      assert.equal(await page.locator('.voople-group-workspace__chat').count(),1);
      assert.equal(await page.locator('.voople-group-workspace__live').count(),0);
      await page.setViewportSize({width:1440,height:900});
      await page.locator('.voople-group-surface[data-mode="wide"]').waitFor();
      assert.equal(await page.locator('.voople-group-workspace__chat').count(),1);
      assert.equal(await page.locator('.voople-group-workspace__live').count(),1);
    }
    assert.deepEqual(errors,[]);
    console.log(`PASS ${host} ${width}px ${theme} ${count} people: roster, privacy, volume, keyboard, pending, dock, overflow`);
    await page.close();
  }
} finally {
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
