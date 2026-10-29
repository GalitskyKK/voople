import assert from "node:assert/strict";
import path from "node:path";
import { verifyOrbitMedia } from "./verify-orbit-media.mjs";

async function openFixture(browser, baseUrl, host, theme, width, height, suffix = "") {
  const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 1024 });
  const errors = [];
  page.on("pageerror", error => { errors.push(error.message); console.error("Fixture page error:", error.stack); });
  await page.addInitScript(theme => {
    localStorage.setItem("voople:app-theme", theme);
    localStorage.setItem("voople:app-preferences", JSON.stringify({ interfaceDesign: "orbit" }));
    localStorage.removeItem("voople:sidebar-collapsed:v1");
  }, theme);
  await page.goto(`${baseUrl}?host=${host}&search=1&orbit-test=1&room-stage-test=1${suffix}`);
  await page.locator('html[data-interface-design="orbit"]').waitFor({state:"attached"});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(650);
  return { page, errors };
}

async function verifyCallActions(page, surface, mobile, artifacts, host, width, theme) {
  const tile = surface.locator('[data-call-participant="user-1"]');
  const before = await tile.boundingBox();
  const avatar = await tile.locator('.voople-orbit-call-tile__identity').boundingBox();
  assert.ok(Math.abs(avatar.width - before.width) < 1 && Math.abs(avatar.height - before.height) < 1, 'canonical identity fills its square without inheriting legacy offsets');
  assert.ok(Math.abs(avatar.x - before.x) < 1 && Math.abs(avatar.y - before.y) < 1);
  if (mobile) await tile.getByRole('button', {name:'Действия участника Biba',exact:true}).tap();
  else {
    await tile.hover();await page.waitForTimeout(550);
    const after = await tile.boundingBox();
    assert.ok(Math.abs(before.x + before.width / 2 - after.x - after.width / 2) < 1);
    assert.ok(Math.abs(before.y + before.height / 2 - after.y - after.height / 2) < 1);
    assert.ok(after.width > before.width && after.width < before.width * 1.1);
    await tile.click({button:'right'});
  }
  const menu = page.getByRole('menu', {name:'Действия участника Biba',exact:true});await menu.waitFor();
  assert.equal(await menu.locator('.voople-orbit-room-menu__item').count(), 2);
  const slider = menu.getByRole('slider');await slider.focus();await slider.press('End');
  assert.equal(await page.evaluate(() => window.fixture.volumes['user-1']), 2);
  await menu.getByRole('menuitem', {name:'Заглушить',exact:true}).click();await menu.waitFor({state:'detached'});
  assert.equal(await page.evaluate(() => window.fixture.volumes['user-1']), 0);
  await tile.focus();await tile.press('Shift+F10');await menu.waitFor();
  await page.waitForTimeout(420);
  await page.screenshot({path:path.join(artifacts,`orbit-call-actions-${host}-${width}-${theme}.png`)});
  await page.keyboard.press('Escape');await menu.waitFor({state:'detached'});
  assert.equal(await surface.count(), 1, 'Escape dismisses participant actions before the call');
}

