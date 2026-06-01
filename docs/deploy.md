# Production Deploy

Рекомендуемый путь для текущего стека: private GitHub repo → Vercel → Supabase managed project. Это самый простой вариант для Next.js App Router, Vercel Edge/Node routes и preview deployments.

## Где Хостить

| Часть | Рекомендация |
|---|---|
| Next.js app | Vercel |
| PostgreSQL/Auth/Realtime | Supabase |
| Redis/rate limit | Upstash |
| Media/customization assets | Selectel S3 + CDN (`cdn.voople.ru`) |
| Payments | YooKassa webhooks на Vercel route |

## GitHub → Vercel

1. Создать private GitHub repository.
2. Push ветку `main`.
3. В Vercel: Import Project → выбрать repo.
4. Framework preset: Next.js.
5. Build command: `npm run build`.
6. Output: Vercel default.
7. Node.js version: 20+.

## Environment Variables

В Vercel добавить отдельно для Production и Preview:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

DATABASE_URL=
DIRECT_URL=

NEXT_PUBLIC_APP_URL=https://<prod-domain>

# Customization CDN (public bucket + CDN domain)
NEXT_PUBLIC_ASSETS_CDN_URL=https://cdn.voople.ru
S3_ENDPOINT=https://s3.ru-3.storage.selcloud.ru
S3_BUCKET_PUBLIC=voople-assets
S3_REGION=ru-3
# Server upload keys — when upload flow is implemented
# S3_ACCESS_KEY_ID=
# S3_SECRET_ACCESS_KEY=

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

TMDB_API_KEY=

YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=
YOOKASSA_WEBHOOK_SECRET=
```

Legacy R2 env names in older notes are deprecated; use S3-compatible Selectel vars above.

Не добавлять `.env.local` в GitHub.

## Selectel CDN Checklist

1. Public bucket with `customization/` prefix uploaded.
2. CDN origin = bucket `*.selstorage.ru` domain (from S3 → Domains tab).
3. CDN Hostname header = same origin domain.
4. Personal domain `cdn.voople.ru` + Let's Encrypt on CDN resource.
5. Smoke: `https://cdn.voople.ru/customization/banners/minti.webp` returns 200.

## Supabase Production Checklist

1. Создать отдельный Supabase project для production.
2. Применить SQL по порядку из `docs/setup.md`.
3. Проверить Realtime publication:

```sql
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('messages', 'posts');
```

4. В Auth settings добавить production domain и Vercel preview domains при необходимости.
5. Проверить RLS включён на public tables.
6. Service role key хранить только в Vercel env.

## Database Migrations

Пока проект ранний и часть SQL применяется вручную, production-safe процесс такой:

1. На staging/preview Supabase применить новую SQL migration.
2. Проверить `npm run build`.
3. Проверить smoke сценарии: login/register, feed, profile, chat, realtime, **shop claim + equip**.
4. Применить SQL на production Supabase.
5. Деплоить Vercel production.

Не запускать reset-скрипты на production.

## Runtime Notes

- Supabase REST в app использует `cache: "no-store"` и bounded timeout.
- Realtime требует валидную browser auth session и RLS policies.
- `/feed` и `/[username]` являются dynamic из-за auth/cookies; это нормально для текущего этапа.
- Для ускорения production позже можно добавить edge cache/Redis для публичных profile/feed segments, но только после измерений.

## Smoke Test После Деплоя

- Register/login создаёт `public.users`, `profile_customization`, `user_status`.
- `/feed` открывается и показывает first page.
- Новый пост появляется в другом открытом `/feed` без F5.
- Direct message виден у отправителя optimistic и у получателя без F5.
- RLS: пользователь не видит чужие private chat messages через browser client.
- `/shop`: claim free item, equip, profile reflects customization after refresh.
- `npm run build` проходит локально перед merge в main.
