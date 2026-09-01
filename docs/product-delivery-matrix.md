# Voople product delivery matrix

Обновлено: 2026-08-31. Матрица — обязательный рабочий gate, а не декларация о
завершении. Она объединяет исходную спецификацию, дополняющий social/UX-план,
Reference Map и шесть референсных бордов.

## Источники истины

1. Текущий core, IA и порядок переработки:
   `rework_plan/VOOPLE_CORE_REWORK_PLAN.md`.
2. Secondary social-функции, которые новый план явно не переопределяет:
   `VOOPLE_FINAL_PRODUCT_SOCIAL_UX_IMPLEMENTATION_PLAN.md`.
3. Сохраняемая рабочая функциональность: текущее приложение.
4. Generated rework image задаёт mood и плотность, но переносится с поправками
   из Visual baseline нового плана, а не буквально.
5. Исключение: профиль сохраняет реальный двухколоночный skeleton.

`Готово` означает одновременно: реальный контракт данных, серверную
авторизацию, полноценное взаимодействие, loading/empty/error/offline состояния,
общий presentation для web/desktop, mobile/responsive поведение и проверку.
Маршрут, SQL, hardcode, skeleton или один удачный screenshot обозначаются
`Частично`, а не `Готово`.

## Reference boards

| Board | Канонический результат | Web | Desktop | Visual/state gate | Статус |
| --- | --- | --- | --- | --- | --- |
| 1 — Shell + Home | Compact global rail по умолчанию, сохраняемый pinned-expanded, hover-only control и item tooltips, единое account menu, компактный «Сейчас», feed в первом meaningful viewport и right rail только при достаточной ширине main | Shared compact preference/navigation/account menu/tooltips и container-aware Home rail реализованы | Те же hook/View; platform adapter владеет только navigation/auth callbacks; Profile/Settings/Help/Logout не дублируются в rail | Architecture, lint, web/desktop TypeScript и production builds зелёные; public Playwright проверяет 360/390/1024/1280/1440 без overflow. Остаются authenticated dark/light, fullscreen, Windows scale 125/150%, keyboard/account-menu и screen-reader evidence | Частично |
| 2 — Messaging | `Nav → Chat List → Conversation`, `+` внутри strip разделов, Members/Info drawers по запросу, presence/room context, единые header/composer/menus/Room CTA и безопасное закрытие conversation через active `Чаты`/Escape | Основной flow, shared tooltip/icon controls composer/group header, section-strip `+` и правый Members/Info drawer есть; фильтры `Сейчас/Онлайн/Все/Роли` используют server-owned room context с privacy и section-access checks; active `Чаты` и `Escape` возвращают в inbox, overlay/selection поглощают первый `Escape`, чтение отделено от query и ограничено последним реально показанным сообщением в видимом/focused окне | Те же shared section/drawer/exit/read contracts; unmount останавливает realtime channel, polling и stale load, draft остаётся локально; внешний thread/messages controller ещё расходится | Source contracts проверяют placement `+`, web/desktop composition, restricted-section и `roomsScope` guards. Нужны authenticated parity snapshots, 360/390/fullscreen, keyboard/context menu/upload/offline states и tooltip visual gate | Частично |
| 3 — Room | Full, Share, Empty, Mini, Compact, Minimal, mobile как одна state machine | Состояния существуют; shared sheet сохраняет одну геометрию для loading/preview/connecting/inside/reconnecting/leaving/post-leave/error, ошибки имеют inline retry, подтверждённый выход — явные return/close actions, web-share использует общий stage, единые icon-only media controls/tooltips до и после входа и явные 720p30/1080p60 presets | Native LiveKit/libwebrtc изолирован в worker process; явные transition barriers не показывают stale stage при connect/leave, leave ждёт server refetch с bounded lifecycle deadline; UI stop мгновенный, graceful unpublish предшествует blocking join/forced kill, late session/track events изолированы; self-preview opt-in, unfocused preview приостанавливается; общий stage задаёт полный video box, `object-fit: contain` сохраняет весь кадр, оставшаяся высота и content-bound fullscreen остаются под desktop chrome; Room header/footer/media/dock используют shared controls, dialog возвращает focus | Source contracts проверяют phase precedence, timeout/retry/post-leave, focus restore, reduced-motion-safe state transition, стабильную sheet geometry, полный `width/height: 100%` video box вместе с `contain` и icon-only media controls. Остаются production-подтверждение RC, воспроизводимый двухклиентный stop/restart/quality gate, fullscreen/16:10/ultrawide/portrait visual matrix, reconnect/soak, фактические FPS/bitrate и screen-reader/keyboard/disabled-tooltip visual gate | Частично |
| 4 — Identity | Реальный двухколоночный профиль + все cosmetics на каждой portable surface | Shared profile view есть | Shared profile view подключён | Mini-profile social context и полная surface matrix не закрыты | Частично |
| 5 — Settings + Boosts | Полноэкранные настройки с локальным nav, identity preview, perks/allocation/capacity | Секции и данные есть | Composition ещё не везде едина | Нужны reference snapshots, grace/expiry E2E и removal старых sheets | Частично |
| 6 — Discovery + Money + States | Wide Search/Notifications/Events, полноценные Store/detail/gift/Plus, branded auth entry и системные состояния | Вертикали существуют; branded initial loading и 404 общие; web OTP уже six-slot | Release notes, branded loading и routing 404 используют root Views; desktop auth/OTP визуально расходится | Wide Search/Store/mobile matrix; актуальный logo/auth parity, show-password, общий OTP contract; desktop Search 1024/1280/1440; short/long/very-long release notes без обрезки и visual RC-check | Частично |

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
| 8 | Group Info | Общий правый overlay drawer, banner, topics, sections, Room CTA, фильтры `Сейчас/Онлайн/Все/Роли` и точный доступный Room context участника есть; закрытые sections и `roomsScope` фильтруются на сервере | Social proof, расширенные role actions, authenticated responsive desktop/mobile visual matrix и multi-user production evidence | Частично |
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
| 38 | Screen Share source preview polish | Частично | Worker isolation, session-owned idempotent stop, graceful server unpublish, stale session/track barriers, self-audio suppression, opt-in/focus-aware local preview, titlebar-safe fullscreen и explicit 720p30/1080p60 publish contract готовы в коде; receiving stage снова заполняет доступный box через `width/height: 100%`, сохраняя полный кадр `object-fit: contain`, а source contract закрывает regression «маленькое видео на чёрном canvas». Остаются production-подтверждение нового RC, воспроизводимый двухклиентный stop/restart gate, fullscreen/16:10/ultrawide/portrait visual matrix, desktop thumbnails/selected preview, measured end-to-end FPS/bitrate, dynamic-resize E2E и web post-selection track preview |
| 39 | Release notes long-content polish | Частично | Shared View есть; нужны short/long/very-long fixtures, очистка Markdown-артефактов, viewport-relative max-height, внутренний scroll и web/desktop visual E2E |
| 40 | Search desktop/responsive parity | Частично | Пересобрать default/results/empty/loading по Board 6 и проверить сетку/scroll на 1024/1280/1440 и mobile hierarchy |
| 41 | Mini Profile adaptive positioning | Частично | Collision detection, flip/shift, viewport padding, zoom 125–200%, internal scroll и гарантия, что cosmetics не меняют geometry/actions |
| 42 | Creator Cosmetics Program | Планирование | Не только шаблоны: constrained multi-layer canvas с anchors/masks/keyframes и расширяемым typed manifest, безопасные animated formats/static fallback, preview matrix, moderation/IP/takedown, performance budgets, payouts/KYC/anti-fraud и versioned creator contract |
| 43 | Recognition Program | Планирование | Server-authoritative Founder 25 snapshot и event; subscription loyalty policy; role-based Developer/Team badges; audit log и отделение badges от permissions/cosmetics |
| 44 | Shell useful-space and density | Частично | Реализованы shared preference/View, compact default 72 px, persisted 216 px, hover-only expand/collapse control, item tooltips, единое account menu, mobile Search без topbar/bottom-nav дубля, Chat List 280–320 px и container-aware Home rail. Architecture, lint, web/desktop TypeScript/build зелёные; public Playwright: 360/390/1024/1280/1440 без overflow. До `Готово` нужны compact media-player surface, обновлённая mobile IA с 4–5 destinations/compact badges/safe-area, authenticated fullscreen, Windows scale 125/150%, dark/light, keyboard/account-menu и screen-reader gates |
| 45 | Shared icon controls and tooltips | Частично | Общие `Tooltip`/`IconButton`, viewport flip/clamp с учётом native titlebar, hover-delay, focus/Escape, touch suppression, reduced-motion и aria-label подключены к compact sidebar, Room header/footer/media/dock, «Новому разделу» и «Комнате», composer/group-header controls; tooltip принимает pointer/focus только от физического trigger, поэтому portalled account menu больше не вызывает чужой `Аккаунт`; source/unit contracts зелёные. Остались инвентаризация остальных icon-only действий, authenticated web/desktop visual check, screen-reader pass и единый паттерн объяснения disabled-состояний |
| 46 | Board-by-board convergence | Частично | Board 2 имеет safe conversation close, bounded read lifecycle, section-strip `+` и общий Members overlay drawer с presence/Room/roles; room context server-owned, privacy-aware и не раскрывает restricted sections. Source/unit, architecture, lint и web/desktop TypeScript gates зелёные; до закрытия нужны authenticated responsive/accessibility/visual matrix и controller parity, затем по тому же gate Boards 1, 3, 4, 5 и 6 |
| 47 | Auth entry parity and branding | Частично | Web OTP уже six-slot; нужны актуальный logo/landing/login/register visual language, shared password visibility control, единый web/desktop OTP interaction, timeout/offline copy, trusted-device и responsive/accessibility gates |
| 48 | Runtime/auth resilience | Готово в коде · P0 gate | Client tRPC не зависит от прямого Node `process`; exact `JWT issued at future` и auth transport получают bounded retry. Общий web/desktop session-bootstrap имеет deadline и явную recovery surface: transient/timeout не превращают сессию в anonymous и не удаляют её, invalid/expired credentials открывают обычный вход, desktop использует тот же retry-fetch и автоматически повторяет bootstrap после `online`, web выполняет безопасный App Router refresh. Layout и viewer-aware Server Components используют один request-scoped `React.cache` result, поэтому повторное optional-auth чтение не может сделать часть того же render pass анонимной. Legal consent автоматически повторяет только `SERVICE_UNAVAILABLE`. До полного `Готово` нужны cold/stale/expired/offline→online/VPN/DNS authenticated E2E и visual gates и подтверждение отсутствия повторной отправки mutations |
| 49 | Room surface continuity | Готово в коде · P1 UX | Shared state resolver и одна sheet geometry покрывают loading/preview/connecting/inside/reconnecting/leaving/post-leave/error; explicit connect/leave transition не даёт stale server state вернуть старый экран, leave удерживается до refetch либо bounded timeout, error возвращает inline retry для конкретной операции, а post-leave даёт явные return/close actions. Shared Sheet переводит focus внутрь и возвращает физическому trigger, state animation отключается при reduced motion; fullscreen lifecycle снова активируется после React effect replay и не отменяет новый user gesture как stale. До полного `Готово` остаётся authenticated web/desktop/small-window/fullscreen visual matrix и двухклиентный reconnect/leave production gate |
| 50 | Mini-room geometry and participant controls | Готово в коде · P1 UX | Shared web/desktop mini-room двигается за любую неуправляющую поверхность, включая preview, сохраняет позицию/ширину/высоту, удерживается внутри viewport и меняется с восьми границ/углов pointer-жестом либо стрелками с клавиатуры. Preview имеет отдельную keyboard/tooltip-accessible кнопку открытия полного Room, которая больше не конкурирует с drag gesture. ПКМ, Context Menu и Shift+F10 на удалённом участнике открывают portalled collision-aware меню локальной громкости 0–200%, mute и reset; настройки продолжают применяться и сохраняться существующим LiveKit output controller. До полного `Готово` остаются authenticated web/desktop visual checks при 360/390/1024/1440, Windows scale 125/150%, touch/trackpad и двухклиентный audio gate |
| 51 | Room compact and minimal states | Готово в коде · P1 UX | Shared web/desktop controller передаёт в dock текущего спикера и локальные capture states. Compact 52 px сохраняет название Room, число участников, speaking/connection state и persistent mic/camera/share indicators с доступными именами; minimal остаётся одной безопасной pill-поверхностью, но больше не теряет Room, participant count и active-media state. Source/unit, architecture, lint и TypeScript gates зелёные. До полного `Готово` остаются authenticated 360/390/1024/1440, обе темы, Windows scale 125/150%, keyboard/screen-reader и реальный multi-participant speaking/capture visual gate |
| 52 | Saved Messages | Планирование · P1 | Owner-only data contract, полнотекстовый поиск, вложения, edit/delete, offline/retry, retention/export и parity; не моделировать через фиктивного собеседника |
| 53 | Room-context messages | Планирование · P1 core | Сообщения остаются в Group Chat; Room side panel является access-aware фильтром по immutable Room/LiveSession context snapshot, а не вторым history lifecycle |
| 54 | Full Room invitations | Планирование · P0 Room | Permission/privacy/block/rate-limit contract, pending/accepted/declined/expired, actionable notification/deep link и idempotent delivery |
| 55 | Direct Room expansion | Планирование · P1 Room | Явный consent и создание group conversation без переноса private DM history; роли, leave/rejoin и audit event |
| 56 | Share to messages | Планирование · P1 | Typed access-aware preview для posts/profiles/events/Rooms/messages, unavailable state, optional comment, multi-recipient и idempotency |
| 57 | Conversation attachments library | Планирование · P1 | Paginated Media/Files/Links/Audio query с membership/section authorization, safe preview/download и responsive states |
| 58 | Message confidentiality programme | Частично · P0 trust | Зафиксированы current-state audit, trusted boundary, threat model, запрет преждевременного E2EE claim, требования к device identity/verification/rotation/recovery, encrypted attachments, groups/Room, moderation и no-downgrade rollout. Кандидаты ограничены audited Signal-style/MLS primitives и LiveKit frame encryption с app-owned key distribution. До реализации нужны protocol/dependency ADR, secure storage на каждой платформе, encrypted envelope pilot, независимый cryptography review и interoperability/compromise gates |
| 59 | Public repository protection | Готово для solo-maintainer · P0 engineering | GitHub ruleset `Protect master` активен: изменения только через PR, обязательны `Verify repository` и full-history `Scan complete Git history`, required conversation resolution, force-push и deletion запрещены. Server-side secret scanning, push protection, Dependabot alerts/security updates и private vulnerability reporting включены; Actions используют pinned commits и least privilege. Обязательное CODEOWNERS approval включать только после появления второго доверенного reviewer, иначе владелец не сможет легитимно одобрить собственный PR |
| 60 | Market validation before scale | Планирование · P0 product | Один beachhead-сегмент и обещание перехода, interviews/concierge pilots, invite activation, connected-group W1/W4, Room joins/WAU и cost per connected group вместо feature-count roadmap |
| 61 | Core rework foundation + Group Now contracts | Частично · P0 architecture | Tracked source gate, ADR, typed feature registry и additive schema дополнены server-owned Group Now read model, service-role-only atomic mutations и fail-closed internal tRPC transport. Root membership/privacy/current-member filters применяются до View; SQL сериализует actor/target Room, различает same-group/cross-context switch и использует session-bound stale-safe leave/heartbeat + grace lifecycle. Legacy enter учитывает новую LiveSession. Transport требует internal channel, `multi_room_groups` capability и user allowlist, валидирует input, rate-limit-ит записи и не пишет private IDs в telemetry. Shared web/desktop Group Now View использует плоские Room sections, canonical portable avatars, max-width live-content и loading/quiet/error/offline/action-error states; controller по умолчанию `enabled=false`, поэтому публичного UI switch нет. Shared join coordinator всегда сначала отправляет `confirmedCrossContext=false`, показывает доступный confirmation dialog только на server `PRECONDITION_FAILED`, повторяет с явным consent и muted mic, затем выполняет session-bound token exchange и передаёт только enabled typed credentials общему media adapter; disabled credential и любая ошибка token/provider handoff компенсируются session-bound leave, чтобы не оставить ghost participant, legacy presence передаётся прежнему adapter без второго UI. Create dialog различает временные и admin-only закреплённые Room, создаёт один request UUID на submit и повторно использует его только после явного cross-context consent; `create + join` проходит одним RPC, а общий media handoff не дублирует token/cleanup lifecycle. Read model теперь несёт session start/starter и `isMe`, а чистый core-to-voice mapper валидирует точный session ID и приводит участников к существующему `ChatRoomView`, не создавая второй UI комнат. Общий heartbeat hook принимает типизированную legacy/core цель; core-вариант привязан к session ID, передаёт mic/camera/screen state через существующий таймер и не пишет private IDs в error log. VoiceSession server adapter подключает Group Now к существующему `VoiceSessionProvider` и `ChatRoomControl`: initial credential живёт только в одноразовом ref, reconnect получает новый session-bound token, leave/heartbeat используют точный LiveSession, legacy controls не подменяют активную core Room. Core media credentials переиспользуют существующий LiveKit grant, но provider-room выводится только из server-owned `live_sessions.provider_session_id`, а выдача требует не завершённую group session, active participant row и актуальное root-group membership; credential ограничен 10 минутами и требует refresh через 7 минут, тогда как стабильный legacy lifecycle не меняется. Нативный desktop screen-audio publisher теперь получает отдельный core token по точному session ID и одноразовому screen-session UUID через тот же server-owned active-participant/root-membership gate; grant может только публиковать screen audio в вычисленную сервером provider-room, не может subscribe/data, живёт 10 минут и не возвращает private context в клиентский state. Migration 61 добавляет idempotent request UUID и один service-role-only `create + join` statement: confirmation error откатывает Room insert, а retry потерянного ответа не создаёт дубль. Unit/source, TypeScript/lint/architecture gates должны оставаться зелёными; render/visual evidence оставлено нормальному CI checkout. Остались global/group navigation wiring, responsive visual evidence, реальный Postgres concurrency test, release migration evidence и old-client/two-client production gate |

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