async function verifyEmbeddedRoom(page, artifacts, host, width, theme) {
  const current = page.locator('[data-orbit-room-id="lobby"]');
  const mobile = width < 1024;
  if (mobile) await current.locator('.voople-orbit-room__cover').tap();
  else await current.locator('.voople-orbit-room__cover').click();
  if (mobile) await current.locator('.voople-orbit-room__touch-enter').click();
  const surface = page.locator('[data-room-presentation="embedded"]');
  await surface.waitFor();await page.waitForTimeout(300);
  const target = await page.locator('[data-voople-room-group="group-1"]').boundingBox();
  const frame = await surface.boundingBox();
  for (const key of ['x','y','width','height']) assert.ok(Math.abs(frame[key] - target[key]) < 2, `Room matches chat pane ${key}`);
  const footer = await surface.locator('.voople-full-room__footer').boundingBox();
  assert.ok(footer.y + footer.height <= frame.y + frame.height + 1, 'call controls remain inside the embedded pane');
  assert.equal(await surface.locator('.voople-full-room__footer').evaluate(node => getComputedStyle(node).backgroundColor), 'rgba(0, 0, 0, 0)', 'footer never paints an old dark strip under media buttons');
  const normalButtons = surface.locator('.voople-orbit-call-controls button').filter({hasNot: page.locator('svg.lucide-mic-off, svg.lucide-phone-off, svg.lucide-mic')});
  const fills = await normalButtons.evaluateAll(nodes => nodes.map(node => getComputedStyle(node).backgroundColor));
  assert.ok(fills.length >= 3 && fills.every(fill => fill === fills[0]), 'normal media and context actions use one surface colour');
  const cards = await surface.locator('.voople-full-room__participant').evaluateAll(nodes => nodes.map(node => { const rect = node.getBoundingClientRect(); return {top:rect.top,bottom:rect.bottom,left:rect.left,right:rect.right,height:rect.height}; }));
  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) assert.ok(cards[i].right <= cards[j].left + 1 || cards[j].right <= cards[i].left + 1 || cards[i].bottom <= cards[j].top + 1 || cards[j].bottom <= cards[i].top + 1, 'participant tiles never overlap');
  if (mobile) {
    assert.equal(await surface.locator('.voople-orbit-call-grid__tiles').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length), 2);
    assert.equal(await surface.locator('.voople-orbit-call-grid').evaluate(node => node.scrollHeight <= node.clientHeight + 2), true, 'eight participants fit a normal-height mobile call');
  }
  if (!mobile) {
    const rooms = await page.locator('.voople-group-workspace__live').boundingBox();
    assert.ok(frame.x >= rooms.x + rooms.width - 1, 'Room expansion leaves the original Rooms column available');
  } else await page.getByRole('button', {name:'К комнатам',exact:true}).waitFor();
  const channel = page.locator('[data-voople-room-channel="group-1"]');
  await channel.getByRole('heading', {name:'Лобби',exact:true}).waitFor();
  if (!mobile) {
    assert.equal(await page.locator('.voople-group-chat-header__section-slot').isVisible(), false, 'voice replaces the text channel header');
    assert.equal(await page.locator('.voople-group-workspace__people').count(), 0, 'Group People hides while the Room is expanded');
    await page.getByRole('button', {name:'Участники',exact:true}).click();
    await page.getByRole('complementary', {name:'Участники группы',exact:true}).waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await surface.count(), 1);
    await page.getByRole('complementary', {name:'Участники группы',exact:true}).waitFor({state:'detached'});
    await page.getByRole('region', {name:'Компактный голосовой разговор',exact:true}).getByText('Отличная').waitFor();
  }
  await verifyCallActions(page, surface, mobile, artifacts, host, width, theme);
  await verifyOrbitMedia(page,surface,{artifacts,host,width,theme});
  const topActions = channel.locator('[data-action-placement="corner-top"]');
  await topActions.getByRole('button', {name:'Открыть чат группы',exact:true}).click();
  const roomChat = surface.getByRole('complementary', {name:'Чат группы: Общий',exact:true});
  await roomChat.waitFor();
  assert.equal(await roomChat.locator('.voople-direct-workspace').count(), 0, 'room chat keeps ordinary conversation layout');
  const composer = roomChat.getByRole('textbox');
  await composer.fill('Черновик комнаты');
  const chatBounds = await roomChat.boundingBox();
  const inputBounds = await composer.boundingBox();
  assert.ok(inputBounds.y >= chatBounds.y && inputBounds.y + inputBounds.height <= chatBounds.y + chatBounds.height + 1, 'room composer remains inside drawer');
  if (mobile) {
    const mediaBounds = await surface.locator('.voople-full-room__footer').boundingBox();
    assert.ok(chatBounds.y + chatBounds.height <= mediaBounds.y + 1, 'mobile room chat stays above call controls');
  }
  await page.screenshot({path:path.join(artifacts,`orbit-room-chat-${host}-${width}-${theme}.png`)});
  await composer.press('Escape');await roomChat.waitFor({state:'detached'});
  await topActions.getByRole('button', {name:'Открыть чат группы',exact:true}).click();
  await roomChat.waitFor();assert.equal(await roomChat.getByRole('textbox').inputValue(), 'Черновик комнаты');
  await roomChat.getByRole('button', {name:'Закрыть чат группы',exact:true}).click();
  await surface.evaluate(node => { node.dataset.fixtureIdentity = 'same-stage'; });
  await page.screenshot({path:path.join(artifacts,`orbit-embedded-room-${host}-${width}-${theme}.png`)});
  await surface.getByRole('button', {name:'Открыть разговор на весь экран',exact:true}).click();
  const full = page.locator('[data-room-presentation="fullscreen"]');await full.waitFor();
  await page.waitForFunction(() => document.querySelector('button[aria-label="Выйти из полноэкранного режима"]')?.disabled === false);
  assert.equal(await full.getAttribute('data-fixture-identity'), 'same-stage', 'fullscreen retains the portal DOM and stage');
  assert.equal(await full.locator('.voople-full-room__switcher').count(), 0, 'fullscreen omits the old Rooms column');
  const viewport = await full.boundingBox();
  assert.ok(viewport.width >= width - 1);
  await full.locator('[data-call-participant="user-1"]').focus();
  await full.locator('[data-call-participant="user-1"]').press('Shift+F10');
  const fullscreenMenu = page.getByRole('menu', {name:'Действия участника Biba',exact:true});await fullscreenMenu.waitFor();
  assert.equal(await fullscreenMenu.evaluate(node => !document.fullscreenElement || document.fullscreenElement.contains(node)), true, 'context controls stay within the native fullscreen element');
  await fullscreenMenu.getByRole('menuitem', {name:'Сбросить до 100%',exact:true}).click();await fullscreenMenu.waitFor({state:'detached'});
  await full.getByRole('button', {name:'Выйти из полноэкранного режима',exact:true}).click();
  await surface.waitFor();
  assert.equal(await surface.getAttribute('data-fixture-identity'), 'same-stage');
  if (mobile) await page.getByRole('button', {name:'К комнатам',exact:true}).click();
  else await page.keyboard.press('Escape');
  await surface.waitFor({state:'detached'});
  console.log(`PASS Orbit embedded Room ${host} ${width} ${theme}: pane bounds, explicit fullscreen, stable stage, Compact return`);
}

