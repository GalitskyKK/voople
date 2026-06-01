# Voople Roadmap

Этот файл описывает продуктовые и архитектурные решения Voople. Обязательные правила качества кода находятся в `.cursor/rules/voople-engineering.mdc`.

## Стек

- Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS.
- tRPC v11, React Query, Zod, React Hook Form.
- Supabase PostgreSQL, Supabase Auth, Supabase Realtime.
- Drizzle ORM для схемы и миграций.
- Supabase REST через service role на серверном hot path.
- Zustand только для устойчивого глобального UI/state: auth, player, ui.
- Upstash Redis, Selectel S3/CDN, TMDB, YooKassa подключаются когда фича реализована (CDN и shop baseline — да).

## Source Of Truth

- `docs/architecture.md` описывает runtime-архитектуру.
- `docs/database.md` описывает схему, миграции и порядок применения SQL.
- `docs/security.md` описывает RLS, service role и границы доверия.
- `src/server/db/schema.ts` является source of truth для Drizzle schema.
- `src/server/data/*-rest.ts` является source of truth для Supabase REST hot path.

## Архитектура Данных

- Server Components и tRPC routers вызывают `src/server/services/*`.
- Services делегируют IO в `src/server/data/*-rest.ts`.
- Client Components используют tRPC hooks для server-state.
- Browser Supabase client используется только для Auth session и Realtime.
- Drizzle не используется на горячем пути feed/profile/chat, пока Supabase pooler ограничивает dev-подключения.
- Service role обходит RLS, поэтому все проверки доступа должны быть в server code или SQL-функциях.

## Роуты

- `/feed`: Server Component загружает первую страницу, client island продолжает infinite scroll.
- `/feed` подписан на INSERT в `posts` через Supabase Realtime; новые посты появляются без F5.
- `/[username]`: профиль как страница, не модалка; сервер отдаёт первый payload, client islands отвечают за follow, like, status editing.
- `/messages`: приватный UI, realtime через Supabase Realtime; polling только как явная деградация.
- `/notifications`: приватный UI, tRPC + серверная авторизация.
- `/shop`: client shop + tRPC; покупки/inventory только server path; ₽ через `payment_intents` + webhook.

## Приоритет Разработки

1. Core stability: auth sync, profile, feed, direct messages, RLS, realtime.
2. Performance: first paint без client-side waterfall, server prefetch, virtualized feed, минимальные client islands.
3. Product loops: posts, likes, follows, notifications, status history.
4. Social graph depth: comments, replies, reposts, quote reposts, hashtags/search.
5. Customization: profile card, avatar, banners, effects, inventory, **shop + voops (Launch season free)**.
6. Commerce and media: YooKassa checkout fulfillment, S3 upload pipeline, post media attachments, audio player.
7. Admin observability: realtime online/users/posts/moderation metrics after production auth/RLS is stable.

## Realtime Chat

- `drizzle/03-realtime-messages.sql` уже должен быть применён в Supabase.
- `messages` должна быть в publication `supabase_realtime`.
- Доставка событий зависит от RLS: пользователь получает только сообщения чатов, где он member.
- `SUBSCRIBED` означает только подключение канала, а не успешную доставку INSERT-событий.
- UI обязан корректно обрабатывать гонки optimistic/onSuccess/realtime без дублей и потери сообщений.

## Realtime Feed

- `drizzle/05-realtime-feed.sql` должен быть применён в Supabase.
- `posts` должна быть в publication `supabase_realtime`.
- Клиент не дублирует серверные правила `following`; INSERT-событие только триггерит refetch текущей feed query.

## БД И Безопасность

- Direct chat должен иметь уникальный инвариант пары пользователей на уровне БД.
- Membership в чатах не создаётся напрямую из browser client.
- Inventory не создаётся напрямую из browser client; только server purchase/webhook path.
- Счётчики и мутации, подверженные гонкам, должны быть атомарными или транзакционными.
- RLS защищает browser/Realtime путь; service role путь защищается кодом и SQL-инвариантами.
- Просмотры постов и профиля пишутся только через SQL functions, не прямыми client inserts.
- Бейджи не хардкодятся в UI: system/earned через `user_badges`, purchased/equipped через inventory.

## Comments And Reposts

- Детальный план: `docs/comments-reposts.md`.
- Комментарии первой версии — один уровень, без nested threads.
- Репосты используют `posts.is_repost`, `posts.original_post_id`, `posts.repost_comment`.
- Plain repost toggles exact target post; quote repost creates a new post.
- Repost of repost ссылается на immediate target post, чтобы счётчики были локальными и понятными.

## Search And Hashtags

- `drizzle/09-hashtags-search.sql` должен быть применён после repost migrations.
- Посты парсят `#hashtags` на сервере, browser не является source of truth.
- Explore ищет users + hashtags + posts; trending hashtags — top `post_count`.
- `/hashtag/[tag]` показывает server-prefetched ленту постов по тегу; теги в карточках должны быть кликабельными.

## Future Media And Admin

- Media attachments должны идти через trusted upload flow: signed upload URL, Selectel S3 (+ CDN for public reads), validation MIME/size/duration, затем запись metadata в БД.
- Для post media нужны отдельные таблицы/metadata, не URL-строки в UI state.
- Production admin должна быть отдельной protected area с role-based access, realtime online metrics и audit-friendly moderation actions.

## Shop And Voops

- `drizzle/12-shop-currency-enums.sql` + `drizzle/12-shop-currency.sql` должны быть применены в Supabase (enums — отдельным Run).
- Каталог: `src/lib/shop/catalog.ts` + seed `shop_items`.
- Voops: `user_wallets`, `wallet_transactions`; welcome bonus на первый заход.
- Free season: `is_free = true` → `shop.claimFree` / `claimAllFree`.
- Equip: `customization.equip` + ownership check; state в `profile_customization`.
- ₽: `payment_intents` + `shop.createPaymentIntent`; webhook `/api/webhooks/yookassa` — fulfillment TBD.
- Assets: `NEXT_PUBLIC_ASSETS_CDN_URL` + `public/customization/` fallback.
- Документация: `docs/shop.md`.

## App Themes And Motion

- App-wide themes управляют global CSS variables и не должны ломать profile-scoped customization.
- Paid app themes разблокируются через shop/inventory и equip (`app_theme_id`); localStorage в `AppThemeSelector` — UX preview, не ownership.
- Social action animations должны быть CSS-only, короткими, без layout shift и с `prefers-reduced-motion`.

## UI Терминология

- В коде и UI используются `post`, `like`, `repost`, `user_status`.
- Блок статуса на профиле отображается без заголовка `СЕЙЧАС`, если это не требуется конкретным экраном.
- Профиль всегда открывается как `/[username]`; popup в feed может быть только preview, не основной профиль.
