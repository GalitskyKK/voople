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
- YooKassa webhook: `POST /api/webhooks/yookassa`; платёж перепроверяется через API ЮKassa по `payment.id`; fulfillment (inventory, Voople+) — только server path.

См. [shop.md](./shop.md).

## Политики

Файлы:

- [`drizzle/02-rls-policies.sql`](../drizzle/02-rls-policies.sql)
- [`drizzle/04-chat-realtime-hardening.sql`](../drizzle/04-chat-realtime-hardening.sql)

Не использовать `01-rls-users-dev.sql`.

## Rate limiting

`assertRateLimit` (tRPC) / `checkRateLimit` (route handlers) поверх Upstash, ключ — `userId` (или IP для вебхуков). **Fail-open**: если Upstash env не задан или Redis недоступен — запрос пропускается (доступность важнее). Покрыты: `post.create/comment/repost/quoteRepost`, `post.like`, `chat.send`, `profile.toggleFollow`, `profileCanvas.saveStroke`, `shop.applyPromo` (анти-перебор промокодов), `questions.ask`, `upload.createPresigned`, webhook YooKassa (по IP). Лимиты — `src/lib/ratelimit.ts`.

## Загрузка файлов

- Public-бакет (post/avatar/banner/track): presigned PUT не ограничивает размер на стороне S3, поэтому после загрузки сервер проверяет реальный размер через `HeadObject` (`resolvePublicMediaKey`) против `UPLOAD_LIMITS`.
- Chat-бакет (private): `POST /api/upload/chat` сверяет **магические байты** содержимого с заявленным Content-Type (`sniffUploadKind`) — нельзя залить HTML/скрипт под видом `image/png`.
- Ключи привязаны к `uploads/{purpose}/{userId}/` и проверяются на ownership/traversal (`assertOwnedUploadKey`).

## Анонимные вопросы

- `profile_questions`: `asker_id` хранится (анти-абьюз/модерация), но **никогда** не отдаётся владельцу — анонимность на сервере (`questions-rest.ts`), как у `profile_canvas_draw`. Уведомление типа `question` скрывает актора (`ANONYMOUS_NOTIF_TYPES`).
- RLS включён без permissive-политик: доступ только через service-role на сервере, прямого клиентского доступа (PostgREST/Realtime) к таблице нет.
- Спрашивать могут только залогиненные; rate-limit `questions.ask`; запрет вопроса самому себе.

## Auth → users

`POST /api/auth/sync-user` → `users-rest.ts` (REST), `id = auth.users.id`.
