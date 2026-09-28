# Кадры продукта для README и лендинга

Текущие кадры создаются из shared-компонентов Voople с неперсональными fixture
данными. Отдельные дизайн-референсы и нарисованные dashboards в релизные
материалы не попадают.

## Правила кадра

- исходный масштаб без декоративного browser chrome;
- 1440×900 для desktop, 390×844 для mobile;
- неперсональные данные, без devtools, ошибок и случайных popover;
- изображение строится реальными компонентами и текущим CSS;
- production smoke остаётся отдельной проверкой перед выпуском.

## Обязательные кадры

| Файл | Что снять | Состояние | Подпись |
| --- | --- | --- | --- |
| `public/landing/chat.png` | Групповой чат | разделы, Room-context и несколько сообщений | `verify-core-rework-group-surface.mjs` |
| `public/landing/now.png` | Войс группы | Lobby, вторая Room, Split и текущая Room | `verify-core-rework-group-surface.mjs` |
| `public/landing/people.png` | Люди | статусы, Room и Voop | `verify-core-rework-group-surface.mjs` |
| `public/landing/profile.png` | Профиль desktop | shared sidebar, карточка и публикации | `verify-profile-visual.mjs` |
| `public/landing/profile-mobile.png` | Профиль mobile | 390 px без горизонтального overflow | `verify-profile-visual.mjs` |

## Ещё нужны до beta

- Full Room с подключённым media и screen share;
- гостевой вход по ссылке;
- профиль с реальным разрешённым asset seed;
- web/desktop production smoke после миграций.

## Финальная проверка

Перед выпуском проверить Void/Light, отсутствие horizontal overflow,
popover boundaries и production build. Кадры не являются доказательством
backend-готовности сценария.
