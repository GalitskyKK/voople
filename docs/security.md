# Безопасность данных

## Два пути к Postgres

| Путь | Кто | RLS |
|------|-----|-----|
| **Service Role REST** (`getAdminClient()`) | tRPC, RSC, `*-rest.ts` | Обходит RLS — **авторизация в коде** |
| **Supabase Client** (`anon` + JWT, Realtime) | Браузер | **Применяется** |
| **Drizzle** (`DATABASE_URL`) | миграции, редкие сервисы | Не hot path |

PostgREST (`/rest/v1/`) доступен с `anon` key — RLS обязателен (`drizzle/02-rls-policies.sql`).

## Сервер

1. Сессия в tRPC: `createClient().auth.getUser()`.
2. Мутации сверяют `ctx.user.id` с владельцем ресурса.
3. `SUPABASE_SERVICE_ROLE_KEY` — только на сервере, не в client bundle.
4. Пароли БД и service role не в репозитории.

## Чаты

- API (list, send, openDirect) — **REST** (`chat-rest.ts`) + проверка членства.
- `openDirect` использует `public.get_or_create_direct_chat`, чтобы direct-chat pair была уникальной на уровне БД.
- Live UI — **Supabase Realtime** на `messages` (нужен `03-realtime-messages.sql`).
- Fallback: polling 2.5 s только при degraded Realtime state. `SUBSCRIBED` не считается доказательством доставки событий.
- Browser client не может вставлять строки в `chat_members`.

## Shop / inventory / payments

- Browser client может читать только свой `user_inventory`, `user_wallets`, `wallet_transactions`, `payment_intents`.
- Вставка inventory, wallet mutations и payment fulfillment напрямую из браузера запрещена; только server tRPC / webhook path.
- `customization.equip` проверяет ownership перед записью в `profile_customization`.
- Уникальность `(user_id, item_id)` enforced в БД.
- YooKassa webhook требует `YOOKASSA_WEBHOOK_SECRET`; fulfillment inventory/wallet — server-only после verify signature.

См. [shop.md](./shop.md).

## Политики

Файлы:

- [`drizzle/02-rls-policies.sql`](../drizzle/02-rls-policies.sql)
- [`drizzle/04-chat-realtime-hardening.sql`](../drizzle/04-chat-realtime-hardening.sql)

Не использовать `01-rls-users-dev.sql`.

## Auth → users

`POST /api/auth/sync-user` → `users-rest.ts` (REST), `id = auth.users.id`.
