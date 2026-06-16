# Architecture

## Data layer

| Слой | Технология | Когда |
|------|------------|--------|
| Server hot path | **Supabase REST** (`getAdminClient()` + `src/server/data/*-rest.ts`) | профиль, лента, чат, лайки, подписки, статус, уведомления, поиск |
| Auth sync | **Supabase REST** (`users-rest.ts`) | `sync-user`, `user.me` |
| Client realtime | **Supabase Realtime** (anon + JWT, RLS) | входящие сообщения в чате, новые посты в ленте, счётчики просмотров/реакций |
| Drizzle + Postgres | `DATABASE_URL` pooler, `max: 1` singleton | миграции, редкие админ-задачи (`profile-update` и т.п.) |

**Не Drizzle** на горячем пути: Session pooler Supabase (~15 соединений) + много параллельных запросов Next.js dev → `EMAXCONNSESSION` и минутные таймауты.

Авторизация: `protectedProcedure` + проверки `ctx.user.id` в сервисах. RLS защищает прямой доступ из браузера; сервер пишет через Service Role.

## Rendering

| Route | Strategy |
|-------|----------|
| `/[username]` | ISR `revalidate = 60` + client islands (follow, likes, status) |
| `/feed` | Server-loaded first page + client infinite feed |
| `/messages` | CSR + Realtime + polling fallback |
| `/explore` | SSR + client search (debounced tRPC) |
| `/shop` | ISR `revalidate = 300` + client shop (tRPC, auth required) |

## Data fetching

- **Server Components** → `server/services/*` → `*-rest.ts` (REST)
- **Client** → tRPC (`useQuery`, `useInfiniteQuery`, `useMutation`)
- **Чат** → atomic direct-chat SQL function + optimistic send + `useRealtimeChat`; polling только degraded fallback
- **Лента** → server-loaded first page + `useRealtimeFeed` для INSERT в `posts`
- **Просмотры** → SQL functions для записи уникального просмотра + realtime UPDATE `posts.view_count`
- **Hashtags** → server-side parsing on post create/status publish + `hashtags`/`post_hashtags` hydration for feed/profile/search + `/hashtag/[tag]`
- **Холст профиля** → `profile_canvas_strokes` (REST + tRPC), Broadcast + postgres realtime; см. [profile-canvas.md](./profile-canvas.md)

## Customization Assets (CDN)

Catalog and profile assets resolve from:

- `src/lib/customization/asset-path.ts` — `/customization/{folder}/{id}.webp`
- `NEXT_PUBLIC_ASSETS_CDN_URL` — optional CDN prefix (prod: Selectel S3 + CDN, e.g. `https://cdn.voople.ru`)
- `public/customization/` — local dev fallback and staging area for new files before S3 upload

Upload path in bucket must mirror public paths: `customization/banners/minti.webp`, etc.

## Shop And Commerce

- Catalog metadata: `src/lib/shop/catalog.ts`; rows in `shop_items` (seed: `drizzle/12-shop-currency.sql`).
- Internal currency **voops**: `user_wallets`, `wallet_transactions`.
- Ownership: `user_inventory`; equip: `profile_customization` via `customization.equip`.
- Rub payments: `payment_intents` + `shop.createPaymentIntent`; YooKassa webhook at `/api/webhooks/yookassa` (fulfillment TBD).
- UI: `src/components/shop/ShopPage.tsx`, `CustomizationEditor.tsx`.

Details: [shop.md](./shop.md).

## Planned Media Attachments

Post media should use a trusted upload pipeline:

- client asks server for signed upload URL;
- file goes to object storage (Selectel S3 / S3-compatible) + CDN for public reads;
- server validates MIME, size and duration before attaching metadata to a post;
- posts read media metadata from DB, never from temporary client state.

Initial limits to keep UX predictable: images up to 10 MB, GIF up to 15 MB, video up to 100 MB/90s, audio up to 30 MB.

## App Themes

App-wide themes are client-applied CSS variables. Profile customization remains profile-scoped and can override card/post-chip accents locally.

Theme catalog lives in `src/lib/app-themes.ts`; raster backgrounds resolve from `/customization/themes/` via `src/lib/app-theme-assets.ts` and `customizationAssetPath()`.

Paid app themes (`rose`, `gold`) разблокируются через `shop_items` + `user_inventory` и экипируются в `/shop` → `app_theme_id`. `AppThemeSelector` в профиле пока использует localStorage для быстрого preview; server equip — source of truth для owned themes.

Post detail lives at `/post/[postId]` with server-loaded post payload and always-open comments.

## Planned Admin Observability

Production admin should be a role-protected route, not a public dashboard. First metrics:

- realtime online users / active sessions;
- posts/comments/reposts per time window;
- auth/signup activity;
- slow API/error counters;
- moderation queue and audit log.

## tRPC

- Endpoint: `/api/trpc`
- Rate limits: Upstash (если `UPSTASH_*` в env), иначе пропуск (fail-open). Покрытие — см. [security.md](./security.md).
- Лента: cursor pagination, `getNextPageParam: nextCursor`

## Anonymous Questions

Q&A в духе ngl/curiouscat: посетитель (только залогиненный) задаёт анонимный вопрос профилю, владелец отвечает публично.

- Роутер `questions` (`ask` / `listAnswered` / `listInbox` / `inboxCount` / `answer` / `hide`), данные — `questions-rest.ts`, таблица `profile_questions`.
- Анонимность на сервере: `asker_id` хранится, но не отдаётся; уведомление `question` скрывает актора (как `profile_canvas_draw`).
- UI — вкладка «Вопросы» в `ProfilePage` (`ProfileQuestions.tsx`): форма вопроса, инбокс владельца, лента ответов.

## Realtime (чат)

Обязательно в Supabase SQL Editor (после `02-rls-policies.sql`):

```sql
-- drizzle/03-realtime-messages.sql
```

Без этого INSERT в `messages` не транслируется в браузер — собеседник видит сообщения только после F5.

Клиент: `createBrowserClient` + сессия Supabase Auth. Подписка: `postgres_changes` на `messages` с фильтром `chat_id=eq.<uuid>`.

`SUBSCRIBED` означает подключение WebSocket-канала, но не гарантирует доставку INSERT-событий. Доставка зависит от publication, `REPLICA IDENTITY FULL`, JWT и RLS `messages_select_member`.

Direct chat создаётся через SQL-функцию `public.get_or_create_direct_chat`, которая пишет `chats`, `direct_chat_pairs` и `chat_members` атомарно. Browser client не создаёт memberships напрямую.

## Realtime (лента)

`posts` добавляется в publication через `drizzle/05-realtime-feed.sql`.

Клиент: `useRealtimeFeed(tab, viewerId)` подписывается на INSERT в `posts` и инвалидирует текущую feed query. Для `following` фильтрация остаётся на сервере, потому что правила подписок и приватность не должны дублироваться в браузере.

UPDATE `posts` используется для реактивного роста `view_count`, `like_count`, `reply_count` на уже видимых карточках.

## Сеть

`fetch-retry` на Supabase-клиентах (admin + browser) снижает обрывы `ECONNRESET` на Windows.

Для Supabase REST используется `cache: "no-store"` и bounded timeout. Это важно в Next dev/proxy: иначе Next может пытаться записать нестабильный REST-ответ в fetch cache и держать запрос десятки секунд.
