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

Редактирование профиля: ссылка **Оформление профиля** → `/shop?tab=customize` (вкладка «Настройка»).

## Voops (внутренняя валюта)

- Отображение: «voops» в UI магазина.
- Таблица: `user_wallets.balance_coins`.
- История: `wallet_transactions` (`kind`: `earn`, `spend`, …).
- При первом заходе в магазин создаётся кошелёк с **500 voops** (welcome bonus).
- Покупка предмета: `shop.purchaseWithCoins` → debit wallet → insert `user_inventory`.

Цены в каталоге заданы заранее (`price_coins`, `price_rub`), но сезон Launch сейчас **`is_free = true`** — все предметы можно забрать бесплатно через `shop.claimFree` / `shop.claimAllFree`.

## Каталог предметов

**Источник правды:** `src/lib/shop/catalog.ts` → SQL: `drizzle/shop-catalog-upsert.sql` (вставить в Supabase SQL Editor).

Пошагово: [shop-catalog.md](./shop-catalog.md). Терминал не обязателен.

| ID | Слот equip | Asset (CDN) |
|----|------------|-------------|
| `banner-minti` | banner | `banners/minti.webp` |
| `effect-ladybugs` | profile_effect_id | `effects/ladybugs.webp` |
| `decoration-sparkle` | avatar_decoration_id | `decorations/sparkle.webp` |
| `feed-sakura` | feed_card_style_id | `feed-cards/sakura.webp` |
| `animated-minti` | animated_avatar_id | `animated/minti.apng` — круг аватара |
| `ring-glow-purple`, `style-neon-pink` | ring / nickname | CSS |
| `theme-violet` … `theme-gold` | app_theme_id | shell (`app-themes.ts`) |

## Экипировка

Equipped state хранится в `profile_customization`:

- `profile_effect_id`, `avatar_ring_id`, `banner_value`, `avatar_decoration_id`, `feed_card_style_id`, `animated_avatar_id`, `app_theme_id`, `nickname_color`, `nickname_gradient`.

tRPC:

- `customization.equip({ itemId })` — проверяет ownership в `user_inventory`, пишет нужное поле.
- `customization.clearSlot({ slot })` — снимает предмет со слота.
- `customization.update(...)` — точечное обновление с той же проверкой ownership.

Рендер профиля: `src/server/mappers/customization.ts` → `resolveCustomization()`.

App theme: в БД `app_theme_id`; на клиенте `AppThemeSync` читает equip и вызывает `applyEquippedAppTheme` (localStorage + CSS variables). Equip из каталога/инвентаря тоже вызывает тот же helper.

## Ассеты и CDN

Пути резолвятся через `src/lib/customization/asset-path.ts`:

- Dev без CDN: `/customization/...` из `public/customization/`.
- Prod: `NEXT_PUBLIC_ASSETS_CDN_URL` + `/customization/...` (например `https://cdn.voople.ru`).

Локальная папка `public/customization/` остаётся для разработки и добавления новых файлов до заливки в S3.

## Платежи (рубли) — задел

Таблица `payment_intents`:

| Поле | Назначение |
|------|------------|
| `kind` | `shop_item` \| `coin_pack` \| `donation` \| `subscription` |
| `amount_rub` | сумма в копейках/рублях (integer rub) |
| `status` | `pending` \| `succeeded` \| `canceled` \| `failed` |
| `provider` | `yookassa` |
| `external_id` | ID платежа YooKassa после создания |
| `metadata` | `{ itemId?, … }` |

tRPC `shop.createPaymentIntent` для `shop_item` принимает только `itemId` — сумма из БД. Для доната — `amountRub` с клиента.

Webhook: `POST /api/webhooks/yookassa` — при `payment.succeeded` проверяет платёж через API ЮKassa и вызывает `fulfillSucceededPaymentIntent` (инвентарь для `shop_item`, продление `subscriptions` для `subscription`).

Env:

```bash
YOO_KASSA_SHOP_ID=
YOO_KASSA_SECRET_KEY=
# или YOOKASSA_SHOP_ID / YOOKASSA_SECRET_KEY
NEXT_PUBLIC_APP_URL=https://your-domain  # return_url оплаты
```

В личном кабинете ЮKassa: HTTP-уведомления на `https://<домен>/api/webhooks/yookassa`, событие `payment.succeeded`.

## tRPC API

| Procedure | Auth | Описание |
|-----------|------|----------|
| `shop.overview` | protected | wallet + items + equipped + inventory |
| `shop.claimFree` | protected | бесплатное получение одного предмета |
| `shop.claimAllFree` | protected | все `is_free` предметы |
| `shop.purchaseWithCoins` | protected | покупка за voops |
| `shop.createPaymentIntent` | protected | intent + redirect checkout (shop/donation/subscription) |
| `shop.subscriptionStatus` | protected | активна ли Voople+ |
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
3. **`drizzle/shop-catalog-upsert.sql`** — upsert каталога (CDN + CSS-предметы).

Добавляет: колонки `shop_items`, equip-поля `profile_customization`, `user_wallets`, `wallet_transactions`, `payment_intents`, seed каталога Launch.

## Smoke test

1. Login → `/shop` — виден баланс voops.
2. «Забрать всё бесплатное» — предметы в инвентаре.
3. «Настройка» → equip banner/effect — профиль обновляется после refresh.
4. Донат 100 ₽ — создаётся `payment_intent` со status `pending` (без реальной оплаты пока).

См. также [customization.md](./customization.md), [database.md](./database.md), [deploy.md](./deploy.md).
