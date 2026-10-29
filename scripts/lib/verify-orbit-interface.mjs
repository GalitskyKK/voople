import assert from "node:assert/strict";
import path from "node:path";
import { verifyOrbitShell } from "./verify-orbit-shell.mjs";

export async function verifyOrbitInterface({ browser, baseUrl, artifacts }) {
  if (process.argv.includes("--orbit-shell-only")) return verifyOrbitShell({ browser, baseUrl, artifacts });
  if (process.argv.includes("--orbit-header-only")) return verifyWorkspaceHeader({ browser, baseUrl, artifacts });
  if (process.argv.includes("--orbit-dm-only")) return verifyDirectDock({ browser, baseUrl, artifacts });
  if (process.argv.includes("--orbit-finish-only")) { await verifyWorkspaceHeader({ browser, baseUrl, artifacts }); await verifyRailExtremes({ browser, baseUrl, artifacts }); return verifyDirectDock({ browser, baseUrl, artifacts }); }
  if (process.argv.includes("--orbit-rail-only")) return verifyRailExtremes({ browser, baseUrl, artifacts });
  for (const host of ["web", "desktop"]) for (const [width, theme] of [[360, "void"], [360, "light"], [1440, "void"], [1440, "light"], [1100, "void"]]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, hasTouch: width === 360 });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(({ theme }) => {
      localStorage.setItem("voople:app-theme", theme);
      if (!localStorage.getItem("voople:app-preferences")) localStorage.setItem("voople:app-preferences", JSON.stringify({ interfaceDesign: "orbit" }));
      localStorage.removeItem("voople:sidebar-collapsed:v1");
    }, { theme });
    await page.goto(`${baseUrl}?host=${host}&count=8&search=1&orbit-test=1`);
    await page.locator('html[data-interface-design="orbit"]').waitFor({state:'attached'});
    await page.locator(".voople-orbit-room__cover").first().waitFor();
    const surfaceFrame = await page.locator(".voople-group-workspace").evaluate(el => {
      const style = getComputedStyle(el);
      return { width: style.borderTopWidth, color: style.borderTopColor, radius: parseFloat(style.borderTopLeftRadius) };
    });
    assert.equal(surfaceFrame.width, "1px", "the main Voice/Chat/People surface has one thin brand frame");
    assert.notEqual(surfaceFrame.color, "rgba(0, 0, 0, 0)");
    assert.ok(surfaceFrame.radius >= 12, "the main frame follows the shared rounded material");
    assert.equal(await page.locator(".voople-group-surface").evaluate(el => getComputedStyle(el).borderTopWidth), "0px", "the contextual header is outside the framed workspace");
    const headerBox = await page.locator(".voople-group-surface-header").boundingBox();
    if (headerBox?.height) assert.ok((await page.locator(".voople-group-workspace").boundingBox()).y >= headerBox.y + headerBox.height, "the frame begins below the header and tabs");
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(550);
    assert.equal(await page.getByRole("button", { name: "Создать постоянную комнату", exact: true }).innerText(), "", "Orbit creation uses only the plus glyph");
    if (width < 1024) {
      const frame = await page.locator(".voople-group-workspace").boundingBox();
      assert.ok(Math.abs(frame.x - (width - frame.x - frame.width)) < 1, "compact workspace side margins are symmetric");
      assert.equal(Math.round(frame.x), 8);
      assert.equal(await page.evaluate(() => document.documentElement.clientWidth), width, "mobile Messenger has no empty document scrollbar gutter");
      const pair = await page.locator('.voople-orbit-map').first().locator('.voople-orbit-room__cover').evaluateAll(elements => elements.slice(0, 2).map(el => { const r = el.getBoundingClientRect(); return r.x + r.width / 2; }));
      assert.ok(Math.abs((pair[0] + pair[1]) / 2 - width / 2) < 2, "the two-column Room grid centres on the viewport");
    }
    await page.screenshot({ path: path.join(artifacts, `orbit-${host}-${width}-${theme}.png`) });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    for (const selector of [".voople-group-surface", ".voople-group-now", ".voople-group-now__create", ".voople-orbit-room__cover"]) {
      const boxes = await page.locator(selector).evaluateAll(elements => elements.map(el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right }; }));
      assert.ok(boxes.every(box => box.left >= 0 && box.right <= width + 1), `${host} ${width}px: ${selector} must fit inside the viewport, including internally clipped content`);
    }
    assert.equal(await page.locator(".voople-orbit-room__cover").count(), 7);
    const lobby = page.locator('[data-layout="room-section"]').first();
    const roster = lobby.locator(".voople-orbit-roster__toggle");
    const compactCover = await lobby.locator(".voople-orbit-room__cover").boundingBox();
    const currentSignal = await lobby.locator(".voople-orbit-room__cover").evaluate(el => getComputedStyle(el).boxShadow);
    assert.notEqual(currentSignal, "none", "the authoritative current Room has a persistent cover signal");
    assert.equal(await page.locator('[data-orbit-room-id="drg"] .voople-orbit-room__cover').evaluate(el => getComputedStyle(el).boxShadow), "none", "foreign Room previews do not acquire the current-session signal");
    assert.equal(await roster.getAttribute("aria-expanded"), "false", "current Room rests with perimeter avatars");
    if (width >= 1024) {
      assert.equal(Math.round((await page.locator(".voople-sidebar").boundingBox()).width), 72);
      const groupSection = page.getByRole("region", { name: "Группы", exact: true });
      const directSection = page.getByRole("region", { name: "Личные", exact: true });
      const groupScroll = groupSection.locator(".voople-orbit-rail__scroll");
      assert.equal(await groupScroll.evaluate(el => el.scrollHeight > el.clientHeight), true, "long Group lists scroll independently");
      assert.equal(await directSection.isVisible(), false, "Groups and DMs have distinct modes");
      const beforeDm = await page.locator(".voople-group-workspace").boundingBox();
      await page.getByRole("button", { name: "Личные сообщения", exact: true }).click();
      assert.equal(await directSection.locator(".voople-orbit-rail__item").count(), 1);
      assert.equal(await groupSection.isVisible(), true, "Group shortcuts remain in their own rail");
      assert.equal(await page.locator(".voople-messages-layout").count(), 1, "personal destination opens the inbox");
      assert.equal(Math.round((await page.locator(".voople-sidebar").boundingBox()).width), 72);
      await page.screenshot({ path: path.join(artifacts, `orbit-direct-list-${host}-${width}-${theme}.png`) });
      await groupSection.getByRole("button", { name: "VOICEKK", exact: true }).click();
      await page.locator(".voople-group-workspace").waitFor();
      await page.waitForTimeout(650);
      assert.deepEqual(await page.locator(".voople-group-workspace").boundingBox(), beforeDm);
      const actionBox = await page.getByRole("button", { name: "Создать или найти группу", exact: true }).boundingBox();
      const railBox = await page.locator(".voople-orbit-rail").boundingBox();
      assert.ok(actionBox.y >= railBox.y && actionBox.y + actionBox.height <= railBox.y + railBox.height + 1);
      const icons = page.locator(".voople-orbit-rail__icon");
      const target = await icons.first().boundingBox();
      assert.ok(Math.abs(target.x + target.width / 2 - 36) < 1, "chat avatars centre on the 72px rail");
      assert.equal(Math.round(target.width), 40);
      assert.equal(await page.locator('.voople-orbit-rail__link[aria-current="page"]').count(), 1);
      await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2);
      await page.waitForTimeout(220);
      assert.ok(await icons.first().evaluate(element => new DOMMatrix(getComputedStyle(element).transform).a > 1.15));
      await page.mouse.move(width - 20, 200);
      await page.getByRole("button", { name: "Развернуть боковую панель" }).click();
      await page.waitForTimeout(250);
      assert.equal(Math.round((await page.locator(".voople-sidebar").boundingBox()).width), 220);
      await page.getByRole("button", { name: "Свернуть боковую панель" }).click();
      await page.waitForTimeout(250);
      const dock = await page.locator(".voople-voice-dock--compact").boundingBox();
      assert.ok(dock.width > 220, "dock is independent of the 72px rail");
      const accountDock = page.locator('[data-account-dock="true"]');
      assert.equal(await accountDock.getByRole("button", { name: "Открыть меню аккаунта", exact: true }).count(), 1, "the canonical account menu shares the call dock");
      await page.waitForFunction(() => {
        const root = document.querySelector('[data-account-dock="true"]');
        return root && Math.abs(root.getBoundingClientRect().height - parseFloat(document.documentElement.style.getPropertyValue("--voople-compact-height"))) < 1;
      });
      const accountDockBox = await accountDock.boundingBox();
      const roomsScrollBox = await page.locator(".voople-group-workspace__rooms-scroll").boundingBox();
      assert.ok(roomsScrollBox.y + roomsScrollBox.height <= accountDockBox.y, "the combined account/call dock cannot cover Room hit targets");
      const composer = await page.getByRole("textbox", { name: "Сообщение группе" }).boundingBox();
      assert.ok(dock.x + dock.width <= composer.x || dock.y + dock.height <= composer.y, "dock cannot cover composer");
      await page.getByRole("button", { name: "Поиск", exact: true }).click();
      await page.getByRole("dialog", { name: "Поиск", exact: true }).waitFor();
      await page.keyboard.press("Escape");
      assert.equal(await page.getByRole("button", { name: "Поиск", exact: true }).evaluate(el => el === document.activeElement), true);
      await lobby.locator(".voople-orbit-room__cover").hover();
    } else if (await roster.getAttribute("aria-expanded") !== "true") {
      assert.equal(await lobby.locator(".voople-orbit-room__menu").evaluate(el => getComputedStyle(el).pointerEvents), "none", "touch cannot reveal a gear over the first tap");
      // Tap the visible cover directly; locator auto-scrolling can move an already-visible animated tile.
      const touchCover = await lobby.locator(".voople-orbit-room__cover").boundingBox();
      await page.touchscreen.tap(touchCover.x + touchCover.width / 2, touchCover.y + touchCover.height / 2);
      assert.notEqual(await page.evaluate(() => window.fixture.event), "full", "first touch previews the Room instead of opening the call");
    }
    await page.waitForTimeout(650);
    assert.equal(await roster.getAttribute("aria-expanded"), "true");
    const expandedCover = await lobby.locator(".voople-orbit-room__cover").boundingBox();
    assert.ok(expandedCover.width > compactCover.width * 1.05 && expandedCover.width < compactCover.width * 1.2, "large resting covers need only a modest preview enlargement");
    assert.ok(Math.abs(expandedCover.x + expandedCover.width / 2 - compactCover.x - compactCover.width / 2) < 32, `cover grows about its centre with bounded edge correction: ${JSON.stringify({compactCover, expandedCover, scrollLeft: await page.locator(".voople-group-workspace__rooms-scroll").evaluate(el => el.scrollLeft)})}`);
    assert.ok(Math.abs(expandedCover.y + expandedCover.height / 2 - compactCover.y - compactCover.height / 2) < 32, `expansion must not scroll the selected cover away vertically: ${JSON.stringify({compactCover, expandedCover, scrollTop: await page.locator(".voople-group-workspace__rooms-scroll").evaluate(el => el.scrollTop), active: await page.evaluate(() => document.activeElement?.outerHTML.slice(0,200))})}`);
    assert.equal(await page.locator(".voople-group-workspace__rooms-scroll").evaluate(el => el.scrollLeft), 0, "the focus aura cannot introduce horizontal scrolling");
    const auraTop = await lobby.locator("..").evaluate(el => el.getBoundingClientRect().top + parseFloat(getComputedStyle(el, "::before").top));
    const controlsBox = await page.locator(".voople-group-now__section-header").first().boundingBox();
    assert.ok(auraTop >= controlsBox.y + controlsBox.height, "blur stays below the section heading and add-Room control");
    assert.equal(await lobby.locator(".voople-group-now__participants [data-participant-id]:visible").count(), 8);
    const participant = lobby.locator(".voople-group-now-participant").first();
    const participantBox = await participant.boundingBox();
    assert.equal(Math.round(participantBox.height), width >= 1024 ? 36 : 44, "compact rows retain full touch targets");
    assert.equal(Math.round((await participant.locator(":scope > :first-child").boundingBox()).width), 24);
    await page.locator(".voople-group-workspace__rooms-scroll").evaluate(el => { el.scrollTop = 0; });
    await page.screenshot({ path: path.join(artifacts, `orbit-roster-${host}-${width}-${theme}.png`) });
    // Keyboard popup focus travels through a body portal while the mouse stays outside the map.
    await page.mouse.move(width - 5, 200);
    await roster.focus();
    await page.waitForTimeout(650);
    const person = lobby.getByRole("button", { name: "Действия участника Biba", exact: true });
    await person.focus();
    await person.press("Shift+F10");
    const participantMenu = page.getByRole("menu", { name: "Действия участника Biba", exact: true });
    await participantMenu.waitFor();
    await participantMenu.getByRole("slider").focus();
    assert.equal(await roster.getAttribute("aria-expanded"), "true");
    await page.keyboard.press("Escape");
    await participantMenu.waitFor({ state: "detached" });
    assert.equal(await person.evaluate(el => el === document.activeElement), true);
    assert.equal(await roster.getAttribute("aria-expanded"), "true");
    await page.getByRole("button", { name: "Создать постоянную комнату" }).focus();
    if (width >= 1024) {
      const neighbour = page.locator('[data-orbit-room-id="drg"]');
      await neighbour.locator(".voople-orbit-room__cover").hover();
      await page.waitForTimeout(650);
      assert.equal(await neighbour.getAttribute("data-expanded"), "true");
      assert.equal(await roster.getAttribute("aria-expanded"), "false");
      assert.notEqual(await lobby.locator(".voople-orbit-room__cover").evaluate(el => getComputedStyle(el).boxShadow), "none", "previewing another Room preserves the current Room signal");
      await page.screenshot({ path: path.join(artifacts, `orbit-neighbour-${host}-${width}-${theme}.png`) });
      await neighbour.getByRole("button", { name: "Действия комнаты DRG", exact: true }).click();
      const neighbourMenu = page.getByRole("menu", { name: "Действия комнаты DRG", exact: true });
      await neighbourMenu.waitFor();
      await page.waitForTimeout(400);
      const actionsBox = await neighbourMenu.boundingBox();
      const paneBox = await page.locator(".voople-group-workspace__live").boundingBox();
      assert.ok(actionsBox.x + actionsBox.width > paneBox.x + paneBox.width, "Room action portal can extend past the Rooms pane");
      await page.screenshot({ path: path.join(artifacts, `orbit-actions-neighbour-${host}-${width}-${theme}.png`) });
      await page.keyboard.press("Escape");
      await neighbourMenu.waitFor({ state: "detached" });
      const neighbourOwnerId = await neighbour.getByRole("button", { name: "Действия комнаты DRG", exact: true }).getAttribute("id");
      await page.waitForFunction(id => document.activeElement?.id === id, neighbourOwnerId);
      // Popup focus returns to its owner; move keyboard focus out before testing hover dismissal.
      await page.getByRole("button", { name: "Создать постоянную комнату" }).focus();
      await page.mouse.move(width - 20, 200);
      await page.waitForTimeout(650);
      assert.equal(await page.locator('.voople-orbit-map__tile[data-expanded="true"]').count(), 0, "leaving the Room map returns to perimeter avatars");
      await lobby.locator(".voople-orbit-room__cover").hover();
      await page.waitForTimeout(650);
    } else { if (await roster.getAttribute("aria-expanded") !== "true") await roster.tap(); await page.waitForTimeout(650); }
    await lobby.getByRole("button", { name: "Действия комнаты Лобби", exact: true }).click();
    const roomMenu = page.getByRole("menu", { name: "Действия комнаты Лобби", exact: true });
    await roomMenu.waitFor();
    await page.waitForTimeout(400);
    const menuBox = await roomMenu.boundingBox();
    const coverBox = await lobby.locator(".voople-orbit-room__cover").boundingBox();
    assert.ok(menuBox.x >= coverBox.x + coverBox.width, "Room actions open to the right of the cover");
    assert.ok(menuBox.x + menuBox.width <= width - 7, "Room actions stay inside the device viewport");
    assert.equal(await roomMenu.evaluate(el => getComputedStyle(el).backgroundColor), "rgba(0, 0, 0, 0)");
    const actions = await roomMenu.getByRole("menuitem").evaluateAll(items => items.map(el => { const r=el.getBoundingClientRect(); return {top:r.top,bottom:r.bottom,bg:getComputedStyle(el).backgroundColor}; }));
    assert.ok(actions.every((item,index) => item.bg !== "rgba(0, 0, 0, 0)" && (!index || item.top - actions[index-1].bottom >= 7)), "Room actions are separate floating rows");
    await page.screenshot({ path: path.join(artifacts, `orbit-actions-${host}-${width}-${theme}.png`) });
    await page.getByRole("menuitem", { name: "Отделиться во временную комнату", exact: true }).click();
    assert.equal(await page.evaluate(() => window.fixture.event), "split");
    await page.getByRole("button", { name: "Отменить", exact: true }).click();
    await page.getByRole("button", { name: "Создать постоянную комнату" }).click();
    const create = page.getByRole("dialog", { name: "Новая комната", exact: true });
    await create.getByLabel("Название", { exact: true }).fill("Вечерняя комната");
    await create.getByRole("button", { name: "Аркада", exact: true }).click();
    await create.getByRole("button", { name: "Создать и зайти", exact: true }).click();
    assert.deepEqual(await page.evaluate(() => window.fixture.draft), { name: "Вечерняя комната", cover: { kind: "preset", preset: "arcade" } });
    if (width >= 1024) await lobby.locator(".voople-orbit-room__cover").hover();
    else if (await roster.getAttribute("aria-expanded") !== "true") await roster.tap();
    await page.waitForTimeout(650);
    await lobby.getByRole("button", { name: "Действия комнаты Лобби", exact: true }).click();
    await page.getByRole("menuitem", { name: "Обложка", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Обложка комнаты Лобби", exact: true });
    await editor.getByRole("button", { name: "Волна", exact: true }).click();
    await editor.getByRole("button", { name: "Сохранить", exact: true }).click();
    await editor.waitFor({ state: "detached" });
    await page.getByRole("button", { name: "Оформление", exact: true }).click();
    const settings = page.getByRole("dialog", { name: "Оформление", exact: true });
    await settings.getByRole("button", { name: /^Классический/ }).click();
    await page.locator('html[data-interface-design="classic"]').waitFor({state:'attached'});
    assert.equal(await page.locator(".voople-orbit-room__cover").count(), 0);
    assert.equal(await page.locator(".voople-voice-dock--compact").count(), 1);
    await page.reload();
    await page.locator('html[data-interface-design="classic"]').waitFor({state:'attached'});
    await page.getByRole("button", { name: "Оформление", exact: true }).click();
    await settings.getByRole("button", { name: /^Орбита/ }).click();
    await page.locator('html[data-interface-design="orbit"]').waitFor({state:'attached'});
    await settings.getByRole("button", { name: "Закрыть", exact: true }).last().click();
    await page.reload();
    await page.locator('html[data-interface-design="orbit"]').waitFor({state:'attached'});
    if (width < 1024) {
      const preview = page.locator('[data-orbit-room-id="drg"]');
      await preview.locator(".voople-orbit-room__cover").tap();
      await page.waitForTimeout(650);
      assert.notEqual(await page.evaluate(() => window.fixture.event), "join:drg");
      await preview.locator(".voople-orbit-room__touch-enter").tap();
      assert.equal(await page.evaluate(() => window.fixture.event), "join:drg");
      await page.evaluate(() => window.fixture.setPending(null));
      await page.touchscreen.tap(width - 2, 100);
      await page.waitForTimeout(650);
      assert.equal(await page.locator('.voople-orbit-map__tile[data-expanded="true"]').count(), 0, "outside tap dismisses Room preview");
    }
    const empty = page.locator('[data-orbit-room-id="music"]');
    await empty.locator(".voople-orbit-roster__toggle").click();
    await page.waitForTimeout(650);
    assert.equal(await empty.getAttribute("data-expanded"), "true");
    assert.equal(await empty.getByText("Пока пусто", { exact: true }).count(), 0);
    assert.doesNotMatch(await empty.innerText(), /0 в комнате|Пока пусто|Вы здесь/);
    await empty.getByRole("button", { name: "Действия комнаты Музыка", exact: true }).click();
    await page.getByRole("menuitem", { name: "Обложка", exact: true }).click();
    const emptyEditor = page.getByRole("dialog", { name: "Обложка комнаты Музыка", exact: true });
    await emptyEditor.getByRole("button", { name: "Отмена", exact: true }).click();
    const editOwnerId = await empty.getByRole("button", { name: "Действия комнаты Музыка", exact: true }).getAttribute("id");
    await page.waitForFunction(id => document.activeElement?.id === id, editOwnerId);
    assert.equal(await empty.getByRole("button", { name: "Действия комнаты Музыка", exact: true }).evaluate(el => el === document.activeElement), true);
    await page.emulateMedia({ reducedMotion: "reduce" });
    if (width >= 1024) {
      await page.locator(".voople-orbit-rail__icon").first().hover();
      assert.equal(await page.locator(".voople-orbit-rail__icon").first().evaluate(el => getComputedStyle(el).transform), "none");
    }
    assert.equal(await page.locator(".voople-orbit-room__cover").first().evaluate(el => getComputedStyle(el).transitionDuration), "0s");
    assert.equal(await page.locator(".voople-orbit-room__actions").first().evaluate(el => getComputedStyle(el).transitionDuration), "0s");
    assert.equal(await page.locator(".voople-group-now-room").first().evaluate(el => getComputedStyle(el).transitionDuration), "0s");
    assert.deepEqual(errors, []);
    console.log(`PASS Orbit ${host} ${width}px ${theme}: rail, roster, covers, rollback, dock, reduced motion`);
    await page.close();
  }
  await verifyRailExtremes({ browser, baseUrl, artifacts });
  await verifyDirectDock({ browser, baseUrl, artifacts });
}

