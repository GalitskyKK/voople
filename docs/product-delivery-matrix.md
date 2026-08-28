# Voople product delivery matrix

Обновлено: 2026-08-27. Матрица — обязательный рабочий gate, а не декларация о
завершении. Она объединяет исходную спецификацию, дополняющий social/UX-план,
Reference Map и шесть референсных бордов.

## Источники истины

1. Поведение и продуктовые контракты: `VOOPLE_PROJECT_SPEC.md` вместе с
   `VOOPLE_FINAL_PRODUCT_SOCIAL_UX_IMPLEMENTATION_PLAN.md`.
2. Сохраняемая рабочая функциональность: текущее приложение.
3. Layout, IA, responsive и плотность: `2try_design`.
4. Identity, cosmetics и отдельные выразительные элементы: `1try_design`.
5. Исключение: профиль сохраняет реальный двухколоночный skeleton; Board 4 не
   заменяет его одной широкой карточкой.

`Готово` означает одновременно: реальный контракт данных, серверную
авторизацию, полноценное взаимодействие, loading/empty/error/offline состояния,
общий presentation для web/desktop, mobile/responsive поведение и проверку.
Маршрут, SQL, hardcode, skeleton или один удачный screenshot обозначаются
`Частично`, а не `Готово`.

## Reference boards

| Board | Канонический результат | Web | Desktop | Visual/state gate | Статус |
| --- | --- | --- | --- | --- | --- |
| 1 — Shell + Home | Compact global rail по умолчанию, сохраняемый pinned-expanded, hover-only control и item tooltips, единое account menu, компактный «Сейчас», feed в первом meaningful viewport и right rail только при достаточной ширине main | Shared compact preference/navigation/account menu/tooltips и container-aware Home rail реализованы | Те же hook/View; platform adapter владеет только navigation/auth callbacks; Profile/Settings/Help/Logout не дублируются в rail | Architecture, lint, web/desktop TypeScript и production builds зелёные; public Playwright проверяет 360/390/1024/1280/1440 без overflow. Остаются authenticated dark/light, fullscreen, Windows scale 125/150%, keyboard/account-menu и screen-reader evidence | Частично |
| 2 — Messaging | `Nav → Chat List → Conversation`, drawers по запросу, единые header/composer/menus/Room CTA | Основной flow и shared tooltip/icon controls composer/group header есть; действия «Новый раздел» и «Комната» компактны и используют общий accessible tooltip; attachment menu всегда даёт фото и условно — playlist music | Те же shared presentation и controls; внешний thread/messages controller ещё расходится | Нужны parity snapshots, keyboard/context menu/upload states и authenticated tooltip visual gate | Частично |
| 3 — Room | Full, Share, Empty, Mini, Compact, Minimal, mobile как одна state machine | Состояния существуют; web-share использует общий stage, единые icon controls/tooltips и явные 720p30/1080p60 presets | Native LiveKit/libwebrtc изолирован в worker process; UI stop мгновенный, graceful unpublish предшествует blocking join/forced kill, late session/track events изолированы; self-preview opt-in, unfocused preview приостанавливается; общий stage использует intrinsic-ratio video с `auto`-размерами, жёсткими max-bound и `contain`, оставшуюся высоту и content-bound fullscreen под desktop chrome; Room header/footer/media/dock используют shared controls | Source contract исключает одновременные `width/height: 100%` на screen video и проверяет full-frame invariant; production RC пользовательски подтверждён без прежнего краша. Остаются воспроизводимый двухклиентный stop/restart/quality gate, fullscreen/16:10/ultrawide/portrait visual matrix, reconnect/soak, фактические FPS/bitrate, screen-reader/keyboard/disabled-tooltip visual gate и все visual states | Частично |
| 4 — Identity | Реальный двухколоночный профиль + все cosmetics на каждой portable surface | Shared profile view есть | Shared profile view подключён | Mini-profile social context и полная surface matrix не закрыты | Частично |
| 5 — Settings + Boosts | Полноэкранные настройки с локальным nav, identity preview, perks/allocation/capacity | Секции и данные есть | Composition ещё не везде едина | Нужны reference snapshots, grace/expiry E2E и removal старых sheets | Частично |
| 6 — Discovery + Money + States | Wide Search/Notifications/Events, полноценные Store/detail/gift/Plus и системные состояния | Вертикали существуют; branded initial loading и 404 общие | Release notes, branded loading и routing 404 используют root Views | Wide Search/Store/mobile matrix; desktop Search 1024/1280/1440; short/long/very-long release notes без обрезки и visual RC-check | Частично |

## P0 — core social

