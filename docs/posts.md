# Posts: menu, edit, reports

## Post menu (⋯)

`PostMoreMenu` in `PostAuthorRow` — доступен на каждой карточке поста с `postId`.

| Действие | Кто видит | Поведение |
|----------|-----------|-----------|
| Скопировать ссылку | Все | `{origin}/post/{postId}` в буфер |
| Редактировать | Автор | Только если есть текст / комментарий к репосту |
| Пожаловаться | Вошедший, не автор | Одна жалоба на пост с пары reporter + post |

## Редактирование

- Окно: **24 часа** с `created_at` (`POST_EDIT_WINDOW_MS` в `src/lib/posts/edit-window.ts`).
- tRPC: `post.update` → `updatePostTextRest`.
- Можно менять: `text` обычного поста или `repost_comment` у репоста с комментарием.
- Нельзя: посты `kind: status` (снимок состояния), plain repost без текста, чужие посты.
- UI: `PostEditSheet` + `PostComposer` (макс. 280 символов).

После сохранения инвалидируются `feed.getPage`, `post.getById`, при необходимости `profile.getPostsByUsername`.

## Жалобы

- tRPC: `post.report` → таблица `post_reports`.
- UI: пункт в меню ⋯, toast «Жалоба отправлена».

**Куда:** только БД (`post_reports`), без админки и без автоматических санкций.

**Последствия сейчас:** пост остаётся видимым; автор не получает уведомление; повторная жалоба с того же аккаунта блокируется.

Подробно: [moderation.md](./moderation.md).

## Миграция

В Supabase SQL Editor после предыдущих файлов:

```text
drizzle/16-post-edit-reports.sql
```

См. [database.md](./database.md).
