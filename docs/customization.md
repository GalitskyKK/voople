# Customization Specs

Документ для дизайнеров и разработчиков ассетов профиля. Все размеры указаны в CSS px для 1x layout; растровые ассеты экспортировать минимум в 2x.

## Общие Требования

- Цветовой профиль: sRGB.
- Прозрачность: premultiplied alpha не использовать, экспорт обычный RGBA.
- Без встроенного текста в декоративных ассетах: локализация и accessibility остаются в UI.
- Safe area: важные детали не ближе 12px к краям мобильного контейнера и 24px к краям desktop-контейнера.
- Максимальный вес одного декоративного ассета: 500 KB для static, 1.5 MB для animated. Всё тяжелее требует отдельного согласования.

## Profile Card Geometry

| Surface             |                            Mobile |                           Desktop |
| ------------------- | --------------------------------: | --------------------------------: |
| Card width          |          100% viewport minus 32px |                320px sidebar card |
| Banner visible area |                      100% x 110px |                     320px x 120px |
| Avatar              |                              72px |                              88px |
| Avatar overlap      |                  36px over banner |                  44px over banner |
| Effect overlay      | full card (z-25), clipped by radius | full card (z-25), clipped by radius |
| Card radius         |                              16px |                              16px |

## Banner

- Назначение: верхний визуальный слой карточки.
- Форматы: WebP/PNG для static, animated WebP/APNG только если вес в лимите.
- Export mobile: 750x220.
- Export desktop: 640x240.
- Object fit в UI: `cover`, `object-position: center` на контейнере `aspect-[8/3]`.
- Custom upload / draw export: **640×240** WebP (`BannerDrawEditor`, `setCustomBanner`).
- Safe area при рисовании: центр **70%** ширины (на узкой карточке боковые поля обрезаются).
- Не закладывать текст, логотипы брендов, мелкие UI-детали.

## Avatar

- Static photo: square WebP/PNG, минимум 256x256, рекомендовано 512x512.
- Animated avatar: WebP/APNG, 256x256, loop seamless, max 1.5 MB.
- Constructor avatar: SVG layers, viewBox `0 0 512 512`.
- Важная зона лица: круг диаметром 72% canvas, центр `256,240`.

## Avatar Ring

Кольца — **CSS-обводки**, не картинки. Каждое кольцо — запись в
`src/lib/customization/rings.ts` (`ring id → CSS-класс`) + класс `.voople-ring--<id>`
в `globals.css`. Один источник правды для профиля и превью магазина.

- Хранится в `avatar_ring_id` как `equipValue` предмета (например `glow-purple`).
- Реализация: `box-shadow` поверх круглого аватара (рамка + опциональное свечение).
- Толщина видимой рамки: 3-6px mobile, 4-8px desktop.
- Animation: CSS, duration >= 2.4s, без rapid flashing; обязательно под `@media (prefers-reduced-motion: no-preference)`.
- Неизвестный id → дефолтное кольцо (акцент темы), чтобы купленное кольцо не пропадало.
- Image ring (SVG/WebP transparent) — только как исключение; по умолчанию используйте CSS.

### Как добавить кольцо

1. `rings.ts`: `"<id>": { className: "voople-ring voople-ring--<id>" }`.
2. `globals.css`: `.voople-ring--<id> { box-shadow: … }` (+ keyframes при анимации).
3. Каталог: `kind: "ring"`, `equipSlot: "avatar_ring_id"`, `equipValue: "<id>"`, без `assetFolder`.

## Profile Effect

Эффект — декоративный overlay поверх **всей** карточки. Бывает двух видов:

1. **Картиночный** (APNG / animated WebP) — файл в `customization/effects/`.
2. **Code-driven (CSS)** — частицы рисуются кодом из пресета, **файл не нужен** (см. ниже «Animated Effects (CSS)»).

Рендер выбирает вид автоматически: если `equipValue` совпадает с id пресета в
`src/lib/customization/effects-registry.ts` — рисуется CSS-эффект; иначе грузится
картинка `customization/effects/{equipValue}.webp`.

### Картиночный эффект