| # | Результат | Контракт и UI сейчас | Осталось до `Готово` | Статус |
| --- | --- | --- | --- | --- |
| 1 | Group visibility `private/unlisted/public` | Поля, mutation, access/discovery filters и settings control существуют | Полная authorization matrix, старые desktop clients, public/unlisted E2E | Частично |
| 2 | Join policy `invite_only/request/free` | Поле и базовая discovery/join логика существуют | Request moderation flow, все error states и web/desktop E2E | Частично |
| 3 | Interests/topics для user и group | Модель, выбор и discovery-источники существуют | Управляемый каталог вместо поверхностного hardcode, onboarding и ranking validation | Частично |
| 4 | «Сейчас» | Online/listening/active Room, accepted DM и люди из общих групп, shared Home view/action, portable identity и rule-based ranking подключены | Game/activity, недавнее взаимное общение без DM, responsive/empty visual gate и реальные live tests | Частично |
| 5 | «Продолжить» | Unread/reply/mention/recent/reciprocal ranking, локальные account/device drafts, recently-opened, лимит 4 и дедупликация с active Room проверены общими tests | Sticky visual parity, multi-session UX и end-to-end ranking data | Частично |
| 6 | Relationship score | Серверная оценка участвует в Home ranking | Канонические сигналы/decay, explainability, privacy и recommendation reuse | Частично |
| 7 | Presence privacy | Один shared settings View для web/desktop; server-side enforcement online/music/rooms, profile/interests, invite counts/actions, new-DM requests и recommendations; migration 57 защищает DM атомарно | Код и production migration готовы; authenticated multi-user CI/E2E остаётся финальным release evidence | Готово в коде |
| 8 | Group Info | Общий drawer, banner, topics, sections, Room CTA, filters/actions частично есть | Social proof, роли/actions, responsive desktop drawer и визуальная сверка Board 2 | Частично |
| 9 | Тихая Room activity в истории | Group Room events агрегируются, direct calls остаются отдельными | Проверить concurrency/reconnect/multi-room/day grouping и старые клиенты | Частично |
| 10 | Единый Room CTA | Shared presentation используется на части surfaces | Один contract/state во всех header/info/home/notification/invite surfaces | Частично |

## P1 — discovery

| # | Результат | Статус | Главный незакрытый gate |
| --- | --- | --- | --- |
| 11 | Global Search redesign | Частично | Wide layout, sticky stack, recent/filters/ranking и Board 6 parity |
| 12 | Communities section | Частично | Полноценный каталог, states и responsive composition |
| 13 | Public community page | Частично | Web и desktop `/group/:slug` используют общий View и авторизованный join contract; остаются active Room surface, offline state и responsive visual E2E |
| 14 | Community cards | Частично | Banner, topics, social proof, online/talking и единая карточка везде |
| 15 | Member directory | Частично | Сейчас/В сети/Все/Роли, search/actions/privacy и wide drawer |
| 16 | People recommendations | Частично | Opt-out privacy уже enforced; нужны candidate sources, safety и actionable recommendation cards |
| 17 | Mutual context | Нет/частично | Общие группы/интересы/люди и объяснимость без утечки privacy |
| 18 | Topic pages | Частично | Real ranking, filters, empty/error и navigation parity |
| 19 | Organic interests onboarding | Нет/частично | Полный first-run flow, skip/edit/recommendations и analytics |

## P2 — new social connections

| # | Результат | Статус | Главный незакрытый gate |
| --- | --- | --- | --- |
| 20 | «Открыт к общению» | Частично | Visibility controls, discovery surfaces и abuse/safety handling |
| 21 | DM Requests | Частично | Inbox, accept/decline/block/rate-limit и complete error states |
| 22 | Request privacy | Частично | Текущий new-DM path защищён в service и atomic DB RPC; нужен полный DM Requests inbox с accept/decline/block |
| 23 | Social context в Mini Profile | Частично | Shared communities, relationship reason, room actions; viewport collision/zoom/edge positioning и внутренний scroll; cosmetics уже общие |
| 24 | Room/community invite previews | Частично | Anonymous live counts теперь privacy-filtered; нужны полные auth/anonymous states и visual parity |
| 25 | Actionable Room notifications | Частично | Join CTA, expiry/reconnect, dedup и desktop notification parity |

## P3 — retention and virality

| # | Результат | Статус | Главный незакрытый gate |
| --- | --- | --- | --- |
| 26 | Event → Room | Частично | Event lifecycle, reminders, live transition и attendance analytics |
| 27 | Shareable profile identity | Частично | Preview parity, privacy, deep links и installed/uninstalled desktop flow |
| 28 | Referral activation | Нет | Idempotent attribution/reward contract и fraud controls |
| 29 | Community recommendation ranking | Частично | Relationship/topics/activity signals и offline evaluation |
| 30 | Public Rooms in communities | Частично | Discovery/join/privacy/moderation and lifecycle states |

## P4 — polish