async function verifyWorkspaceHeader({ browser, baseUrl, artifacts }) {
  for (const host of ["web", "desktop"]) for (const theme of ["void", "light"]) for (const width of process.argv.includes("--orbit-header-medium") ? [960] : [1440, 360]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, hasTouch: width === 360 });
    const errors=[];page.on("pageerror",error=>errors.push(error.message));
    await page.addInitScript(theme => {
      localStorage.setItem("voople:app-theme", theme);
      localStorage.setItem("voople:app-preferences", JSON.stringify({ interfaceDesign: "orbit" }));
      localStorage.removeItem("voople:sidebar-collapsed:v1");
    }, theme);
    await page.goto(`${baseUrl}?host=${host}&search=1&orbit-test=1&section-test=1`);
    const workspace = page.getByRole("region", { name: "Рабочая область группы", exact: true });
    const identity = workspace.getByRole("button", { name: "Информация о группе VOICEKK", exact: true });
    await identity.waitFor();await page.waitForTimeout(550);
    const live = workspace.getByRole("region", { name: "Комнаты группы", exact: true });
    await page.evaluate(() => window.fixture.setBanner("/fixture-banner.webp"));
    const banner = workspace.locator(".voople-group-banner-slot > .voople-group-pane-banner");await banner.waitFor();
    const localHeader = workspace.locator(".voople-group-surface-header");
    const headerBox = await localHeader.boundingBox();
    const bannerBox = await banner.boundingBox();
    const liveBox = await live.boundingBox();
    assert.ok(Math.abs(bannerBox.y - headerBox.y) < 1, "banner begins at the Group header");
    assert.ok(Math.abs(bannerBox.y + bannerBox.height - liveBox.y - 104) < 2, "banner bottom stays at its former position");
    assert.ok(Math.abs(bannerBox.x - liveBox.x) < 1 && Math.abs(bannerBox.width - liveBox.width) < 1);
    const blurTarget = width >= 800 ? workspace.locator(".voople-group-header-column") : localHeader;
    if (width >= 800) {
      const selector = workspace.locator(".voople-group-chat-header__section-slot .voople-chat-sections__selector");
      await selector.waitFor();
      assert.match(await selector.innerText(), /Общий/);
      assert.equal(await workspace.locator(".voople-group-workspace__chat .voople-chat-sections").count(), 0, "the selected chat row has one owner in the header");
      const nameBox = await identity.boundingBox();const chatBox = await selector.boundingBox();
      assert.ok(Math.abs(nameBox.y + nameBox.height / 2 - chatBox.y - chatBox.height / 2) < 3);
      await page.mouse.move(width - 2, 400);await page.waitForTimeout(550);
      assert.equal(await blurTarget.evaluate(el => getComputedStyle(el, "::before").backdropFilter), "blur(0px)");
      await identity.hover();await page.waitForTimeout(550);
      assert.equal(await blurTarget.evaluate(el => getComputedStyle(el, "::before").backdropFilter), "blur(8px)");
      assert.equal(await banner.evaluate(el => getComputedStyle(el).filter), "none", "the lower banner artwork stays sharp");
      await page.screenshot({ path: path.join(artifacts, `orbit-workspace-header-${host}-${theme}.png`) });
      await identity.click();await page.getByRole("dialog", { name: "Действия группы VOICEKK", exact: true }).waitFor();
      await page.keyboard.press("Escape");await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Информация о группе VOICEKK");
    } else {
      assert.equal(await blurTarget.evaluate(el => getComputedStyle(el, "::before").backdropFilter), "blur(8px)", "touch keeps the title readable without hover");
      await page.screenshot({ path: path.join(artifacts, `orbit-workspace-header-${host}-${theme}-360.png`) });
      await page.getByRole("tab", { name: "Чат", exact: true }).click();
      const compactBanner = await banner.boundingBox();const compactHeader = await localHeader.boundingBox();
      assert.ok(Math.abs(compactBanner.y + compactBanner.height - compactHeader.y - compactHeader.height) < 2, "mobile Chat has no banner overlay over messages");
    }
    const selector = workspace.locator(".voople-chat-sections__selector");await selector.click();
    const picker = page.getByRole("dialog", { name: "Выбор раздела группы", exact: true });await picker.waitFor();
    await picker.locator(".voople-chat-section-option").filter({hasText:"Планы"}).first().click();
    assert.match(await selector.innerText(), /Планы/);
    await page.evaluate(() => window.fixture.setSection("section-long"));
    await page.waitForTimeout(550);
    const selectorBox = await selector.boundingBox();
    assert.ok(selectorBox.x >= 0 && selectorBox.x + selectorBox.width <= width, "long section names stay inside the viewport");
    if (width >= 800) {
      const actions = await workspace.locator(".voople-group-chat-header > .voople-panel-header").boundingBox();
      assert.ok(selectorBox.x + selectorBox.width <= actions.x + 1, "long names cannot cover the action buttons");
    }
    await page.screenshot({ path: path.join(artifacts, `orbit-section-header-${host}-${theme}-${width}.png`) });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors,[]);
    console.log(`PASS Orbit workspace header ${host} ${theme} ${width}: full-height banner, local blur, live section picker`);
    await page.close();
  }
}

