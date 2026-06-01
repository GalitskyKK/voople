# Интерактивный холст профиля

Обратная сторона `ProfileFlipCard`: совместное рисование с сохранением в PostgreSQL.

## UX

| Режим | Когда | Что видит пользователь |
|--------|--------|-------------------------|
| Preview | Карточка не перевёрнута | Статичный `<canvas>` без pointer-событий (как превью-картинка в DevTools) |
| Editor | После переворота | Интерактивный холст, тулбар, индикатор сохранения |

Переворот — кнопка в правом верхнем углу карточки (`FlipCard`).

## Где хранятся данные

**Таблица** `profile_canvas_strokes` (не растровое изображение).

| Колонка | Описание |
|---------|----------|
| `id` | UUID штриха (генерируется на клиенте) |
| `profile_user_id` | Владелец профиля / холста |
| `author_id` | Кто нарисовал штрих |
| `color` | CSS-цвет (`#rrggbb`) |
| `size` | Толщина слайдера 1–20 |
| `points` | JSON-массив `[[x,y], ...]`, координаты **0.0–1.0** относительно канваса |

Миграция: `drizzle/14-profile-canvas.sql`.

## API (tRPC `profileCanvas`)

| Процедура | Доступ | Описание |
|-----------|--------|----------|
| `listStrokes` | public | Все штрихи профиля (до 500) |
| `saveStroke` | auth | Upsert штриха (author = текущий user) |
| `undoLastStroke` | auth | Удалить **последний свой** штрих на этом холсте |
| `clear` | auth, **только `profileUserId === ctx.user.id`** | Удалить все штрихи холста |

SSR: `getProfilePageData` → `canvasStrokes` → `ProfilePage` → `initialCanvasStrokes`.

## Realtime

1. **Broadcast** (Supabase channel `profile-canvas:{profileUserId}`):
   - `drawing` — черновик линии (~50 ms throttle)
   - `stroke_end` — готовый штрих
   - `stroke_undo` — убрать штрих по id
   - `clear` — только с `ownerId`; клиенты **перечитывают** список из БД (защита от поддельного clear)

2. **postgres_changes**:
   - `INSERT` → новый штрих
   - `DELETE` → undo / очистка

## Права

| Действие | Кто может |
|----------|-----------|
| Рисовать | Любой авторизованный |
| Undo | Только свой последний штрих |
| Очистить всё | **Только владелец профиля** (кнопка + сервер + broadcast с `ownerId`) |

Раньше любой залогиненный мог отправить broadcast `clear` и временно «стереть» холст у других без удаления в БД — исправлено проверкой `ownerId` и `refetch` после clear.

## Клиентские модули

```
src/types/canvas.ts              — Point, Stroke
src/lib/canvas/brush.ts          — слайдер 1–20, перевод в px
src/lib/canvas/stroke-path.ts    — perfect-freehand → Path2D
src/lib/canvas/render-strokes.ts — полная перерисовка
src/hooks/useProfileCanvasStrokes.ts
src/hooks/useCanvasRealtime.ts
src/components/profile/canvas/
  FlipCard.tsx
  ProfileFlipCard.tsx
  ProfileCanvasPreview.tsx
  ProfileCanvas.tsx
  CanvasSaveStatus.tsx
```

## Производительность

- Точки **во время** рисования — в `useRef`, не в `useState`.
- В React Query / БД — только завершённый штрих (`pointerup`).
- Один экземпляр `ProfileFlipCard` на странице (без дубля mobile/desktop).

## Индикатор сохранения

`CanvasSaveStatusBar`: idle → «Каждый штрих сохраняется автоматически», saving → «Сохранение…», saved → «Сохранено» (2.5 с), error → «Ошибка сохранения».

## Толщина кисти

Слайдер `1–20`, формула в `brushSizeToPixels()` — минимум заметно тоньше, чем старый диапазон 2–24 с множителем `0.04`.

## Уведомления

При сохранении штриха **на чужом** профиле владельцу уходит `profile_canvas_draw`:

- Текст: «Кто-то оставил рисунок на вашей карточке» (без имени).
- `actor_id` в БД сохраняется для будущего платного «показать автора»; в `listNotifications` не отдаётся.
- Не чаще **1 раза в 30 минут** на пару (владелец + автор штриха).
- Ссылка ведёт на `/{username}` владельца.

Миграция enum: `drizzle/15-profile-canvas-notification.sql`.

## Связанные доки

- [profile-ui.md](./profile-ui.md) — layout профиля
- [database.md](./database.md) — схема
- [architecture.md](./architecture.md) — data flow