| # | Результат | Статус | Главный незакрытый gate |
| --- | --- | --- | --- |
| 31 | User Settings redesign | Частично | Full Board 5/6 composition, search, descriptions and states |
| 32 | Group Settings redesign | Частично | Один full-page shared view, убрать старые/дублирующие entry points |
| 33 | Boost UI | Частично | Полные perks/preview/allocated-used-free/grace states и copy |
| 34 | Store contextual previews | Частично | Реальные profile/post/community previews, gift delivery and Board 6 parity |
| 35 | Responsive/mobile polish | Частично | 360/390/1024/1440 snapshots и safe-area/touch gates всех verticals |
| 36 | Accessibility | Частично | Keyboard/focus/screen reader/contrast matrix, reduced motion |
| 37 | Analytics dashboards | Частично | Event coverage audit, activation ≥2 min, funnels/retention/cost dashboards |
| 38 | Screen Share source preview polish | Частично | Worker isolation, session-owned idempotent stop, graceful server unpublish, stale session/track barriers, self-audio suppression, opt-in/focus-aware local preview, titlebar-safe fullscreen, intrinsic-ratio/max-bound receiving canvas и explicit 720p30/1080p60 publish contract готовы в коде; production RC без прежнего краша подтверждён пользователем. Остаются воспроизводимый двухклиентный stop/restart gate, fullscreen/16:10/ultrawide/portrait visual matrix, desktop thumbnails/selected preview, measured end-to-end FPS/bitrate, dynamic-resize E2E и web post-selection track preview |
| 39 | Release notes long-content polish | Частично | Shared View есть; нужны short/long/very-long fixtures, очистка Markdown-артефактов, viewport-relative max-height, внутренний scroll и web/desktop visual E2E |
| 40 | Search desktop/responsive parity | Частично | Пересобрать default/results/empty/loading по Board 6 и проверить сетку/scroll на 1024/1280/1440 и mobile hierarchy |
| 41 | Mini Profile adaptive positioning | Частично | Collision detection, flip/shift, viewport padding, zoom 125–200%, internal scroll и гарантия, что cosmetics не меняют geometry/actions |
| 42 | Creator Cosmetics Program | Планирование | Не только шаблоны: constrained multi-layer canvas с anchors/masks/keyframes и расширяемым typed manifest, безопасные animated formats/static fallback, preview matrix, moderation/IP/takedown, performance budgets, payouts/KYC/anti-fraud и versioned creator contract |
| 43 | Recognition Program | Планирование | Server-authoritative Founder 25 snapshot и event; subscription loyalty policy; role-based Developer/Team badges; audit log и отделение badges от permissions/cosmetics |
| 44 | Shell useful-space and density | Частично | Реализованы shared preference/View, compact default 72 px, persisted 216 px, hover-only expand/collapse control, item tooltips, единое account menu, mobile Search без topbar/bottom-nav дубля, Chat List 280–320 px и container-aware Home rail. Architecture, lint, web/desktop TypeScript/build зелёные; public Playwright: 360/390/1024/1280/1440 без overflow. До `Готово` нужны authenticated fullscreen, Windows scale 125/150%, dark/light, keyboard/account-menu и screen-reader gates |
| 45 | Shared icon controls and tooltips | Частично | Общие `Tooltip`/`IconButton`, viewport flip/clamp с учётом native titlebar, hover-delay, focus/Escape, touch suppression, reduced-motion и aria-label подключены к compact sidebar, Room header/footer/media/dock, «Новому разделу» и «Комнате», composer/group-header controls; source/unit contracts зелёные. Остались инвентаризация остальных icon-only действий, authenticated web/desktop visual check, screen-reader pass и единый паттерн объяснения disabled-состояний |

## Cross-platform architecture gate

- Канонические view-models и stateless views живут в `src/types`, `src/lib`,
  `src/hooks` и `src/components`.
- Web adapters владеют Next/tRPC/server boundaries. Desktop adapters владеют
  Tauri/auth/navigation/native capabilities.
- `desktop/src` не должен повторять profile, post, chat, Home, Search, settings
  или store markup. `desktopPortableUi` пуст и architecture check запрещает
  повторное добавление исключений или переносимого TSX в desktop-домены.
- Native capability может отличаться, но UI contract, состояния и fallback
  обязаны оставаться одинаковыми.

## Release acceptance gate

Перед заявлением о полном выполнении каждого пункта должны быть приложены:

1. ссылка на contract/service/authorization;
2. canonical shared View и два тонких platform adapters;
3. loading, empty, error, offline/reconnecting и long-content states;
4. screenshots/snapshots обеих тем на 360/390/1024/1440;
5. keyboard, focus и accessible-name checks;
6. unit/integration/E2E checks для затронутого поведения;
7. отсутствие новых architecture baseline exceptions;
8. обновлённая строка этой матрицы без завышения статуса.
