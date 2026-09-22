# Переработка: dev, этапы и выпуск

Состояние на 9 сентября 2026 года. Это порядок интеграции, а не отчёт о
готовности продукта. Текущий продуктовый выбор, IA и порядок реализации заданы
`VOOPLE_PRODUCT_DECISION_MEMO.md`, `VOOPLE_IA_UI_SPEC.md` и
`VOOPLE_IMPLEMENTATION_BRIEF.md` из `rework_plan`; этот документ описывает
ветки, выпуск и краткую очередь. Подробные проверки остаются в
[матрице поставки](./product-delivery-matrix.md).

## Где собираем изменения

`feat/<задача> → dev → master → desktop-v<версия>`.

- `master` остаётся стабильной веткой. Переработку пока не выпускаем.
- `dev` собирает проверенные коммиты переработки для совместного тестирования.
  Наличие кода в ней ещё не означает готовность к production.
- Новые задачи ответвляем от актуальной `dev`, PR направляем обратно в `dev`.
  Исправления, выпущенные отдельно через `master`, затем включаем в `dev`.
- Когда весь согласованный объём проходит приёмку, открываем один PR
  `dev → master`. Desktop-релиз запускается отдельно тегом, не merge-коммитом.

Начальная точка `dev` — `fad1277` (`feat: manage Room invitation status`).
Все 20 коммитов переработки после `origin/master` на `af73bd4` уже составляют
одну цепочку. Они включены целиком: переносить каждую старую ветку отдельно
не нужно. Старые ветки пока сохраняем; перед закрытием их PR проверяем, что
в них нет уникальных коммитов. Незакоммиченные правки двух прежних рабочих
деревьев, в том числе незавершённые invite links, в начальную `dev` не входят.

Quality gate запускается на push в `dev` и PR в `dev`/`master`; secret scan —
также на push в `dev`. Эти проверки не используют production-учётные данные.
Защиту `dev` в GitHub нужно настроить отдельно: PR, обязательные успешные
проверки, запрет force-push и удаления. Изменение workflow само по себе
не создаёт branch protection.

`dev` — пока ветка, а не развёрнутый тестовый сервис. Для живой приёмки нужен
отдельный стенд: БД, storage, auth и LiveKit, тестовые пользователи и секреты
окружения. Production smoke по расписанию проверяет production, а не `dev`.
Production Desktop release workflow также нельзя использовать как обычную
dev-сборку: у него свои production-настройки.

## Что осталось

Активный порядок соответствует `rework_plan/VOOPLE_IMPLEMENTATION_BRIEF.md`.
Повседневный мессенджер и голосовой слой образуют один сценарий; Group всегда
открывается в `Войс`, а Chat доступен одним переключением. Join сразу открывает Full Room в основной области, общий
sidebar остаётся доступным, а навигация в другой контекст переводит ту же
сессию в Mini Room. Старые discovery, economy и secondary-social задачи не
должны вытеснять эту цепочку.

| Этап | Незакрытый объём |
| --- | --- |
| P0 — source of truth | Decision Memo, IA/UI spec, implementation brief и delivery matrix синхронизированы; продуктовые slices всё равно не считаются готовыми по документу или shell. |
| P1 — повседневный messenger | Реализован общий sidebar/header, `Войс / Чат / Люди`, bounded Live Shelf, section selector и плотный stream; остаются authenticated responsive/accessibility/error-state gates. |
| P2 — Full/Mini continuity | Реализованы main-area Full Room, persistent runtime, Switch и Mini при навигации; остаются реальные multi-client/reconnect/desktop acceptance gates. |
| P3 — Group Chat drawer и screen share | Shared composition/store и responsive drawer присутствуют; остаются multi-stream production evidence и полный authenticated visual matrix. |
| P4 — guest acquisition acceptance | Контракты invite/guest/conversion и guest funnel есть; остаются live email callback, abuse/expiry, DB concurrency и реальный первый разговор на production infrastructure. |
| P5 — mobile/native и secondary | После core acceptance: нативный mobile parity, profiles/cosmetics/music/posts, Saved Messages, discovery и остальные сохранённые вторичные возможности. |

Итого: обязательные P1–P4 в основном существуют в коде, но ни один нельзя
закрыть без общей authenticated, multi-client, DB и production-приёмки; затем
нужны RC и controlled rollout. P5 не входит в критерий готовности нового core.
Replay/transcript и экономика допустимы только после подтверждения повторного
использования целыми компаниями.

### Когда меняется визуал

Визуальная переработка не откладывается до конца функциональной работы.
Первый законченный продуктовый срез P1 меняет основной
экран мессенджера: спокойный Chat по умолчанию, компактная навигация и Live
Shelf только при наличии живых комнат. IA spec, а не изображение само по себе,
задаёт плотность, иерархию, размеры и responsive-переходы. Визуальный язык —
графит, тёплый off-white, системный violet, зелёный только для live/online,
тонкие границы и сдержанная pixel/retro-идентичность без декоративного шума.

P2 продолжает тот же визуальный язык на live-поверхности: Lobby, отдельные
Room, участники и их текущая Room, Full/Mini, переключение и демонстрация.
Full Room не является Sheet/modal и не создаёт второй global sidebar.
Каждый срез принимается отдельно в web и desktop, на 360/390/1024/1440, в
Void/Light и с loading/empty/error/offline/reconnecting. Поэтому результат
становится похожим на целевой референс уже в P1, а не только перед RC.

