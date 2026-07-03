# Setup

## Требования

- Node.js 20+
- npm
- Supabase project

## Переменные окружения

Скопируйте `.env.example` → `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Publishable key — браузер + Realtime>
SUPABASE_SERVICE_ROLE_KEY=<Secret key — только server, никогда в client>

# Для drizzle-kit migrate (не для профиля/ленты/чата в runtime)
DATABASE_URL=<Transaction pooler :6543 ?pgbouncer=true>
DIRECT_URL=<Session pooler :5432 или direct>

NEXT_PUBLIC_APP_URL=http://localhost:3000

# Assets (optional — без CDN файлы из public/customization/)
NEXT_PUBLIC_ASSETS_CDN_URL=
S3_ENDPOINT=
S3_BUCKET_PUBLIC=
S3_BUCKET_PRIVATE=
S3_REGION=ru-3
# vHosted бакет (Selectel): false — presigned PUT из браузера + CORS. Path-style: true.
S3_FORCE_PATH_STYLE=false
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
```

Upstash, TMDB, YooKassa — опционально до соответствующих фич.

**Админка каталога:** `VOOPLE_ADMIN_USER_IDS=<uuid>` — доступ к `/admin/assets`. См. [admin.md](./admin.md).

**Загрузка медиа (посты, комментарии, аватар):** нужны `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT`, `S3_BUCKET_PUBLIC`, `NEXT_PUBLIC_ASSETS_CDN_URL`. Без них presigned upload вернёт ошибку «Загрузка файлов не настроена».

**Чат (фото/аудио во вложениях):** дополнительно `S3_BUCKET_PRIVATE=voople-uploads` и CORS на бакете. Подробно: [chat-uploads.md](./chat-uploads.md).

## Миграции (один раз)

```bash
npm install
npm run db:generate   # при изменении schema.ts
npm run db:migrate    # или SQL Editor ниже
```

**Supabase SQL Editor** (по порядку):

1. При `type already exists` → `drizzle/00-reset-partial-migration.sql`
2. `drizzle/apply-in-supabase-dashboard.sql`
3. `drizzle/02-rls-policies.sql`
4. **`drizzle/03-realtime-messages.sql`** — live-чат; без шага 4 сообщения у собеседника только после F5
5. **`drizzle/04-chat-realtime-hardening.sql`** — уникальные direct-чаты, hardening RLS, проверяемый Realtime
6. **`drizzle/05-realtime-feed.sql`** — live-лента; новые посты появляются без refresh
7. **`drizzle/06-views-and-reactions.sql`** — просмотры постов/профиля, realtime реакций
8. **`drizzle/07-comments-reposts.sql`** — comments и базовые repost counters
9. **`drizzle/08-quote-reposts.sql`** — quote reposts и direct repost counters
10. **`drizzle/09-hashtags-search.sql`** — hashtags и search indexes
11. **`drizzle/10-notifications-realtime.sql`** — live notifications
12. **`drizzle/11-post-search.sql`** — trigram post search
13. **`drizzle/12-shop-currency-enums.sql`** — enum values (**отдельный Run**)
14. **`drizzle/12-shop-currency.sql`** — shop, voops, payment intents
15. **`drizzle/13-upload-media.sql`** — media в постах и комментариях
16. **`drizzle/18-chat-messages-reply.sql`** — ответы на сообщения в чате

## Проверка магазина

1. Login → `/shop`.
2. «Забрать всё бесплатное» — предметы в инвентаре.
3. «Настройка» → equip → refresh профиля.

См. [shop.md](./shop.md).

## Запуск

```bash
npm run dev
```

## Проверка чата

1. Два аккаунта, открыть один диалог.
2. Отправить сообщение — у отправителя сразу (optimistic), у получателя **без F5** в течение ~1 с.
3. Если только после F5 — проверьте, что выполнены шаги 4 и 5 миграций.
4. В Supabase SQL Editor проверьте publication:

```sql
SELECT *
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'messages';
```

## Проверка live-ленты

1. Открыть `/feed` в одном окне.
2. Создать пост во втором окне или аккаунте.
3. Первый экран должен обновить список без F5.
4. Проверка publication:

```sql
SELECT *
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'posts';
```

## Производительность

- Профиль, лента, чат API — **Supabase REST** (Service Role на сервере), не Session pooler Drizzle.
- `/feed` отдаёт первую страницу с сервера и продолжает infinite scroll на клиенте.
- Supabase REST-запросы идут с `cache: "no-store"` и bounded timeout, чтобы Next dev не пытался кэшировать нестабильные REST-ответы.
- Медленные ответы + `ECONNRESET` в терминале — проверьте сеть и регион Supabase; клиенты Supabase используют bounded retry.
- `DATABASE_URL` на **:6543** для Drizzle; **:5432** Session — лимит ~15 соединений, не для параллельного dev.

См. [architecture.md](./architecture.md), [security.md](./security.md).
