# Customization Specs

Документ для дизайнеров и разработчиков ассетов профиля. Все размеры указаны в CSS px для 1x layout; растровые ассеты экспортировать минимум в 2x.

## Общие Требования

- Цветовой профиль: sRGB.
- Прозрачность: premultiplied alpha не использовать, экспорт обычный RGBA.
- Без встроенного текста в декоративных ассетах: локализация и accessibility остаются в UI.
- Safe area: важные детали не ближе 12px к краям мобильного контейнера и 24px к краям desktop-контейнера.
- Максимальный вес одного декоративного ассета: 500 KB для static, 1.5 MB для animated. Всё тяжелее требует отдельного согласования.

## Profile Card Geometry

| Surface | Mobile | Desktop |
|---|---:|---:|
| Card width | 100% viewport minus 32px | 320px sidebar card |
| Banner visible area | 100% x 110px | 320px x 120px |
| Avatar | 72px | 88px |
| Avatar overlap | 36px over banner | 44px over banner |
| Effect overlay | full card, clipped by card radius | full card, clipped by card radius |
| Card radius | 16px | 16px |

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

- Форматы: CSS ring preferred; image ring только SVG/WebP transparent.
- Canvas: 128x128 для mobile, 160x160 для desktop.
- Внутренний прозрачный круг: минимум 72px mobile / 88px desktop в CSS scale.
- Толщина видимой рамки: 3-6px mobile, 4-8px desktop.
- Animation: CSS transform/gradient, duration >= 2.4s, без rapid flashing.

## Profile Effect

- Назначение: декоративный overlay поверх всей карточки.
- Форматы: APNG/animated WebP для lightweight effects; Lottie не использовать без отдельного решения по runtime cost.
- Export mobile: 750x900.
- Export desktop: 640x900.
- UI placement: `position:absolute; inset:0; object-fit:cover; pointer-events:none`.
- Alpha coverage: не перекрывать более 25% площади непрозрачными пикселями.
- Motion: loop 3-8s, без резких вспышек, уважать `prefers-reduced-motion`.

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

| Asset | Mobile export | Desktop export | Formats | Max weight |
|---|---:|---:|---|---:|
| Shell background | 750×1334 | 1920×1080 | WebP/PNG static, WebP/APNG animated | 500 KB / 1.5 MB |
| Shell overlay | 750×1334 | 1920×1080 | WebP/APNG transparent | 300 KB |
| Static fallback | same as background | same | WebP/PNG | 500 KB |

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
- UI профиля не должен содержать хардкод декоративных бейджей. Исключение: системный Voople+ badge по активной подписке.

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

| Слот | Назначение |
|------|------------|
| `profile_effect_id` | Анимация **поверх всей** карточки профиля |
| `animated_avatar_id` | Анимация **внутри круга** аватара (вместо буквы) |
| `avatar_decoration_id` | Декор вокруг аватара |
| `app_theme_id` | Тема **приложения** (shell), не карточки |

Подробно и чеклист добавления: [shop-catalog.md](./shop-catalog.md).

## Runtime Paths

```text
src/lib/customization/asset-path.ts   → resolve URL (CDN or /public)
src/lib/customization/resolve.ts      → flags + asset URLs for profile/feed
src/lib/shop/catalog.ts               → единый каталог магазина (см. shop-catalog.md)
src/lib/app-themes.ts                 → токены тем shell для app_theme
src/components/theme/AppThemeSync.tsx → app_theme_id из БД → CSS variables
src/server/mappers/customization.ts   → DB row → ProfileCustomizationView
```

Prod env:

```bash
NEXT_PUBLIC_ASSETS_CDN_URL=https://cdn.voople.ru
```

Dev: omit CDN env → files served from `public/customization/`.

## User-created assets

**Сейчас (MVP):**

| Слот | Свой контент |
|------|----------------|
| Баннер | Свой файл / рисование — **только Voople+** (`setCustomBanner`). Готовые баннеры — магазин (`equip` banner) |
| Аватар | Загрузка фото (`setAvatarPhoto`) |
| Эффект, кольцо, декор, стиль ленты, тема | Только предметы из **магазина** → экипировка на `/shop?tab=customize` |

**Не путать** с холстом на обороте карточки (`profile_canvas_strokes`) — это совместное рисование, не equip-слот.

**Планируется:** загрузка/рисование пользовательских ассетов по слотам (effect, ring, feed card) с safe area и модерацией — отдельный upload pipeline по аналогии с `banner`, без подмены shop catalog id.

## Acceptance Checklist

- Mobile и desktop previews экспортированы.
- Вес ассета в лимите.
- Safe area проверена на профиле с длинным display name и bio.
- Нет текста внутри изображения.
- Анимация не мешает чтению имени, username, bio и status block.
- Есть static fallback для animated assets.
