# Каталог кастомизации

## Категории в UI (как Discord)

Секции заданы в `src/lib/shop/categories.ts` — каталог, инвентарь и «Настройка» используют один порядок.

| Секция Voople | Аналог Discord | Предметы Launch |
|---------------|----------------|-----------------|
| Баннер профиля | Баннер профиля | Minti |
| Эффект профиля | Сменить эффект профиля | Ladybugs |
| Аватар | Украшение + анимированный аватар (+ кольцо) | Sparkle, Minti, Glow Purple |
| Имя в профиле | Стиль отображаемого имени | Neon Pink |
| Лента | — (у Discord нет 1:1) | Sakura |
| Тема приложения | Тема Nitro меняет и профиль, и shell; у нас **только shell** | Violet, Emerald, Rose, Gold |

**Не в магазине (как Discord):** загрузка фото/GIF аватара — `ProfileEditSheet` → свои файлы.

Описания в каталоге — короткий теглайн (1 строка), без форматов и технических пояснений.

### «Тема карточки профиля» (пока не в магазине)

В Discord в настройках профиля есть **два цвета** — фон и акцент **самой карточки** (не всего приложения).

У Voople это поля `profile_customization.theme_primary` и `theme_accent` (дефолт из `src/lib/constants/theme.ts`). Сейчас их **нет** в каталоге магазина: карточка берёт дефолт, плюс визуал от баннера. Отдельные «темы профиля» в shop — на потом.

**Тема приложения** (`app_theme_id`) — другое: меняет весь shell (лента, сайдбар, фон страницы), см. `src/lib/app-themes.ts`.

## Где что хранится

| Что | Где правда | Что пишется при equip |
|-----|------------|------------------------|
| Каталог (имя, цена, слот, путь CDN) | `src/lib/shop/catalog.ts` → `shop_items` | — |
| Владение предметом | `user_inventory.item_id` | claim / покупка |
| Баннер (магазин) | CDN `customization/banners/{id}` | `banner_type`, `banner_value` через `equip` |
| Свой баннер | upload storage | `banner_value` через `setCustomBanner`, **нужен Voople+** (`subscriptions.expires_at`) |
| Эффект карточки | CDN `customization/effects/{id}` | `profile_effect_id` |
| Украшение аватара | CDN `customization/decorations/{id}` | `avatar_decoration_id` |
| Кольцо (CSS-обводка) | код UI | `avatar_ring_id` |
| Анимация в круге | CDN `customization/animated/{id}` | `animated_avatar_id` |
| Стиль имени | hex в каталоге | `nickname_color`, `nickname_gradient` |
| Лента | CDN `customization/feed-cards/{id}` | `feed_card_style_id` |
| Тема приложения | `src/lib/app-themes.ts` | `app_theme_id` + localStorage `voople:app-theme` |
| Свой аватар (фото) | upload → storage | `avatar_type=photo`, `avatar_data` |
| Цвета карточки (дефолт) | `theme.ts` / колонки БД | не из магазина пока |

Рендер: `resolveCustomization()` + `ProfileCardHeader` / лента / `AppThemeProvider`.

## Слоты (что куда влияет)

| Shop `kind` | Equip-поле в БД | Что меняется в UI |
|-------------|-----------------|-------------------|
| `banner` | `banner_value` | Верх карточки профиля |
| `effect` | `profile_effect_id` | Оверлей **на всю карточку** (божьи коровки и т.п.) |
| `decoration` | `avatar_decoration_id` | Картинка **вокруг** круга аватара |
| `animated_avatar` | `animated_avatar_id` | **Круг аватара**: зацикленный WebP/APNG вместо буквы |
| `feed_card` | `feed_card_style_id` | Полоска автора в ленте |
| `ring` | `avatar_ring_id` | CSS-кольцо вокруг аватара |
| `nickname_style` | `nickname_color` + `nickname_gradient` | Цвет/градиент display name |
| `app_theme` | `app_theme_id` | **Весь shell** (`--background`, `--theme-accent`, …) |

### Анимированный аватар `animated-minti`

Файл `customization/animated/minti.apng` в круге аватара. Отдельно от баннера Minti и эффекта Ladybugs.

Загрузка своего фото — в редактировании профиля, не в магазине.

### Темы приложения (Violet, Emerald, …)

Меняют **интерфейс** (фон страницы, акценты, панели), не карточку профиля.

Цвета: `src/lib/app-themes.ts` → `equipValue` = `violet` | `emerald` | `rose` | `gold`.

После equip:

1. Пишется `profile_customization.app_theme_id`.
2. Клиент: `AppThemeSync` + `applyEquippedAppTheme` применяют CSS-переменные на `<html>`.

Фоны `customization/themes/*` опциональны; без файлов тема всё равно видна по токенам.

**Проверка:** зайди в `/shop` → «Настройка» → «Тема приложения» → надень Emerald — фон приложения должен стать зеленоватым. Обнови страницу — тема должна сохраниться.

## CDN vs CSS

| | Бакет | `catalog.ts` |
|---|--------|--------------|
| **CDN** | Да | `assetFolder` + `assetId` |
| **CSS** | Нет | только `equipSlot` + `equipValue` |

## Источник правды

```text
src/lib/shop/catalog.ts
drizzle/shop-catalog-upsert.sql   → копируешь в Supabase SQL Editor
```

Терминал не обязателен.

## Supabase: обновить каталог

1. Открой `drizzle/shop-catalog-upsert.sql`.
2. SQL Editor → Run целиком.

### `type` в SQL vs `kind` в коде

| `kind` (catalog) | `type` (Postgres enum) |
|------------------|------------------------|
| `animated_avatar` | `effect` |
| `nickname_style` | `nameplate` |
| остальные | совпадает |

В UI всегда `kind` из `catalog.ts` по `id`.

### Один предмет вручную

```sql
INSERT INTO public.shop_items (
  id, season_id, type, name, description, price_rub, price_coins, is_free,
  preview_url, sort_order, asset_folder, asset_id, equip_slot, equip_value
) VALUES (
  'theme-emerald', 'launch', 'app_theme', 'Emerald', 'Зелёная тема shell.', 89, 200, true,
  NULL, 90, NULL, NULL, 'app_theme_id', 'emerald'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_rub = EXCLUDED.price_rub,
  price_coins = EXCLUDED.price_coins,
  is_free = EXCLUDED.is_free,
  sort_order = EXCLUDED.sort_order,
  equip_slot = EXCLUDED.equip_slot,
  equip_value = EXCLUDED.equip_value;
```

## Текущий Launch-каталог

| id | CDN |
|----|-----|
| banner-minti, effect-ladybugs, decoration-sparkle, feed-sakura, animated-minti | да |
| ring-glow-purple, style-neon-pink | CSS |
| theme-violet, theme-emerald, theme-rose, theme-gold | CSS (+ опционально themes/*) |

См. [shop.md](./shop.md) — оплата и equip API.
