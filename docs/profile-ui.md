# Profile UI

## Маршрут

Профиль — **страница** `/[username]`, не модалка.

## Layout

Один responsive layout (без дубля карточки mobile/desktop):

- Колонка карточки: `ProfileFlipCard` (`lg:w-[320px]`)
- Колонка постов: `PostCard` (+ `CreatePostBlock` только на `lg+`)

### Холст на обороте

`ProfileFlipCard` = лицевая `ProfileCard` + оборот с рисованием. Подробно: [profile-canvas.md](./profile-canvas.md).

- До переворота: `ProfileCanvasPreview` (статичный canvas)
- После переворота: `ProfileCanvas` (редактирование)
- `StickyProfileHeader` (52px) только после скролла карточки — `useElementScrolledPast` на обёртке карточки (`bottom < 48px`)
- До скролла sticky **не рендерится** (`return null`)
- Посты на профиле — только автора (`getPostsForUser`)
- Desktop: `CreatePostBlock` над постами; mobile — FAB
- Над лентой: `ProfileFeedTabs` — **Посты** / **Медиа** (фильтр по `mediaUrl`)

### Баннер

Редактирование профиля: загрузка или рисование 640×240, `setCustomBanner`. Большой холст — Sheet. Эффекты профиля — `/shop`, не оборот карточки.

## Публикация состояния

На **своём** профиле (`isOwner`, мок: `minti`): `ProfileStatusSection` сравнивает черновик и опубликованный снимок.

- При изменении настроения / цитаты / трека — плашка `PublishStatusBanner`: «Состояние изменилось» + «Опубликовать».
- После публикации плашка скрывается (снимок обновляется; API — позже).

В ленте — пост `kind: "status"` (`StatusPostBody`).

## Desktop layout

- `DesktopSidebar` (lg+): логотип, навигация слева, внизу Магазин и Выйти.
- `AppTopBar` и `BottomNav` — только mobile.
- Табы ленты — в колонке контента (`FeedHeader`), поиск в sidebar на desktop.

## Status block

- Колонка: mood → quote → music
- **Без** заголовка «Сейчас» и без подписей полей
- Иконки: emoji на slider, `MessageCircle`, `Music`
- Пустые поля скрыты

## ProfileMeta

- Дата регистрации (`users.createdAt`)
- Дата Voople+ (`subscriptions.startedAt`)
- Без блока «в числе участников» / Discord

## Тема

CSS variables на `.profile-card`:

- `--theme-primary`
- `--theme-accent`

Mock: `src/lib/mocks/profile.ts`.