export async function verifyOrbitShell({ browser, baseUrl, artifacts }) {
  const desktopCases = process.argv.includes("--orbit-mobile-only") ? [] : [[1440,900,"void"],[1440,900,"light"],[1024,640,"void"]];
  for (const host of ["web", "desktop"]) for (const [width, height, theme] of desktopCases) {
    const { page, errors } = await openFixture(browser, baseUrl, host, theme, width, height);
    await page.waitForFunction(() => {
      const dock=document.querySelector('[data-account-dock="true"]')?.getBoundingClientRect();
      const live=document.querySelector('.voople-group-workspace__live')?.getBoundingClientRect();
      return dock && live && Math.abs(dock.right-live.right)<2;
    });
    const dock = page.locator('[data-account-dock="true"]');
    const live = await page.locator(".voople-group-workspace__live").boundingBox();
    const dockBox = await dock.boundingBox();
    assert.equal(Math.round(dockBox.x), 8);
    assert.ok(Math.abs(dockBox.x + dockBox.width - live.x - live.width) < 2, `desktop dock spans rail and complete Room column: dock=${JSON.stringify(dockBox)} live=${JSON.stringify(live)}`);
    const activity = page.getByRole("heading", {name:/^Активность/});
    if (!await activity.isVisible()) await page.getByRole("button", {name:"Участники",exact:true}).click();
    await activity.waitFor();
    const closePeople = page.getByRole("button", {name:"Закрыть список участников",exact:true});
    if (await closePeople.count()) await closePeople.click();
    await verifyEmbeddedRoom(page, artifacts, host, width, theme);
    const originalWidth = (await page.locator(".voople-sidebar").boundingBox()).width;
    await page.getByRole("button", {name:"Личные сообщения",exact:true}).click();
    const personal = page.getByRole("region", {name:"Личные",exact:true});
    await personal.waitFor();
    const listBox = await personal.boundingBox();
    assert.equal(Math.round(listBox.width), 320);
    assert.equal(await personal.getByRole("button", {name:"Закрыть личные сообщения"}).count(), 0);
    await page.getByRole('button', {name:'Поиск',exact:true}).click();
    const search = page.getByRole('dialog', {name:'Поиск',exact:true});await search.waitFor();
    assert.equal(await search.getByRole('searchbox').evaluate(node => { const rect = node.getBoundingClientRect(); return node.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)); }), true, 'search input is above the DM column');
    await page.keyboard.press('Escape');await search.waitFor({state:'detached'});
    await page.getByRole('button', {name:'Новый диалог',exact:true}).click();
    const newDirect = page.getByRole('dialog', {name:'Новый диалог',exact:true});await newDirect.waitFor();
    await newDirect.getByRole('searchbox', {name:'Найти собеседника'}).fill('biba');
    await newDirect.getByRole('button', {name:/Biba/}).click();
    await newDirect.waitFor({state:'detached'});
    await personal.getByRole("button", {name:"Biba",exact:true}).click();
    const input = page.getByRole("textbox", {name:"Сообщение",exact:true});await input.waitFor();
    await input.fill("Первая строка\nВторая строка\nТретья строка");
    await page.waitForTimeout(650);
    assert.deepEqual(await personal.boundingBox(), listBox, "inbox and selected DM share one persistent list geometry");
    assert.equal((await page.locator(".voople-sidebar").boundingBox()).width, originalWidth);
    const composer = page.locator(".voople-chat-composer__surface");
    const inputBox = await composer.boundingBox();
    assert.ok(inputBox.x >= dockBox.x + dockBox.width, "DM composer stays outside the common dock footprint");
    assert.ok(Math.abs(inputBox.y + inputBox.height - dockBox.y - dockBox.height) < 2);
    const workspace = page.locator('.voople-direct-workspace');
    const body = await workspace.locator('.voople-direct-workspace__body').boundingBox();
    assert.ok(Math.abs(listBox.y - body.y - 1) < 2 && Math.abs(listBox.y + listBox.height - body.y - body.height + 1) < 2, 'DM list shares the full framed body rather than ending above the dock');
    const infoToggle = page.getByRole('button', {name:'Информация о диалоге',exact:true});
    if (await infoToggle.getAttribute('aria-expanded') !== 'true') await infoToggle.click();
    const peerInfo = page.getByRole('complementary', {name:'Информация о диалоге',exact:true});
    await peerInfo.getByRole('link', {name:'Открыть профиль',exact:true}).waitFor();
    await page.screenshot({path:path.join(artifacts,`orbit-direct-info-${host}-${width}-${theme}.png`)});
    await peerInfo.getByRole('button', {name:'Закрыть информацию о диалоге',exact:true}).click();
    await peerInfo.waitFor({state:'detached'});assert.equal(await infoToggle.isVisible(), true);
    await page.screenshot({path:path.join(artifacts,`orbit-integrated-dm-${host}-${width}-${theme}.png`)});
    await page.getByRole("button", {name:"Развернуть боковую панель",exact:true}).click();
    await page.waitForTimeout(100);
    const movingDock = await dock.boundingBox(), movingInput = await composer.boundingBox();
    assert.ok(movingInput.x >= movingDock.x + movingDock.width - 1, "manual expansion cannot sweep the dock over input");
    await page.waitForTimeout(550);
    await personal.getByRole("button", {name:"Biba",exact:true}).waitFor();
    await page.getByRole("button", {name:"Свернуть боковую панель",exact:true}).click();await page.waitForTimeout(600);
    for (const [route, target] of [["/me","profile"],["/settings","settings"]]) {
      await page.evaluate(route => window.fixture.navigate(route), route);await page.waitForTimeout(650);
      const plane = await page.locator(".voople-shell__scroll").boundingBox();
      assert.ok(Math.abs(plane.x - 80) < 1 && Math.abs(plane.x + plane.width - width + 8) < 1, "utility pages use the same full shell width");
      if (target === "profile") {
        await page.getByRole("button", {name:"Поделиться образом",exact:true}).scrollIntoViewIfNeeded();
        const card = await page.locator(".voople-profile-page__card").boundingBox();
        const currentDock = await dock.boundingBox();
        assert.ok(card.y + card.height <= currentDock.y, "profile card scroll viewport stops above the dock");
      } else {
        const navigation = page.getByRole("navigation", {name:"Разделы настроек",exact:true});
        await navigation.getByRole("button", {name:"Дополнительно",exact:true}).scrollIntoViewIfNeeded();
        const last = await navigation.getByRole("button", {name:"Дополнительно",exact:true}).boundingBox();
        const currentDock = await dock.boundingBox();
        assert.ok(last.y + last.height <= currentDock.y, "all settings categories remain accessible above the dock");
      }
      await page.screenshot({path:path.join(artifacts,`orbit-common-shell-${target}-${host}-${width}-${theme}.png`)});
    }
    await page.getByRole("button", {name:"Выйти из разговора",exact:true}).click();
    await dock.getByRole("button", {name:"Настройки",exact:true}).waitFor();
    assert.equal(await page.locator(".voople-voice-dock--compact").count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    console.log(`PASS Orbit common shell ${host} ${width} ${theme}: aligned dock, persistent DMs, utility width and protected actions`);
    await page.close();
  }
  for (const host of ["web", "desktop"]) for (const theme of ["void", "light"]) {
    const { page, errors } = await openFixture(browser, baseUrl, host, theme, 360, 900, "&dm-test=1");
    const tile = page.locator(".voople-orbit-voice-tile");await tile.waitFor();
    const input = page.getByRole("textbox", {name:"Сообщение",exact:true});
    await input.fill("Сообщение\nс несколькими\nстроками");
    const frame = page.locator(".voople-chat-window");
    const initial = await frame.boundingBox();
    const composer = await page.locator(".voople-chat-composer__surface").boundingBox();
    const box = await tile.boundingBox();
    assert.equal(Math.round(box.width), 64);assert.equal(Math.round(box.height),64);
    const avatar = await tile.locator(".voople-orbit-voice-tile__avatar").boundingBox();
    assert.ok(avatar.x >= box.x && avatar.x + avatar.width <= box.x + box.width && avatar.y >= box.y && avatar.y + avatar.height <= box.y + box.height, "canonical avatar fits inside the floating target");
    assert.ok(box.y + box.height <= composer.y, "floating voice never covers the composer");
    await page.evaluate(() => window.fixture.setSpeakerIndex(2));
    await tile.getByText("А").waitFor();
    await tile.click();
    const controls = page.getByRole("dialog", {name:"Управление разговором",exact:true});await controls.waitFor();
    assert.deepEqual(await frame.boundingBox(), initial, "opening voice controls never resizes chat");
    await controls.getByRole("button", {name:"Включить микрофон",exact:true}).click();
    assert.equal(await tile.getAttribute("data-muted"), "false");
    await controls.getByRole("button", {name:"Закрыть",exact:true}).click();
    await controls.waitFor({state:"detached"});
    assert.deepEqual(await frame.boundingBox(), initial);
    const beforeDrag = await tile.boundingBox();
    await page.mouse.move(beforeDrag.x + 32, beforeDrag.y + 32);await page.mouse.down();
    await page.mouse.move(100, 300, {steps:5});await page.mouse.up();
    assert.equal(await controls.count(), 0, "dragging cannot accidentally open call controls");
    assert.ok((await tile.boundingBox()).x < beforeDrag.x);
    await tile.focus();await tile.press("Enter");await controls.waitFor();
    await page.keyboard.press("Escape");await controls.waitFor({state:"detached"});
    await page.screenshot({path:path.join(artifacts,`orbit-mobile-voice-${host}-${theme}.png`)});
    await page.evaluate(() => window.fixture.setCallVisible(false));await tile.waitFor({state:"detached"});
    assert.deepEqual(await frame.boundingBox(), initial, "ending a call does not change chat height");
    await page.evaluate(() => window.fixture.setCallVisible(true));await tile.waitFor();
    assert.deepEqual(await frame.boundingBox(), initial);
    await page.evaluate(() => { window.fixture.setCallVisible(false); window.fixture.navigate("/messages"); });
    const mobileInbox=page.getByRole('region',{name:'Группы и личные сообщения',exact:true});
    await mobileInbox.getByRole('button',{name:/VOICEKK/}).first().click();
    await page.locator('.voople-group-workspace').waitFor();
    await page.evaluate(()=>window.fixture.navigate('/messages'));
    await page.getByRole('button',{name:'Новый диалог',exact:true}).click();
    const picker = page.getByRole('dialog', {name:'Новый диалог',exact:true});await picker.waitFor();
    await picker.getByRole('searchbox', {name:'Найти собеседника'}).fill('biba');
    await picker.getByRole('button', {name:/Biba/}).click();await picker.waitFor({state:'detached'});
    await page.getByRole('button', {name:'Информация о диалоге',exact:true}).click();
    const details = page.getByRole('complementary', {name:'Информация о диалоге',exact:true});
    await details.getByRole('link', {name:'Открыть профиль',exact:true}).waitFor();
    await page.screenshot({path:path.join(artifacts,`orbit-mobile-direct-info-${host}-${theme}.png`)});
    await details.getByRole('button', {name:'Закрыть информацию о диалоге',exact:true}).click();await details.waitFor({state:'detached'});
    await page.evaluate(() => { window.fixture.setCallVisible(false); window.fixture.navigate("/messages/group-1"); });
    await page.locator(".voople-group-workspace").waitFor();
    await page.evaluate(() => window.fixture.setCallVisible(true));await tile.waitFor();await page.waitForTimeout(650);
    assert.equal(Math.round((await tile.boundingBox()).x), 12, "default Voice placement keeps the Room gear side clear");
    const otherRoom = page.locator('[data-orbit-room-id="drg"]');
    await otherRoom.locator(".voople-orbit-room__cover").tap();await page.waitForTimeout(650);
    const rowWidths=await otherRoom.locator('.voople-orbit-roster__person .voople-group-now-participant').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().width));
    assert.ok(rowWidths.length>1 && Math.max(...rowWidths)-Math.min(...rowWidths)<1,'participant rows share one width');
    await otherRoom.getByRole("button", {name:"Действия комнаты DRG",exact:true}).click();
    await page.getByRole("menu", {name:"Действия комнаты DRG",exact:true}).waitFor();
    await page.keyboard.press("Escape");
    await verifyEmbeddedRoom(page, artifacts, host, 360, theme);
    await page.screenshot({path:path.join(artifacts,`orbit-mobile-voice-rooms-${host}-${theme}.png`)});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    console.log(`PASS Orbit mobile voice ${host} ${theme}: speaker identity, mic, sheet, drag, fixed chat height`);
    await page.close();
  }
}
