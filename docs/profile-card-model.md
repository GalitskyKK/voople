# Модель карточки профиля (целевая)

Документ фиксирует продуктовую модель по слотам кастомизации. Текущий код частично расходится — см. «Сейчас vs цель».

## Слоты для пользователя (как показывать в UI)

| Слот в UI | Что делает | Источник |
|-----------|------------|----------|
| **Баннер** | Главный визуал сверху: картинка / GIF / WebM / MP4 | Магазин или свой upload (Voople+) |
| **Основа карточки** | Тот же ассет, что баннер, но **blur + подложка**; опционально свой градиент/цвет (Voople+) | Автоматически от баннера + `theme_primary` / `theme_accent` |
| **Рамка карточки** | Обводка вокруг **баннер + основа** (единый блок), padding ~10px, цвет / прозрачная / glass | Магазин (замена эффектов) |
| ~~Эффект профиля~~ | Deprecated → рамка или минимальные CSS-пресеты | — |

Пользователь **не должен** думать про «фон карточки» и «баннер» как два независимых video-слота. Один медиа-источник → два представления (sharp / blur).

## Визуальная структура

```text
┌─ рамка (padding ~10px, optional) ─────────────────────┐
│  ┌─ баннер (sharp media) ──────────────────────────┐ │
│  │  gap 48px                                        │ │
│  └──────────────────────────────────────────────────┘ │
│  ┌─ основа (blurred media + glass + gradient) ──────┐ │
│  │  аватар (-overlap) · имя · bio · status · stats  │ │
│  └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

Split-layout (баннер отдельно от основы + gap) включается **всегда**, когда у баннера есть медиа-ассет — не только при `profile_background_id`.

## Баннер

- **Магазин**: статик WebP/APNG, animated WebP/APNG, video (webm+mp4+poster).
- **Voople+**: upload фото / GIF / короткое video / рисование (`setCustomBanner`).
- Без медиа — fallback цвет (`banner_value.color`).

## Основа карточки

- Дублирует URL/источник баннера.
- Blur + `ProfileCardContentBackdrop` (glass).
- Поверх — опциональный градиент Voople+ (`theme_primary`, `theme_accent`) как tint, не как сплошная заливка.
- Текст: `--foreground` по light/dark shell.

## Рамка (замена эффектов)

- `profile_frame_id` (новый слот, TBD) вместо `profile_effect_id`.
- CSS: `padding: 10px`, `border` / `box-shadow` / `backdrop-filter` на wrapper вокруг banner+body.
- Варианты: solid color, gradient, glass (прозрачная с blur), none.
- Эффекты-партиклы — убрать из магазина или оставить 1–2 минимальных CSS-пресета.

## Тема приложения (shell)

- `app_theme_id` в БД — источник правды для авторизованных.
- `void` / `light` — бесплатные, без ownership.
- `localStorage` — кэш + гости.
- Выбор в `AppThemeSelector` пишет в БД через `customization.update`.

## Сейчас vs цель

| | Было | Стало / Цель |
|---|--------|------|
| Split-layout | Только `profile_background_id` (video) | ✅ Любой медиа-баннер (`hasBannerMedia`) |
| Дублирование на основу | Только profile background video | ✅ Любой баннерный ассет (`cardBaseMode: mirror`) |
| Эффекты | Overlay z-25 на всю карточку | ✅ Рамка-кольцо вокруг composite (`profile_frame_id`) |
| Shop «Фон карточки» | Отдельный item `bg-blue-flowers` | ⏳ Merge в баннер / alias (переходный, Фаза «чистка») |
| Тема shell | localStorage, `light` не в `isAppThemeId` (исправлено) | DB + localStorage |

## План миграции (кратко)

1. **Фаза 1** (готово): split video layout, glass body, fix app theme.
2. **Рендер+модель** (готово): `resolveBannerMedia()` — единый тип
   `{ kind: image|video|none, ... }`; split-layout по `hasBannerMedia` (любой медиа-баннер);
   рамка `profile_frame_id` (`frames-registry.ts`, `ProfileCardFrame.tsx`) вместо
   `ProfileCardEffectLayer`; колонки `profile_frame_id`/`frame_color`/`card_base_mode`;
   основа-зеркало (`cardBaseMode: mirror`).
3. **Фаза «магазин»** (в работе): каталог `kind: frame` + `equipSlot: profile_frame_id`; убрать
   секцию эффектов из магазина/editor; write-path (equip/clear/update) для рамки/цвета/base-mode;
   editor-контролы (пресет + пикер цвета Voople+ + режим основы).
4. **Фаза «чистка»**: убрать `profile_background_id` как отдельный shop slot (video-баннеры в
   каталоге `kind: banner`, `mediaKind: video`); удалить неиспользуемый effect-рендер; подключить
   реальные картиночные рамки.

См. также `docs/customization.md`, `docs/shop-catalog.md`.