async function verifyRailExtremes({ browser, baseUrl, artifacts }) {
  for (const host of ["web", "desktop"]) for (const state of ["many", "few", "empty", "loading", "error"]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 640 } });
    await page.addInitScript(() => {
      localStorage.setItem("voople:app-theme", "void");
      localStorage.setItem("voople:app-preferences", JSON.stringify({ interfaceDesign: "orbit" }));
      localStorage.removeItem("voople:sidebar-collapsed:v1");
    });
    await page.goto(`${baseUrl}?host=${host}&count=8&search=1&orbit-test=1&rail-case=${state}`);
    const rail = page.locator(".voople-orbit-rail");
    await rail.waitFor();
    await page.evaluate(() => document.fonts.ready);
    for (const [kind, label, action] of [["groups", "Группы", "Создать или найти группу"], ["directs", "Личные сообщения", "Новый диалог"]]) {
      if (kind === "directs") await rail.getByRole("button", { name: label, exact: true }).click();
      const section = rail.locator(`[data-rail-section="${kind}"]`);
      const scroll = section.locator(".voople-orbit-rail__scroll");
      const bounds = await (kind === "directs" ? section : rail).boundingBox();
      const box = await page.getByRole("button", { name: action, exact: true }).boundingBox();
      assert.ok(box.y >= bounds.y && box.y + box.height <= bounds.y + bounds.height + 1, `${host} ${state}: ${action} stays accessible`);
      if (state === "many") {
        assert.equal(await scroll.evaluate(el => el.scrollHeight > el.clientHeight), true);
        await scroll.evaluate(el => { el.scrollTop = el.scrollHeight; });
        assert.equal((await page.getByRole("button", { name: action, exact: true }).boundingBox()).y, box.y, "creation action does not scroll");
      } else if (state === "few" && kind === "groups") {
        const last = await section.locator(".voople-orbit-rail__item").last().boundingBox();
        assert.ok(box.y - last.y - last.height < 16, "few chats do not leave an empty stretched section");
      } else if (state === "empty") assert.equal(await section.locator(".voople-orbit-rail__item").count(), 0);
      else if (state === "loading") await section.getByRole("status", { name: "Загружаем переписки" }).waitFor();
      else if (state === "error") {
        await section.locator(".voople-orbit-rail__retry").click();
        assert.equal(await page.evaluate(() => window.fixture.event), "retry");
      }
    }
    if (state === "many") {
      const direct = rail.locator('[data-rail-section="directs"] .voople-orbit-rail__item button').last();
      await direct.focus();await direct.press("Enter");
      assert.equal(await page.evaluate(() => window.fixture.event), "navigate:/messages/direct-extra-11");
      const account = page.locator('[data-account-dock="true"]');
      await account.getByRole("button", { name: "Открыть меню аккаунта" }).click();
      await page.getByRole("menuitem", { name: "Профиль", exact: true }).click();
      assert.equal(await page.evaluate(() => window.fixture.event), "navigate:/me");
      assert.equal(await page.locator(".voople-voice-dock--compact").count(), 1);
      await account.getByRole("button", { name: "Помощь", exact: true }).click();
      assert.equal(await page.evaluate(() => window.fixture.event), "navigate:/help");
      await page.getByRole("button", { name: "Выйти из разговора", exact: true }).click();
      await account.getByRole("button", { name: "Настройки", exact: true }).click();
      assert.equal(await page.evaluate(() => window.fixture.event), "navigate:/settings");
      assert.equal(await page.locator(".voople-voice-dock--compact").count(), 0);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(artifacts, `orbit-rail-${host}-${state}-640.png`) });
    console.log(`PASS Orbit rail ${host} ${state}: separate modes, bounded lists and persistent actions`);
    await page.close();
  }
}

