# Админка каталога ассетов

DB-first управление предметами магазина: CRUD в БД + загрузка файлов в CDN (Selectel S3).

## Доступ

1. В `.env.local` добавьте UUID своего аккаунта:

```bash
VOOPLE_ADMIN_USER_IDS=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Несколько админов — через запятую.

2. В Supabase SQL Editor один раз:

```text
docs/sql/admin-shop-setup.sql
```

3. (Опционально) синхронизировать Launch-каталог из legacy `catalog.ts`:

```bash
npm run shop:seed:sql
```

→ скопировать `drizzle/shop-catalog-upsert.sql` в SQL Editor.

4. Откройте **`/admin/assets`** (нужен login под allowlisted user).

## Что умеет

| Действие | Где |
|----------|-----|
| Список всех предметов | `/admin/assets` |
| Создать / изменить метаданные | форма в sheet |
| Загрузить файл в бакет | кнопка «Загрузить» → presigned PUT в `customization/{folder}/{file}` |
| Удалить предмет | только если нет записей в `user_inventory` |

## Источник правды

```text
shop_items (Supabase)  →  runtime магазин / equip / preview
customization/* (S3)     →  CDN-ассеты
```

`src/lib/shop/catalog.ts` — **legacy seed** для первичного наполнения; новые предметы добавляйте через админку.

## CSS-предметы (без файла)

| kind | Что ещё нужно в коде |
|------|----------------------|
| `effect` (CSS-частицы) | запись в `effects-registry.ts` |
| `ring` | `rings.ts` + CSS |
| `nickname_style` | только equipValue (hex) |
| `app_theme` | `app-themes.ts` (цвета shell) |

Админка создаёт строку в БД и `equipValue`; визуал CSS-пресетов по-прежнему в реестрах.

## profile_background (video-пакет)

Три файла с **общим базовым id** (`equipValue`), конвенция из `profile-background-assets.ts`:

| Файл | Назначение |
|------|------------|
| `{base}-static.jpg` | Poster / reduced motion, превью в магазине |
| `{base}-webm.webm` | Loop (Chrome, Firefox) |
| `{base}-video.mp4` | Fallback (Safari) |

Пример: `equipValue = background_blue_flowers` → три файла в `customization/backgrounds/`.

В админке: тип «Фон карточки» → базовый id → «Загрузить все 3 файла» (JPEG + WebM + MP4).

## Другие типы (один файл)

| kind | Файл(ы) | Примечание |
|------|---------|------------|
| `banner`, `effect`, `decoration`, `feed_card` | один WebP/APNG/… | `{id}.webp` по умолчанию |
| `animated_avatar` | один `.apng` / `.webp` | id с расширением |
| `app_theme` | опционально `themes/*` | цвета в `app-themes.ts` |
| `ring`, `nickname_style`, CSS-`effect` | без CDN | реестры в коде |

Video-баннеры (будущее) используют **ту же** конвенцию `{base}-static/webm/video` в `banners/`.

## Безопасность

- UI: `requireAdminSession()` в `src/app/admin/layout.tsx`
- API: `adminProcedure` в tRPC (`VOOPLE_ADMIN_USER_IDS`)
- Запись в `shop_items` — service role (server only)
- Без env allowlist админка недоступна (403)
