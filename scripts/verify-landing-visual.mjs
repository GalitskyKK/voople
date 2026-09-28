import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";

const root = process.cwd();
const css = await readFile(path.join(root, "src/components/landing/LandingPage.module.css"), "utf8");
const reviewDirectory = path.join(root, ".impeccable/review");

async function imageData(name) {
  const bytes = await readFile(path.join(root, `public/landing/${name}.png`));
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

const [nowImage, chatImage] = await Promise.all([imageData("now"), imageData("chat")]);

const appShot = (src, position, alt) => `
  <figure class="appShot" data-position="${position}">
    <div class="windowBar"><i></i><i></i><i></i><span>Voople</span></div>
    <img src="${src}" alt="${alt}" width="1536" height="1024">
  </figure>`;

const actions = `
  <div class="actions">
    <a class="primaryAction" href="#">↓ Скачать</a>
    <a class="secondaryAction" href="#">Открыть ↗</a>
  </div>`;

const sectionHeading = (title, copy) => `<header class="sectionHeading"><h2>${title}</h2><p>${copy}</p></header>`;

const html = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; }
    body { font-family: Inter, Arial, sans-serif; }
    a { color: inherit; text-decoration: none; }
    h1, h2, h3, p, figure, dl, dd, ul { margin: 0; }
    button, input { font: inherit; }
    ${css}
  </style>