- Форматы: APNG/animated WebP для lightweight effects; Lottie не использовать без отдельного решения по runtime cost.
- Export mobile: 750x900.
- Export desktop: 640x900.
- UI placement: `position:absolute; inset:0; object-fit:cover; pointer-events:none`. Слой над контентом карточки (`z-25`), но `pointer-events-none` не мешает кликам.
- Alpha coverage: не перекрывать более 25% площади непрозрачными пикселями — иначе нечитаемы имя/био.
- Motion: loop 3-8s, без резких вспышек.
- `prefers-reduced-motion`: для картиночных эффектов статичного fallback нет — закладывайте «спокойный» first frame; для движущихся эффектов предпочитайте CSS-вид, он полностью отключается при reduced-motion.

## Animated Effects (CSS / code-driven)

«Как в Discord»: частицы (снег, конфетти, искры, светлячки) генерируются кодом, а
не тяжёлым APNG. Это дешевле по весу и трафику и автоматически уважает
`prefers-reduced-motion`.

### Как добавить новый CSS-эффект

1. **Пресет** — запись в `src/lib/customization/effects-registry.ts`:
   `{ id, name, kind, count, colors[], durationSec }`.
   - `kind`: `snow | confetti | sparkles | fireflies` (форма/траектория частицы).
   - `count`: число частиц на десктопе (на мобиле рендерер не увеличивает; держите ≤ 48, иначе CPU).
   - `colors`: палитра CSS-цветов; держите ≤ 5.
   - `durationSec`: длительность цикла, 4–8 с.
2. **Keyframes** — если вводите новый `kind`, добавьте класс `.voople-fx__p--<kind>` и `@keyframes voople-fx-<kind>` в `src/app/globals.css`. Существующие 4 вида уже описаны.
3. **Каталог** — предмет `kind: "effect"` **без** `assetFolder`/`assetId`, `equipValue` = id пресета (см. `effect-css-*` в `catalog.ts`).

### Технические требования к CSS-эффектам

| Параметр | Значение |
| --- | --- |
| Контейнер | весь card, `position:absolute; inset:0; pointer-events:none`, clip по `rounded-2xl` |
| Stacking | `z-25` (над контентом, под модалями) |
| Частиц на десктоп | рекомендовано 18–40, жёсткий потолок 48 |
| Длительность цикла | 4–8 с, `animation-iteration-count: infinite` |
| Координаты | в `%` (горизонталь) и `cqh`/`cqw` (контейнерные единицы для падения) — независимы от размера карточки |
| Alpha / читаемость | суммарная площадь частиц не должна перекрывать > 20% карточки; без вспышек |
| Пауза | автоматически при скрытой вкладке (`visibilitychange`) и вне вьюпорта (`IntersectionObserver`) |
| Reduced motion | эффект **не рендерится** (и в JS, и CSS-гейтом) |
| Детерминизм | раскладка частиц seeded по id пресета → нет hydration mismatch |

Рендерер: `src/components/profile/effects/CssEffectLayer.tsx`. Превью в магазине
показывает реальные частицы (`ShopCatalogPreview`).

## Nameplate / Display Name Style

- Nameplate image не используется для текста. Текст рендерится HTML.
- Допустимы: color, gradient, subtle glow via CSS.
- Контраст имени: минимум WCAG AA на основном фоне карточки.
- Gradient должен иметь fallback single color.

## Feed Card Style

- Назначение: компактная декоративная полоска/акцент в `PostAuthorRow`.
- Canvas: 640x96, transparent WebP/PNG или CSS token.
- Не должен увеличивать высоту карточки поста больше чем на 8px.
- Не использовать анимацию в ленте.

## Inventory Preview

- Shop grid preview: 160x160.
- Detail preview: 320x320.
- Все превью должны выглядеть читаемо на фоне `#0A0A0F` и `#1c1c1e`.

## App Themes

- App theme меняет весь shell: `--background`, `--foreground`, `--app-surface`, `--app-border`, `--theme-accent`.
- Profile customization остаётся отдельной: карточка профиля может иметь собственные `themePrimary/themeAccent`.
- Default theme `void` доступна сразу; темы в магазине (`app_theme`) работают на CSS-токенах из `app-themes.ts`; фоны в CDN опциональны (см. [shop-catalog.md](./shop-catalog.md)).
- Theme preview: color swatches или static preview из `/customization/themes/` (CDN in prod).
- Растровые фоны: WebP/PNG static, animated WebP/APNG до 1.5 MB; при `prefers-reduced-motion` используется `backgroundStaticId`.
- Optional overlay: transparent WebP/APNG поверх фона, под scrim.
- Анимации переключения темы — только лёгкие color/background transitions, без layout shift.

