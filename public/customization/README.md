# Customization assets (local dev)

Положите тестовые файлы сюда; в prod — Selectel S3 + CDN с теми же путями (`NEXT_PUBLIC_ASSETS_CDN_URL`).

URL резолвится в `src/lib/customization/asset-path.ts`. Каталог магазина: `src/lib/shop/catalog.ts` — добавление предмета: `docs/shop-catalog.md`.

## Launch (файлы в бакете)

| Папка | assetId | Формат |
|-------|---------|--------|
| `banners/` | `minti` | WebP баннер профиля |
| `effects/` | `ladybugs` | WebP/APNG поверх карточки |
| `decorations/` | `sparkle` | WebP вокруг аватара |
| `feed-cards/` | `sakura` | WebP фон полоски в ленте |
| `animated/` | `minti.apng` | Зацикленный аватар **в круге** (слот `animated_avatar_id`) |

Имена: `id` из мока/БД. Если расширения нет — подставляется `.webp` (`ladybugs` → `ladybugs.webp`). Можно указать id с расширением: `ladybugs.webp`.

## Примеры путей в коде

- `/customization/effects/ladybugs`
- `/customization/decorations/sparkle`
- `/customization/feed-cards/sakura`
- `/customization/animated/minti.apng`
- `/customization/banners/minti`
- `/customization/themes/violet`
- `/customization/themes/gold.apng`

Если файла нет, эффект скрывается (`onError` на `<img>`), профиль остаётся с дефолтной тёмной темой.
