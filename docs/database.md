# Database

## Schema

Drizzle: `src/server/db/schema.ts`

## Доступ из приложения (runtime)

**Основной путь — REST**, не Drizzle:

```ts
import { getAdminClient } from "@/lib/supabase/admin";

const { data, error } = await getAdminClient()
  .from("users")
  .select("id, username, display_name")
  .eq("username", username)
  .maybeSingle();
```

Обёртки: `src/server/data/*-rest.ts` → `src/server/services/*.ts` → tRPC / RSC.

Drizzle (`requireDb()`) — миграции и редкие обновления, не профиль/лента/чат.

## Migrations

```bash
npm run db:generate
npm run db:migrate
```

В Supabase SQL Editor (по порядку):

1. `drizzle/apply-in-supabase-dashboard.sql` (или `00-reset` + apply при повторном запуске)
2. `drizzle/02-rls-policies.sql`
3. **`drizzle/03-realtime-messages.sql`** — без этого чат не live
4. **`drizzle/04-chat-realtime-hardening.sql`** — уникальные direct-чаты, RLS hardening, realtime checks
5. **`drizzle/05-realtime-feed.sql`** — live-лента на INSERT в `posts`
6. **`drizzle/06-views-and-reactions.sql`** — просмотры постов/профиля и realtime реакций
7. **`drizzle/07-comments-reposts.sql`** — comments, базовые repost counters
8. **`drizzle/08-quote-reposts.sql`** — quote reposts и direct repost counters
9. **`drizzle/09-hashtags-search.sql`** — hashtags, связи post_hashtags и search indexes
10. **`drizzle/10-notifications-realtime.sql`** — live-обновление inbox на INSERT/UPDATE в `notifications`
11. **`drizzle/11-post-search.sql`** — trigram indexes для ILIKE-поиска по `posts.text` и `posts.repost_comment`

## Auth → users

После login/register: `POST /api/auth/sync-user` → `users-rest.ts` (REST).

См. [security.md](./security.md).

## Connection strings

| Переменная | Назначение |
|------------|------------|
| `DATABASE_URL` | Transaction pooler **:6543** + `?pgbouncer=true` для Drizzle в dev |
| `DIRECT_URL` | Session pooler :5432 для `drizzle-kit migrate` |

Hot path приложения **не зависит** от `DATABASE_URL`, если REST-ключи заданы.

## Chat invariants

- `direct_chat_pairs` хранит единственную пару пользователей для direct-чата.
- `public.get_or_create_direct_chat(currentUser, otherUser)` создаёт direct chat атомарно и возвращает существующий `chat_id` при гонке.
- `messages_chat_time_idx` ускоряет чтение сообщений конкретного чата по времени.
- `chat_members` не имеет browser INSERT policy; membership создаётся только серверным trusted path.

10. **`drizzle/10-notifications-realtime.sql`** — live-обновление inbox на INSERT/UPDATE в `notifications`
11. **`drizzle/11-post-search.sql`** — trigram indexes для ILIKE-поиска по `posts.text` и `posts.repost_comment`
12. **`drizzle/12-shop-currency-enums.sql`** — новые значения enum (запустить **отдельно**, один Run)
13. **`drizzle/12-shop-currency.sql`** — voops, payment intents, equip columns, seed `shop_items`
14. **`drizzle/14-profile-canvas.sql`** — штрихи холста `profile_canvas_strokes`, RLS, realtime (см. [profile-canvas.md](./profile-canvas.md))
15. **`drizzle/15-profile-canvas-notification.sql`** — enum `profile_canvas_draw` для уведомлений
16. **`drizzle/16-post-edit-reports.sql`** — `post_reports`, редактирование постов в app (см. [posts.md](./posts.md))
17. **`drizzle/17-promo-codes.sql`** — `promo_codes`, `promo_redemptions` (см. [promo-codes.md](./promo-codes.md))

## Profile canvas

- `profile_canvas_strokes` — векторные штрихи (`points` jsonb, координаты 0–1).
- Запись/удаление — service role (`profile-canvas-rest.ts`); браузер только SELECT (RLS).
- Очистка всего холста — только `profile_user_id === actor_id`.

## Shop and wallets

- `shop_items` — каталог; поля `price_coins`, `price_rub`, `is_free`, `equip_slot`, `asset_folder`, `asset_id`.
- `user_inventory(user_id, item_id)` — владение; `acquired_via` включает `free_claim`, `purchase`, `earned`, …
- `user_wallets(user_id, balance_coins)` — баланс voops; создаётся server path при первом заходе в магазин.
- `wallet_transactions` — история начислений/списаний (server-only writes).
- `payment_intents` — задел под YooKassa (`shop_item`, `coin_pack`, `donation`); fulfillment через webhook.
- Equipped state: `profile_customization` — `avatar_decoration_id`, `feed_card_style_id`, `animated_avatar_id`, `app_theme_id`, …

См. [shop.md](./shop.md).

## Inventory invariants

- `user_inventory(user_id, item_id)` уникален.
- Browser client не может вставлять inventory напрямую; покупки должны проходить через server purchase/webhook path.

## Views

- `posts.view_count` хранит публичный счётчик просмотров поста.
- `post_views(post_id, viewer_user_id)` хранит уникальный просмотр пользователя.
- `public.record_post_view(postId, viewerId)` атомарно создаёт просмотр и увеличивает `posts.view_count`.
- `profile_views(profile_user_id, viewer_user_id)` хранит уникальный просмотр профиля.
- `public.record_profile_view(profileUserId, viewerId)` пишет профильный просмотр и возвращает текущий count.

## Profile reactions and badges

- `card_reactions` — быстрые реакции на карточке профиля, не inventory.
- `user_badges` — earned/system badges.
- `shop_items.type = 'badge'` + `user_inventory` — purchased/customization badges.
- Отображаемые бейджи профиля должны собираться из earned badges + equipped inventory badges. Хардкод бейджей в UI запрещён.

## Hashtags

- `hashtags.name` — нормализованный lowercase тег без `#`.
- `post_hashtags(post_id, hashtag_name)` связывает посты и теги.
- `public.set_post_hashtags(postId, tags)` обновляет связи и пересчитывает `hashtags.post_count`.
- Поиск по `#tag` идёт через `hashtags`, отображение в карточках — через hydrated `PostViewModel.tags`.
- `/hashtag/[tag]` читает посты через `post_hashtags`, затем гидратит обычные `PostViewModel` с авторами, лайками, тегами и nested repost previews.
- Trending: `search.trendingHashtags` сортирует по `hashtags.post_count`.

## Search

- Explore: `search.explore` — users, hashtags, posts (posts от 2 символов).
- Post search: ILIKE по `posts.text` и `posts.repost_comment`, hydrate через `mapPostRowsWithReposts`.
- `drizzle/11-post-search.sql` — `pg_trgm` indexes для ILIKE.

## Notifications

- `notifications.type` использует enum `notif_type`; для social loop сейчас активны `like`, `follow`, `reply`, `repost`.
- `reference_id` для post events (`like`, `reply`, `repost`) указывает на `posts.id`.
- Создание уведомлений — только server path (`createNotification` из data layer); browser insert запрещён RLS.
- `drizzle/10-notifications-realtime.sql` публикует `notifications` в Supabase Realtime для live inbox/badge.
