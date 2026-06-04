# Вложения в чате (`voople-uploads`)

Чат использует **приватный** S3-совместимый бакет. Публичный CDN (`voople-assets`) для вложений чата не нужен — файлы отдаются через presigned GET на сервере.

## Можно ли те же ключи, что у `voople-assets`?

Да, если у **одной пары** `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` в Selectel есть права **и на `voople-assets`, и на `voople-uploads`** (чтение/запись объектов, ListBucket при необходимости). Отдельные ключи не обязательны — важны права на бакет, а не имя переменной.

Рекомендация: один сервисный пользователь S3 с доступом к обоим бакетам; в `.env.local` те же `S3_ACCESS_KEY_ID` и `S3_SECRET_ACCESS_KEY`, различаются только имена бакетов.

## CORS и POST — не путать

Загрузка в чат идёт на **`POST /api/upload/chat`** (тот же origin, что `localhost:3000`). **CORS на бакете для чата не нужен** — браузер не ходит в S3 напрямую. Добавление `POST` в CORS бакета на эту ошибку не влияет.

Если в UI «Access Denied» при статусе **500** на `/api/upload/chat` — это ответ **S3 на сервере** (права ключей / политика бакета), не CORS.

Проверка с машины разработки:

```bash
node scripts/s3-check-chat.mjs
```

Должно быть `HeadBucket OK` и `PutObject OK`. Если скрипт OK, а чат падает — перезапустите `npm run dev` после обновления кода.

## Импорт политики из `voople-assets` — безопасно ли?

**Не копируйте политику assets «как есть»**, если там есть **публичное чтение** (`Principal: "*"`, `s3:GetObject` для всех). На `voople-uploads` это сделает **вложения чата доступными по прямой ссылке** — утечка приватных фото/аудио.

Безопасная схема:

| Бакет | Доступ |
|-------|--------|
| `voople-assets` | Публичный CDN, только нужные префиксы |
| `voople-uploads` | **Приватный**, без anonymous GetObject; чтение только через presigned GET на сервере |

Права для **пары ключей в `.env`** (сервисный пользователь Selectel):

- `s3:PutObject`, `s3:GetObject` на `voople-uploads/uploads/chat/*` (и при необходимости `uploads/*`)
- те же ключи обычно уже имеют доступ к `voople-assets` для постов

Политика бакета `voople-uploads` может быть **пустой / deny-by-default** — достаточно прав на **IAM-пользователе ключей**. Импорт JSON с assets имеет смысл только после замены в `Resource` имени бакета на `voople-uploads` и **удаления** публичных `Principal: "*"`.

## Бакет в панели Selectel

1. Создать бакет **`voople-uploads`** (приватный, без публичного чтения).
2. **CORS** — для текущей версии приложения **не обязателен**: загрузка идёт через `POST /api/upload/chat` (файл на сервер → S3). CORS нужен только если снова включите прямой PUT из браузера.

   Если используете presigned PUT вручную, настройте CORS:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://voople.ru", "https://www.voople.ru"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

3. Для prod добавьте свой домен в `AllowedOrigins` и в `NEXT_PUBLIC_APP_URL`.

## Переменные окружения

```bash
S3_ENDPOINT=https://s3.ru-3.storage.selcloud.ru
S3_REGION=ru-3
S3_ACCESS_KEY_ID=<ключ с доступом к обоим бакетам>
S3_SECRET_ACCESS_KEY=<секрет>

S3_BUCKET_PUBLIC=voople-assets
S3_BUCKET_PRIVATE=voople-uploads
NEXT_PUBLIC_ASSETS_CDN_URL=https://cdn.voople.ru
```

Без `S3_*` отправка вложений вернёт «Загрузка файлов не настроена».

**Selectel:** для SDK на сервере включён `forcePathStyle` (path-style URL). При 403 на presigned PUT это типичная причина; чат обходит это через серверный upload.

Опционально: `S3_FORCE_PATH_STYLE=true|false` — принудительно path-style для presigned (посты/аватар).

## Пути объектов

Ключи вида: `uploads/chat/<userId>/<uuid>.<ext>` — только владелец может отправить такой ключ в сообщение (проверка на сервере).

## Типы вложений (v1)

| Тип | Загрузка | Отображение |
|-----|----------|-------------|
| Фото | `purpose: chat`, image/* | presigned URL в ленте |
| Аудио | `purpose: chat`, audio/* | плеер в пузыре |
| Трек из плейлиста | `sharedTrackId` (свой трек) | карточка + «В плейлист» у получателя |

Музыка из чужого сообщения: `playlist.addFromChat` копирует запись в ваш плейлист (тот же `file_url`).

## Проверка

1. Два аккаунта, один диалог.
2. Скрепка → фото → отправить; у собеседника превью без F5 (Realtime + refetch).
3. Аудио / трек из «Мои треки» — по отдельности.
4. Ответ на сообщение (свайп/кнопка «Ответить») — цитата в пузыре.
5. Прочитано: двойная галочка у исходящих после открытия чата собеседником.

## Миграция БД

Если ещё не применяли: `drizzle/18-chat-messages-reply.sql` (поле `reply_to_message_id`, `read_at` уже в схеме).