</head>
<body>
  <div class="page">
    <header class="header"><div class="headerInner">
      <a class="brand" href="#"><span class="brandMark">⌁</span><span>VOOPLE</span></a>
      <nav class="headerNav"><a href="#groups">Группы</a><a href="#rooms">Комнаты</a><a href="#guest">Гостевой вход</a><a href="#plus">Group+</a></nav>
      <div class="accountActions"><a href="#">Войти</a><a href="#">Создать профиль</a></div>
    </div></header>
    <main>
      <section class="hero">
        <div class="heroLead"><div><h1>VOOPLE</h1><p>Группы друзей, общий чат и несколько голосовых комнат в одном приложении.</p></div>${actions}</div>
        ${appShot(nowImage, "center", "Раздел Войс группы")}
        <div class="heroIndex"><span>◉ постоянная группа</span><span>≋ Lobby и Rooms</span><span>▣ screen share</span><span>↗ гостевая ссылка</span></div>
      </section>

      <section id="groups" class="productSection">
        ${sectionHeading("Группы", "Состав, чат, файлы и история принадлежат группе. Голосовые комнаты меняются отдельно.")}
        ${appShot(chatImage, "left", "Общий чат постоянной группы")}
        <dl class="groupFacts"><div><dt>VOICEKK</dt><dd>7 участников</dd></div><div><dt>В голосе</dt><dd>Лобби · 3, DRG · 2</dd></div><div><dt>Чат</dt><dd>Общий и разделы группы</dd></div></dl>
      </section>

      <section id="rooms" class="productSection">
        ${sectionHeading("Комнаты", "Лобби — общий разговор. Остальные Room видны рядом; нажатие переключает текущую сессию.")}
        <div class="roomsComposition">
          ${appShot(nowImage, "right", "Активные комнаты группы")}
          <div class="roomLedger">
            <div class="roomLine" data-current="true"><span class="roomSignal">≋</span><strong>Лобби</strong><small>kk говорит</small><b>◉ 3</b></div>
            <div class="roomLine"><span class="roomSignal">▣</span><strong>DRG</strong><small>показывает экран</small><b>◉ 2</b></div>
            <div class="roomLine"><span class="roomSignal">≋</span><strong>Valorant</strong><small>18 минут</small><b>◉ 3</b></div>
            <div class="roomLine"><span class="roomSignal">≋</span><strong>Кино</strong><small>пусто</small><b>◉ 0</b></div>
          </div>
        </div>
      </section>

      <section class="mechanics">
        ${sectionHeading("Split / Switch / Voop", "Три действия внутри голосового слоя.")}
        <div class="mechanicRows">
          <article class="mechanicRow"><span class="mechanicIcon">⑂</span><div class="mechanicCopy"><h3>Split</h3><p>Отделиться из текущей Room во временную комнату.</p></div><div class="mechanicDemo"><span class="miniRoom" data-active="true">Лобби <i>вы здесь</i></span><b>→</b><span class="miniRoom">Split <i>временная</i></span></div></article>
          <article class="mechanicRow"><span class="mechanicIcon">⇄</span><div class="mechanicCopy"><h3>Switch</h3><p>Перейти в другую Room нажатием на её карточку.</p></div><div class="mechanicDemo"><span class="miniRoom">Лобби <i>3</i></span><b>→</b><span class="miniRoom" data-active="true">DRG <i>2 · экран</i></span></div></article>
          <article class="mechanicRow"><span class="mechanicIcon">＋</span><div class="mechanicCopy"><h3>Voop</h3><p>Позвать конкретного человека отойти вместе.</p></div><div class="mechanicDemo"><span class="personToken"><span>А</span> Аня</span><b>→</b><span class="inviteToken">Принять приглашение</span></div></article>
        </div>
      </section>

      <section class="productSection">
        ${sectionHeading("Приглашение", "Одна точка входа для человека, знакомой группы или гостевой ссылки.")}
        <div class="invitePanel"><div class="inviteTarget">＋<span><strong>Человек</strong><small>участник или знакомый</small></span>→</div><div class="inviteTarget">◉<span><strong>Группа</strong><small>знакомая компания</small></span>→</div><div class="inviteTarget">↗<span><strong>Ссылка</strong><small>доступ к одной Room</small></span>→</div></div>
      </section>

      <section id="guest" class="productSection">
        ${sectionHeading("Гостевой вход", "Ссылка → имя → Room. Регистрация не требуется до входа.")}
        <div class="guestFlow"><div><span>1</span><strong>voople.app/r/••••••••</strong><small>Ссылка на DRG</small></div><b>→</b><div><span>2</span><strong>Имя</strong><small>Микрофон выключен</small></div><b>→</b><div><span>3</span><strong>DRG · 3 человека</strong><small>Только эта Room</small></div></div>
        <div class="guestRule">✓ Чат и состав группы гостю не открываются.</div>
      </section>

      <section id="plus" class="productSection">
        ${sectionHeading("Group+", "Оформление и дополнительные возможности принадлежат группе. Голос, Split, Switch и Voop остаются бесплатными.")}
        <div class="plusPanel"><div class="identityPreview"><span class="identityMark">⌁</span><div><strong>VOICEKK</strong><small>group identity</small></div><div class="materials"><i></i><i></i><i></i><i></i></div></div><ul class="plusList"><li>◈<span><strong>Темы группы</strong><small>материалы Room и sidebar</small></span></li><li>♪<span><strong>Звуки</strong><small>набор принадлежит группе</small></span></li><li>♔<span><strong>Group utility</strong><small>качество, лимиты и identity slots</small></span></li></ul></div>
      </section>

      <section class="closing"><span class="closingMark">⌁</span><div><h2>VOOPLE</h2><p>Группы, чат и голосовые комнаты.</p></div>${actions}<small>Windows-сборка пока без цифровой подписи.</small></section>
    </main>
  </div>
</body>
</html>`;

await mkdir(reviewDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
for (const viewport of [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
]) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent(html, { waitUntil: "load" });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (overflow || errors.length > 0) {
    throw new Error(`${viewport.name}: overflow=${overflow}; errors=${errors.join(" | ")}`);
  }
  await page.screenshot({ path: path.join(reviewDirectory, `${viewport.name}.png`), fullPage: true });
  await page.close();
}
await browser.close();
console.log("Landing visual gate: desktop/mobile rendered without overflow or runtime errors.");
