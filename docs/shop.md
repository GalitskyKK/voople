# Shop And Commerce

Магазин кастомизации, внутренняя валюта **voops** и задел под оплату рублями (YooKassa).

## Маршруты и UI

| Route | Описание |
|-------|----------|
| `/shop` | Каталог, инвентарь, экипировка, донат (intent) |
| `/[username]` | Отображение equipped customization через `resolveCustomization()` |

Вкладки магазина:

1. **Каталог** — все `shop_items`, бесплатное получение / покупка за voops / ₽ (intent).
2. **Инвентарь** — предметы из `user_inventory`.
3. **Настройка** — экипировка по слотам + live-превью профиля.

Редактирование профиля (`ProfileEditSheet`) содержит ссылку на `/shop`.

## Voops (внутренняя валюта)

- Отображение: «voops» в UI магазина.
- Таблица: `user_wallets.balance_coins`.
- История: `wallet_transactions` (`kind`: `earn`, `spend`, …).
- При первом заходе в магазин создаётся кошелёк с **500 voops** (welcome bonus).
- Покупка предмета: `shop.purchaseWithCoins` → debit wallet → insert `user_inventory`.

Цены в каталоге заданы заранее (`price_coins`, `price_rub`), но сезон Launch сейчас **`is_free = true`** — все предметы можно забрать бесплатно через `shop.claimFree` / `shop.claimAllFree`.

## Каталог предметов

Source of truth для метаданных (имена, слоты, asset paths, будущие цены):

```text
src/lib/shop/catalog.ts
```

Seed в БД: `drizzle/12-shop-currency.sql` (таблица `shop_items`).

| ID (пример) | Слот equip | Asset |
|-------------|------------|-------|
| `banner-minti` | banner | `customization/banners/minti.webp` |
| `effect-ladybugs` | profile_effect_id | `customization/effects/ladybugs.webp` |
| `decoration-sparkle` | avatar_decoration_id | `customization/decorations/sparkle.webp` |
| `feed-sakura` | feed_card_style_id | `customization/feed-cards/sakura.webp` |
| `animated-minti` | animated_avatar_id | `customization/animated/minti.webp` |
| `ring-glow-purple` | avatar_ring_id | CSS ring |
| `style-neon-pink` | nickname_style | gradient color |
| `theme-violet` … `theme-gold` | app_theme_id | `customization/themes/*` |

## Экипировка

Equipped state хранится в `profile_customization`:

- `profile_effect_id`, `avatar_ring_id`, `banner_value`, `avatar_decoration_id`, `feed_card_style_id`, `animated_avatar_id`, `app_theme_id`, `nickname_color`, `nickname_gradient`.

tRPC:

- `customization.equip({ itemId })` — проверяет ownership в `user_inventory`, пишет нужное поле.
- `customization.clearSlot({ slot })` — снимает предмет со слота.
- `customization.update(...)` — точечное обновление с той же проверкой ownership.

Рендер профиля: `src/server/mappers/customization.ts` → `resolveCustomization()`.

App theme при equip также синхронизируется в `AppThemeProvider` на клиенте; в БД — `app_theme_id`.

## Ассеты и CDN

Пути резолвятся через `src/lib/customization/asset-path.ts`:

- Dev без CDN: `/customization/...` из `public/customization/`.
- Prod: `NEXT_PUBLIC_ASSETS_CDN_URL` + `/customization/...` (например `https://cdn.voople.ru`).

Локальная папка `public/customization/` остаётся для разработки и добавления новых файлов до заливки в S3.

## Платежи (рубли) — задел

Таблица `payment_intents`:

| Поле | Назначение |
|------|------------|
| `kind` | `shop_item` \| `coin_pack` \| `donation` |
| `amount_rub` | сумма в копейках/рублях (integer rub) |
| `status` | `pending` \| `succeeded` \| `canceled` \| `failed` |
| `provider` | `yookassa` |
| `external_id` | ID платежа YooKassa после создания |
| `metadata` | `{ itemId?, … }` |

tRPC `shop.createPaymentIntent` создаёт pending intent. Checkout URL и fulfillment — следующий шаг.

Webhook: `POST /api/webhooks/yookassa` — каркас обновления статуса intent по `metadata.paymentIntentId` (полная интеграция после подключения SDK).

Env:

```bash
YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=
YOOKASSA_WEBHOOK_SECRET=
```

## tRPC API

| Procedure | Auth | Описание |
|-----------|------|----------|
| `shop.overview` | protected | wallet + items + equipped + inventory |
| `shop.claimFree` | protected | бесплатное получение одного предмета |
| `shop.claimAllFree` | protected | все `is_free` предметы |
| `shop.purchaseWithCoins` | protected | покупка за voops |
| `shop.createPaymentIntent` | protected | intent для ₽ (shop/donation/coin_pack) |
| `customization.equip` | protected | надеть из инвентаря |
| `customization.clearSlot` | protected | снять слот |
| `customization.getEquipped` | protected | текущая экипировка |

## Server layers

```text
ShopPage / CustomizationEditor (client)
  → tRPC shop.* / customization.*
  → shop.service.ts / customization.service.ts
  → shop-rest.ts / customization-rest.ts
  → Supabase REST (service role)
```

Inventory INSERT только через server path — browser RLS не разрешает прямую вставку.

## Migration

Обязательно применить в Supabase SQL Editor **в два шага**:

1. **`drizzle/12-shop-currency-enums.sql`** — Run отдельно (enum labels commit).
2. **`drizzle/12-shop-currency.sql`** — Run вторым.

Добавляет: колонки `shop_items`, equip-поля `profile_customization`, `user_wallets`, `wallet_transactions`, `payment_intents`, seed каталога Launch.

## Smoke test

1. Login → `/shop` — виден баланс voops.
2. «Забрать всё бесплатное» — предметы в инвентаре.
3. «Настройка» → equip banner/effect — профиль обновляется после refresh.
4. Донат 100 ₽ — создаётся `payment_intent` со status `pending` (без реальной оплаты пока).

См. также [customization.md](./customization.md), [database.md](./database.md), [deploy.md](./deploy.md).