Authenticated invite preview включён в `dev` на `f85cc55`: общие route/View,
обновление статуса и offline/error/expiry проверены локально, CI зелёный.
Copy/share включён в `dev` на `57b634d`: 202 unit-теста, обе сборки и
[Quality gate](https://github.com/GalitskyKK/voople/actions/runs/33898866736)
прошли. Проверка истории на секреты также зелёная.
Web-переходы login/register/onboarding сохраняют проверенный `redirect` на
`a632928`; 207 unit-тестов и обе сборки прошли в
[Quality gate](https://github.com/GalitskyKK/voople/actions/runs/33901771972).
Desktop OS handler добавлен в рабочий срез: статический `voople` protocol
принимает только `/room-invites/<uuid>` без query/fragment, single-instance
передаёт повторный запуск работающему приложению, а pending-маршрут живёт до
успешной desktop-авторизации. Возврат открывает preview и никогда не принимает
приглашение автоматически. Installed-NSIS gate проверяет registry contract,
cold/warm replacement, повторную недоверенную ссылку, single-instance restore,
наблюдаемый auth continuation, uninstall и обязательный provenance перед stable
promotion. Недоступный authenticated preview предлагает безопасно сменить
аккаунт: web возвращает на login с валидированным внутренним redirect, desktop
сохраняет точный invite path только после успешного sign-out; ошибка выхода не
теряет текущую сессию и допускает повтор. До интеграции нужны зелёный Windows RC
result и Authenticode certificate evidence. Web и desktop registration теперь
передают только валидированный continuation в общий `/auth/confirm`: callback
однократно обменивает PKCE code, синхронизирует профиль и возвращает в
onboarding/invite даже из новой вкладки; ошибка имеет безопасный retry/login.
Перед интеграцией production и preview callback URL нужно разрешить в Supabase
Auth Redirect URLs и проверить живое письмо в том же браузере. После этого — P1.
Живая проверка доступа и перехода в Room остаётся отдельным требованием
стенда. Нельзя считать гостевой сценарий готовым по одному preview.

## Перед выпуском

1. Довести срезы до критериев матрицы: данные, авторизация, взаимодействие,
   loading/empty/error/offline, responsive и web/desktop parity.
2. Прогнать последовательные architecture, unit, lint, TypeScript, web и
   desktop builds. На стенде — миграции, реальные двухклиентные сценарии,
   гостевые переходы, reconnect и регрессию старого клиента.
3. Проверить light/dark, 360 px, Full/Mini Room и демонстрацию; сохранить
   результаты и список оставшихся дефектов. Зелёный source-contract test
   не заменяет эту приёмку.
4. Слить `dev → master` после успешных проверок. До выпуска отдельно включить
   `fix/protected-release-flow`: на момент составления плана этот fix ещё
   не вошёл в `master` и не включён в начальную `dev`.
5. Выпустить версию существующим release-процессом после его исправления для
   protected master; проверить RC и только затем продвигать в stable.

Migrations 58–66 применены штатным single-file runner и зарегистрированы в
настроенной Supabase 2026-09-09. Повторный pending audit видит все 25
обязательных миграций, а release-readiness подтверждает checksum, privacy RPC и
`message_reactions` replica identity. Feature flags этим не менялись; реальный
concurrency test по-прежнему запускается только на отдельной test-БД.

Перед применением используется `npm run db:pending`: он читает только checksum-
реестр через service-role REST, не выводит ключи и перечисляет точные ожидающие
файлы. На 9 сентября 2026 года в подключённой базе зарегистрированы legacy-
миграции по №57 включительно; ожидают применения только №58–66. SQL readiness
и application runners имеют жёсткие process deadlines, поэтому недоступный
pooler завершает проверку ошибкой, а не оставляет релиз зависшим.

## Проверка интеграционного среза

Первый локальный прогон через TSX внутри `node_modules` пропустил ошибки,
которые обнаружил CI. Проверка в чистом checkout вне `node_modules` выявила
два импорта без `.ts` и три проблемы управления состоянием React. Исправлены
импорты, сброс формы при повторном открытии, статус приглашения и передача
начальных media credentials без чтения ref во время render. Правила lint
не отключались; ранее устаревший тест тега профиля также исправлен.

На коммите `7e7ef56` прошли 188 тестов штатного Node, architecture, lint,
web/desktop TypeScript и обе production-сборки в
[GitHub Quality gate](https://github.com/GalitskyKK/voople/actions/runs/33871697748).
[Полная проверка истории на секреты](https://github.com/GalitskyKK/voople/actions/runs/33871697701)
также прошла. Локально lint оставляет два прежних предупреждения, desktop
собирается; локальная web-сборка во временном checkout остановилась на
разрешении font paths, поэтому её успешное подтверждение — отдельный CI run.

В headless Chromium на 360 и 1280 px, с настоящим AppThemeProvider в Void/Light,
проверены реальные компоненты: form close/reopen и confirmation/back,
смена invite ID/expiry, приоритет серверного статуса над ответом mutation,
однократный credentials handoff/clear и переход к legacy-контексту. Ошибок
страницы нет, форма остаётся внутри viewport. Transport и media control в
этом тесте заменены заглушками: это не доказательство реального звонка,
авторизации или двухклиентного E2E. Миграции и живые DB/media gates не запускались.
