# Readiness текущего стабилизационного релиза

Этот документ отделяет исправление уже существующего Voople от новых
продуктовых возможностей. Новые возможности находятся в
`docs/next-feature-release-backlog.md`; существующие регрессии переносить туда
нельзя.

## Обязательный scope текущего релиза

- одинаковые канонические Views для web и desktop там, где они уже внедрены;
- отсутствие прежних desktop runtime-ошибок `process is not defined` и 403 на
  Geist font;
- профиль с общей карточкой, действиями, редактором, share controller и
  закреплённой публикацией;
- общий chat bubble/attachment/composer/header/Group Info, корректная сторона
  исходящих сообщений и фокус composer при открытии чата;
- работа существующих настроек комнаты: выключение output также выключает
  микрофон, звуковые индикаторы mute/deafen, screen-share audio policy;
- полное отображение встроенных release notes с внутренним скроллом;
- применённые и зарегистрированные обязательные migrations 38–55;
- staging остаётся опциональной репетицией, production migration connection и
  migration readiness остаются обязательными перед stable promotion.

## Условия выпуска

1. Architecture, unit, lint, root TypeScript и Next production build зелёные.
2. Desktop TypeScript/Vite и обычные Rust test/check зелёные.
3. Public E2E зелёный локально; authenticated E2E зелёный в CI с отдельной
   test fixture.
4. GitHub RC собирает и проверяет Windows native audio. При успехе выпускается
   артефакт с `processAudioPublisher: true`.
5. Если native dependency/toolchain не собирается, разрешён один текущий
   video-only fallback с `processAudioPublisher: false` в provenance. Это
   автоматически становится блокирующим P0 следующего feature-релиза.
6. Stable получает тот же RC artifact/SHA/signature; повторная сборка при
   promotion запрещена.

## Не считается готовностью

- наличие только SQL, API или отдельного web/desktop экрана;
- прохождение публичных тестов вместо authenticated сценариев;
- молчаливое отключение capability без записи в provenance;
- перенос найденного дефекта уже существующей функции в feature backlog.
