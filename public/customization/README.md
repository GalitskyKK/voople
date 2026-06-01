# Customization assets (local dev)

Положите тестовые файлы сюда; в prod — Selectel S3 + CDN с теми же путями (`NEXT_PUBLIC_ASSETS_CDN_URL`).

URL резолвится в `src/lib/customization/asset-path.ts`. Shop catalog: `src/lib/shop/catalog.ts`.

## Структура

| Папка | ID в моке (minti) | Формат |
|-------|-------------------|--------|
| `effects/` | `ladybugs` → `effects/ladybugs.png` (или `.webp`, `.gif`) | PNG/WebP/GIF поверх карточки профиля |
| `decorations/` | `sparkle` | PNG/WebP вокруг аватара |
| `feed-cards/` | `sakura` | фон минимизированной полоски в ленте |
| `animated/` | опционально `minti` | GIF/WebP/APNG для анимированного аватара |
| `banners/` | `minti` → `banners/minti.webp` | баннер карточки профиля (~1200×360) |
| `themes/` | `violet` → `themes/violet.webp` | фон shell приложения (WebP/APNG) |

Имена: `id` из мока/БД. Если расширения нет — подставляется `.webp` (`ladybugs` → `ladybugs.webp`). Можно указать id с расширением: `ladybugs.webp`.

## Примеры путей в коде

- `/customization/effects/ladybugs`
- `/customization/decorations/sparkle`
- `/customization/feed-cards/sakura`
- `/customization/animated/minti`
- `/customization/banners/minti`
- `/customization/themes/violet`
- `/customization/themes/gold.apng`

Если файла нет, эффект скрывается (`onError` на `<img>`), профиль остаётся с дефолтной тёмной темой.