async function verifyDirectDock({ browser, baseUrl, artifacts }) {
  for (const host of ["web", "desktop"]) for (const width of [360, 1024, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, hasTouch: width === 360 });
    const errors=[];page.on("pageerror",error=>errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem("voople:app-theme", "void");
      localStorage.setItem("voople:app-preferences", JSON.stringify({ interfaceDesign: "orbit" }));
      localStorage.removeItem("voople:sidebar-collapsed:v1");
    });
    await page.goto(`${baseUrl}?host=${host}&search=1&orbit-test=1&dm-test=1`);
    const input = page.getByRole("textbox", { name: "Сообщение", exact: true });await input.waitFor();
    await input.fill("Первая строка\nВторая строка\nТретья строка");
    await page.waitForTimeout(550);
    const check = async () => {
      const dock = await page.locator(width >= 1024 ? '[data-account-dock="true"]' : '.voople-orbit-voice-tile').boundingBox();
      const composer = await page.locator(".voople-chat-composer__surface").boundingBox();
      assert.ok(dock.x + dock.width <= composer.x || dock.y + dock.height <= composer.y || composer.y + composer.height <= dock.y, `${host} ${width}: call/account dock cannot cover a multiline DM composer: ${JSON.stringify({dock,composer})}`);
      if (width >= 1024) assert.ok(Math.abs(dock.y + dock.height - composer.y - composer.height) < 2, `DM composer and account dock share their bottom baseline: ${JSON.stringify({dock,composer})}`);
    };
    await check();
    await page.screenshot({ path: path.join(artifacts, `orbit-dm-open-${host}-${width}.png`) });
    if (width >= 1024) {
      assert.equal(Math.round((await page.locator(".voople-sidebar").boundingBox()).width), 72, "DM route keeps rail width fixed");
      await page.getByRole("region", { name: "Личные", exact: true }).waitFor();
      await page.getByRole("button", { name: "Развернуть боковую панель" }).click();await check();
      await page.getByRole("button", { name: "Выйти из разговора", exact: true }).click();await check();
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors,[]);
    await page.screenshot({ path: path.join(artifacts, `orbit-dm-${host}-${width}.png`) });
    console.log(`PASS Orbit DM ${host} ${width}: multiline composer, rail modes, no-call account`);
    await page.close();
  }
}