### App Theme Asset Specs

| Asset            |      Mobile export | Desktop export | Formats                             |      Max weight |
| ---------------- | -----------------: | -------------: | ----------------------------------- | --------------: |
| Shell background |           750×1334 |      1920×1080 | WebP/PNG static, WebP/APNG animated | 500 KB / 1.5 MB |
| Shell overlay    |           750×1334 |      1920×1080 | WebP/APNG transparent               |          300 KB |
| Static fallback  | same as background |           same | WebP/PNG                            |          500 KB |

Naming:

```text
theme_<slug>.webp
theme_<slug>-static.webp
theme_<slug>-overlay.webp
theme_<slug>.apng
```

## Badges

- Бейджи — часть системы кастомизации/инвентаря, если они покупаются или экипируются.
- Earned/system badges хранятся отдельно в `user_badges`.
- Purchased badges хранятся как `shop_items.type = 'badge'` и владение через `user_inventory`.
- UI профиля не должен содержать хардкод декоративных бейджей. Исключение: системный Voople+ badge по активной подписке (`pins/vooplus.gif` на CDN).

### Badge Asset Specs

- Canvas: 64x64 SVG preferred.
- Raster fallback: 128x128 WebP/PNG.
- Visible shape should fit 56x56 safe area.
- Stroke width: 1.5-2.5px at 64px.
- No text inside badge unless it is a stable brand mark approved for all locales.
- Max weight: 50 KB SVG, 80 KB raster.

## Naming

```text
banner_<season>_<slug>.webp
effect_<season>_<slug>.webp
ring_<season>_<slug>.svg
avatar_<layer>_<slug>.svg
feedcard_<season>_<slug>.webp
```

## Shop slots vs assets

| Слот                   | Назначение                                       |
| ---------------------- | ------------------------------------------------ |
| `profile_effect_id`    | Анимация **поверх всей** карточки профиля        |
| `animated_avatar_id`   | Анимация **внутри круга** аватара (вместо буквы) |
| `avatar_decoration_id` | Декор вокруг аватара                             |
| `app_theme_id`         | Тема **приложения** (shell), не карточки         |

Подробно и чеклист добавления: [shop-catalog.md](./shop-catalog.md).

## Runtime Paths

```text
src/lib/customization/asset-path.ts        → resolve URL (CDN or /public)
src/lib/customization/resolve.ts           → flags + asset URLs/preset id для профиля/ленты
src/lib/customization/effects-registry.ts  → пресеты CSS-эффектов (частицы)
src/lib/customization/rings.ts             → CSS-кольца аватара (id → класс)
src/components/profile/effects/CssEffectLayer.tsx → рендер CSS-эффектов (RAF/observer/reduced-motion)
src/lib/shop/catalog.ts                    → единый каталог магазина (см. shop-catalog.md)
src/lib/app-themes.ts                      → токены тем shell для app_theme
src/components/theme/AppThemeSync.tsx      → app_theme_id из БД → CSS variables
src/server/mappers/customization.ts        → DB row → ProfileCustomizationView
```

Prod env:

```bash
NEXT_PUBLIC_ASSETS_CDN_URL=https://cdn.voople.ru
```

Dev: omit CDN env → files served from `public/customization/`.

## User-created assets

**Сейчас (MVP):**

| Слот                                     | Свой контент                                                                                               |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Баннер                                   | Свой файл / рисование — **только Voople+** (`setCustomBanner`). Готовые баннеры — магазин (`equip` banner) |
| Аватар                                   | Загрузка фото (`setAvatarPhoto`)                                                                           |
| Эффект, кольцо, декор, стиль ленты, тема | Только предметы из **магазина** → экипировка на `/shop?tab=customize`                                      |

**Не путать** с холстом на обороте карточки (`profile_canvas_strokes`) — это совместное рисование, не equip-слот.

**Планируется:** загрузка/рисование пользовательских ассетов по слотам (effect, ring, feed card) с safe area и модерацией — отдельный upload pipeline по аналогии с `banner`, без подмены shop catalog id.

## Acceptance Checklist

- Mobile и desktop previews экспортированы.
- Вес ассета в лимите.
- Safe area проверена на профиле с длинным display name и bio.
- Нет текста внутри изображения.
- Анимация не мешает чтению имени, username, bio и status block.
- Есть static fallback для animated assets.
