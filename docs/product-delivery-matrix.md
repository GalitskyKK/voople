# Voople product delivery matrix

Обновлено: 2026-09-06. Матрица — обязательный рабочий gate, а не декларация о
завершении. Она объединяет исходную спецификацию, дополняющий social/UX-план,
Reference Map и шесть референсных бордов.

Интеграция на 2026-09-04: закоммиченная цепочка core rework до `fad1277`
собрана в `dev`; это не меняет статусы готовности ниже. Порядок дальнейших
этапов с учётом messenger-first дополнения, стенд и release gates описаны в
[плане интеграции](./rework-integration-plan.md). Незавершённые invite links,
живые DB/E2E и visual gates остаются открытыми.

Регрессия интеграции, `7e7ef56`: штатный Node — 188/188; architecture, lint,
web/desktop TypeScript и обе сборки проходят в GitHub CI. В реальных общих
компонентах исправлены reset формы новой Room, согласование статуса invite и
render-safe передача credentials в VoiceSessionProvider. Изолированный Chromium
на 360/1280 px в Void/Light подтверждает reopen/back, смену invite ID/expiry,
приоритет server status, однократный handoff/clear и legacy reset без page errors.
Transport/media были заглушены: real DB, authorization, native desktop и
двухклиентный media gate остаются открытыми. Подробности — в плане интеграции.

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
| 2 — Messaging | Messenger-first shell: `Groups / Direct → Conversation`, inbox/search по запросу, `+` внутри strip разделов, Members/Info drawers, presence/room context, единые header/composer/menus/Room CTA и безопасное закрытие conversation через active `Чаты`/Escape | На `/messages` legacy primary-nav заменён общим плотным sidebar с Groups/Direct/Search; открытый thread больше не дублирует общий chat list, secondary-маршруты сохранены вне этой поверхности. Корневая Group и её разделы получили общий переключатель `Чат / Сейчас / Люди`: default остаётся Chat, разделы принадлежат только ему, занятые Rooms показываются компактным live shelf и открываются напрямую, а People использует реальные membership, role, presence и active-Room данные. Sidebar получает server-owned список активных Rooms одним bounded query и отдельно показывает число людей, количество комнат и screen share; отдельное доступное нажатие на live-marker открывает именно Group Сейчас. Непрочитанное хранится отдельным per-member cursor, исключает собственные сообщения и агрегирует только доступные разделы; released `messages.read_at` временно сохранён для старых клиентов и delivery ticks. Header даёт прямой вход в Лобби, а для уже открытой core Room показывает её имя и возвращает в единое окно разговора; cross-context switch остаётся явным. Старый Info drawer, теги и роли не удалены. Active `Чаты` и `Escape` возвращают в inbox, overlay/selection поглощают первый `Escape`, чтение отделено от query и ограничено последним реально показанным сообщением в видимом/focused окне | Тот же `MessengerSidebarView` и общий `GroupSurfaceShell`; один desktop provider обслуживает sidebar и inbox без двойного polling/realtime subscription. Web и desktop используют одинаковые deep-linked tabs, live shelf, Group Now, People, Lobby action, unread badges и sidebar live states; platform adapters передают только navigation/session context. Те же shared section/drawer/exit/read contracts; unmount останавливает realtime channel, polling и stale load, draft остаётся локально | Source contracts и изолированные visual gates подтверждают shell на 360/1024/1280 и Group surface на 390/1280: Chat/Now/People, multi-Room shelf, отдельные unread/live markers, one-click Lobby header composition, square avatar tokens, clean grotesk для UI, mono только для metadata, reduced-motion-safe reveal и отсутствие overflow/runtime errors. Desktop stack `header + tabs + sections + live shelf` ограничен примерно 160 px вместо прежних 196 px без скрытия действий или уменьшения mobile targets; migration 65 применена и зарегистрирована. Нужны authenticated parity 1024/1440/fullscreen, keyboard/context menu/upload/offline states и tooltip visual gate | Частично |
| 3 — Room | Full, Share, Empty, Mini, Compact, Minimal, mobile как одна state machine | Состояния существуют; shared Full Room surface сохраняет одну геометрию для loading/preview/connecting/inside/reconnecting/leaving/post-leave/error, ошибки имеют inline retry, подтверждённый выход — явные return/close actions, web-share использует общий stage, единые icon-only media controls/tooltips до и после входа и явные 720p30/1080p60 presets | Native LiveKit/libwebrtc изолирован в worker process; явные transition barriers не показывают stale stage при connect/leave, leave ждёт server refetch с bounded lifecycle deadline; UI stop мгновенный, graceful unpublish предшествует blocking join/forced kill, late session/track events изолированы; self-preview opt-in, unfocused preview приостанавливается; общий stage задаёт полный video box, `object-fit: contain` сохраняет весь кадр, оставшаяся высота и content-bound fullscreen остаются под desktop chrome; Room header/footer/media/dock используют shared controls, Full Room возвращает focus | Source contracts проверяют phase precedence, timeout/retry/post-leave, focus restore, reduced-motion-safe state transition, стабильную main-area geometry, полный `width/height: 100%` video box вместе с `contain` и icon-only media controls. Остаются production-подтверждение RC, воспроизводимый двухклиентный stop/restart/quality gate, fullscreen/16:10/ultrawide/portrait visual matrix, reconnect/soak, фактические FPS/bitrate и screen-reader/keyboard/disabled-tooltip visual gate | Частично |
| 4 — Identity | Реальный двухколоночный профиль + все cosmetics на каждой portable surface | Shared profile view есть | Shared profile view подключён | Mini-profile social context и полная surface matrix не закрыты | Частично |
| 5 — Settings + Boosts | Полноэкранные настройки с локальным nav, identity preview, perks/allocation/capacity | Секции и данные есть | Composition ещё не везде едина | Нужны reference snapshots, grace/expiry E2E и removal старых sheets | Частично |
| 6 — Discovery + Money + States | Wide Search/Notifications/Events, полноценные Store/detail/gift/Plus, branded auth entry и системные состояния | Вертикали существуют; branded initial loading и 404 общие; web OTP уже six-slot | Release notes, branded loading и routing 404 используют root Views; desktop auth/OTP визуально расходится | Wide Search/Store/mobile matrix; актуальный logo/auth parity, show-password, общий OTP contract; desktop Search 1024/1280/1440; short/long/very-long release notes без обрезки и visual RC-check | Частично |

## P0 — core social

| # | Результат | Контракт и UI сейчас | Осталось до `Готово` | Статус |
| --- | --- | --- | --- | --- |
| 1 | Group visibility `private/unlisted/public` | Поля, mutation, access/discovery filters и settings control существуют | Полная authorization matrix, старые desktop clients, public/unlisted E2E | Частично |
| 2 | Join policy `invite_only/request/free` | Поле и базовая discovery/join логика существуют | Request moderation flow, все error states и web/desktop E2E | Частично |
| 3 | Interests/topics для user и group | Модель, выбор и discovery-источники существуют | Управляемый каталог вместо поверхностного hardcode, onboarding и ranking validation | Частично |
| 4 | «Сейчас» | Online/listening, accepted DM и люди из общих групп дополнены отдельной карточкой каждой активной core Room без схлопывания группы. Core query закрыт server capability/user allowlist. Read model отсекает stale/left участников, повторно проверяет актуальное membership и `roomsScope`, дедуплицирует legacy/core presence. Отдельный лёгкий active-Room endpoint обновляется раз в 15 секунд только в видимом окне, refetch-ится на focus/reconnect, сохраняет последний снимок при offline/error и показывает retry. Один merge contract в web/desktop заменяет исчезнувшие Room, дедуплицирует «Продолжить» и восстанавливает conversation после выхода. CTA подключает core через session-bound join/media handoff, а legacy — через отдельный auto-connect `joinRoom`; занятый другим разговором provider fail-safe отказывает без ложной telemetry | Game/activity, недавнее взаимное общение без DM, realtime push как возможная оптимизация polling, authenticated responsive/empty/offline visual gate и реальные multi-user live tests | Частично |
| 5 | «Продолжить» | Unread/reply/mention/recent/reciprocal ranking, локальные account/device drafts, recently-opened, лимит 4 и дедупликация с active Room проверены общими tests | Sticky visual parity, multi-session UX и end-to-end ranking data | Частично |
| 6 | Relationship score | Серверная оценка участвует в Home ranking | Канонические сигналы/decay, explainability, privacy и recommendation reuse | Частично |
| 7 | Presence privacy | Один shared settings View для web/desktop; server-side enforcement online/music/rooms, profile/interests, invite counts/actions, new-DM requests и recommendations; migration 57 защищает DM атомарно | Код и production migration готовы; authenticated multi-user CI/E2E остаётся финальным release evidence | Готово в коде |
| 8 | Group Info | Общий правый overlay drawer, banner, topics, sections, Room CTA, фильтры `Сейчас/Онлайн/Все/Роли` и точный доступный Room context участника есть; закрытые sections и `roomsScope` фильтруются на сервере | Social proof, расширенные role actions, authenticated responsive desktop/mobile visual matrix и multi-user production evidence | Частично |
| 9 | Тихая Room activity в истории | Group Room events агрегируются, direct calls остаются отдельными | Проверить concurrency/reconnect/multi-room/day grouping и старые клиенты | Частично |
| 10 | Единый Room CTA | Root-group header, Group Info и public-group preview для уже вступившего пользователя используют один `GroupRoomAction`, который fail-closed переключается между stable legacy Room и internal multi-Room panel; public preview сохраняет одинаковый shared View и поведение в web/desktop и не показывает Room CTA до membership. Home, actionable Room notification и authenticated invite-link preview используют тот же dynamic join coordinator/token/compensating-leave lifecycle для конкретной core Room и общий web/desktop controller; прямой legacy-разговор остаётся отдельным typed context и auto-connect’ится через provider `joinRoom`. Active count/Room list обновляются bounded refresh lifecycle | Закрыть canonical share/desktop protocol и responsive/keyboard visual gate | Частично |

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
| 37 | Analytics dashboards | Частично | Server guest funnel теперь фиксирует реальное создание external invite, дедуплированный preview с разделением new/existing/member, explicit join, фактическое media connection, участие с собеседником ≥3 минут и conversion; HMAC actor/dedupe keys не сохраняют invite/access tokens, raw IDs, content или private media identifiers. Нужны migration 68, production event audit и dashboards для company activation/retention/cost |
| 38 | Screen Share source preview polish | Частично | Worker isolation, session-owned idempotent stop, graceful server unpublish, stale session/track barriers, self-audio suppression, opt-in/focus-aware local preview, titlebar-safe fullscreen и explicit 720p30/1080p60 publish contract готовы в коде; receiving stage заполняет доступный box через `width/height: 100%`, сохраняя полный кадр `object-fit: contain`. При нескольких screen publications первая выбранная остаётся в фокусе, остальные не подписываются и не перехватывают stage; после завершения активной детерминированно продвигается следующая вместе со своим audio companion. Та же focus-policy применяется в узкой guest surface, поэтому второй stream или его audio не захватывает гостевой stage. Остаются production-подтверждение нового RC, воспроизводимый multi-client stop/restart/switch gate, fullscreen/16:10/ultrawide/portrait visual matrix, явный chooser/thumbnails для нескольких streams, measured end-to-end FPS/bitrate, dynamic-resize E2E и web post-selection track preview |
| 39 | Release notes long-content polish | Частично | Shared View есть; нужны short/long/very-long fixtures, очистка Markdown-артефактов, viewport-relative max-height, внутренний scroll и web/desktop visual E2E |
| 40 | Search desktop/responsive parity | Частично | Пересобрать default/results/empty/loading по Board 6 и проверить сетку/scroll на 1024/1280/1440 и mobile hierarchy |
| 41 | Mini Profile adaptive positioning | Частично | Collision detection, flip/shift, viewport padding, zoom 125–200%, internal scroll и гарантия, что cosmetics не меняют geometry/actions |
| 42 | Creator Cosmetics Program | Планирование | Не только шаблоны: constrained multi-layer canvas с anchors/masks/keyframes и расширяемым typed manifest, безопасные animated formats/static fallback, preview matrix, moderation/IP/takedown, performance budgets, payouts/KYC/anti-fraud и versioned creator contract |
| 43 | Recognition Program | Планирование | Server-authoritative Founder 25 snapshot и event; subscription loyalty policy; role-based Developer/Team badges; audit log и отделение badges от permissions/cosmetics |
| 44 | Shell useful-space and density | Частично | Реализованы shared preference/View, compact default 72 px, persisted 216 px, hover-only expand/collapse control, item tooltips, единое account menu, mobile Search без topbar/bottom-nav дубля, четыре mobile destinations (`Сейчас / Чаты / Поиск / Профиль`), activity badge в header и Chat List, Chat List 280–320 px и container-aware Home rail. Architecture, lint, web/desktop TypeScript/build зелёные; public Playwright: 360/390/1024/1280/1440 без overflow. До `Готово` нужны compact media-player surface, authenticated mobile/fullscreen visual gate, Windows scale 125/150%, dark/light, keyboard/account-menu и screen-reader gates |
| 45 | Shared icon controls and tooltips | Частично | Общие `Tooltip`/`IconButton`, viewport flip/clamp с учётом native titlebar, hover-delay, focus/Escape, touch suppression, reduced-motion и aria-label подключены к compact sidebar, Room header/footer/media/dock, «Новому разделу» и «Комнате», composer/group-header controls; tooltip принимает pointer/focus только от физического trigger, поэтому portalled account menu больше не вызывает чужой `Аккаунт`; source/unit contracts зелёные. Остались инвентаризация остальных icon-only действий, authenticated web/desktop visual check, screen-reader pass и единый паттерн объяснения disabled-состояний |
| 46 | Board-by-board convergence | Частично | Board 2 имеет safe conversation close, bounded read lifecycle, section-strip `+` и общий Members overlay drawer с presence/Room/roles; room context server-owned, privacy-aware и не раскрывает restricted sections. Source/unit, architecture, lint и web/desktop TypeScript gates зелёные; до закрытия нужны authenticated responsive/accessibility/visual matrix и controller parity, затем по тому же gate Boards 1, 3, 4, 5 и 6 |
| 47 | Auth entry parity and branding | Частично | Web OTP уже six-slot. Web и desktop registration используют общий safe email callback: он сохраняет внутренний continuation, дедуплицирует PKCE exchange при React StrictMode, синхронизирует профиль, доверяет устройство и имеет loading/error/retry/login states без показа provider error. Нужны актуальный logo/landing/login/register visual language, shared password visibility control, единый web/desktop OTP interaction, timeout/offline copy, live email/redirect-allowlist и responsive/accessibility gates |
| 48 | Runtime/auth resilience | Готово в коде · P0 gate | Client tRPC не зависит от прямого Node `process`; exact `JWT issued at future` и auth transport получают bounded retry. Общий web/desktop session-bootstrap имеет deadline и явную recovery surface: transient/timeout не превращают сессию в anonymous и не удаляют её, invalid/expired credentials открывают обычный вход, desktop использует тот же retry-fetch и автоматически повторяет bootstrap после `online`, web выполняет безопасный App Router refresh. Layout и viewer-aware Server Components используют один request-scoped `React.cache` result, поэтому повторное optional-auth чтение не может сделать часть того же render pass анонимной. Legal consent автоматически повторяет только `SERVICE_UNAVAILABLE`. До полного `Готово` нужны cold/stale/expired/offline→online/VPN/DNS authenticated E2E и visual gates и подтверждение отсутствия повторной отправки mutations |
| 49 | Room surface continuity | Готово в коде · P1 UX | Shared state resolver и одна main-area geometry покрывают loading/preview/connecting/inside/reconnecting/leaving/post-leave/error; explicit connect/leave transition не даёт stale server state вернуть старый экран, leave удерживается до refetch либо bounded timeout, error возвращает operation-specific title и inline retry, а post-leave даёт явные return/close actions. Reconnecting сохраняет рабочий stage и показывает отдельный live-status вместо подмены всего экрана; switch между Rooms теперь маскирует stale stage внутри тех же bounds, называет target Room и сообщает progress через polite live-region без скачка header/footer. Voice-only Room заполняет рабочую область равномерной сеткой, active speaker обозначается границей без glow, а solo Room сохраняет контекст участника и короткое действие `Позвать`. При screen share исходный aspect ratio остаётся в focus-stage, а участники занимают одну компактную полосу под ним; на mobile горизонтальный Room switcher скрыт и остаётся единственный selector в header. Full Room использует заданные 56 px header и 160 px local switcher без оставшегося от Sheet пустого правого gutter. Full Room заменяет route content без modal backdrop и body scroll lock, оставляет глобальный sidebar, переводит focus внутрь и возвращает физическому trigger; явное сворачивание, Escape и смена маршрута сохраняют session как Mini, причём Full и Mini не рендерятся одновременно. State/switch animation отключается при reduced motion; fullscreen lifecycle снова активируется после React effect replay и не отменяет новый user gesture как stale. Актуальный source-CSS/Geist harness отдельно подтвердил web и desktop для 390/1024/1280/1440, включая screen share, solo voice, reconnect, fullscreen и screen share + Group Chat: 12 состояний без overflow/runtime errors; отдельный 1280 web/desktop кадр подтвердил новую chrome-геометрию. Это stateless evidence; до полного `Готово` остаются authenticated web/desktop checks, Windows scale 125/150%, keyboard/screen-reader и двухклиентный reconnect/leave/switch production gate |
| 50 | Mini-room geometry and participant controls | Готово в коде · P1 UX | Shared web/desktop mini-room двигается за любую неуправляющую поверхность, включая preview, сохраняет позицию/ширину/высоту, удерживается внутри viewport и меняется с восьми границ/углов pointer-жестом либо стрелками с клавиатуры. Базовое центрирование теперь объединено с пользовательским offset в одном transform и больше не перезаписывается inline `translate`, поэтому dock не уезжает за правый край. Preview имеет отдельную keyboard/tooltip-accessible кнопку открытия полного Room, которая больше не конкурирует с drag gesture. ПКМ, Context Menu и Shift+F10 на удалённом участнике открывают portalled collision-aware меню локальной громкости 0–200%, mute и reset; настройки продолжают применяться и сохраняться существующим LiveKit output controller. Stateless Light/Void visual gate покрывает Mini на 390/1280 px. До полного `Готово` остаются authenticated web/desktop checks, 360/1024/1440, Windows scale 125/150%, touch/trackpad и двухклиентный audio gate |
| 51 | Room compact and minimal states | Готово в коде · P1 UX | Shared web/desktop controller передаёт в dock текущего спикера и локальные capture states. Mini, Compact и Minimal используют одну строгую token-геометрию без старых glass blur, oversized radius и hover-lift. Compact 52 px сохраняет название Room, число участников, speaking/connection state и persistent mic/camera/share indicators с доступными именами; Minimal остаётся одной безопасной компактной поверхностью и не теряет Room, participant count и active-media state. Source/unit, architecture, lint, TypeScript и stateless 390/1280 Light/Void visual gates зелёные. До полного `Готово` остаются authenticated 360/390/1024/1440, Windows scale 125/150%, keyboard/screen-reader и реальный multi-participant speaking/capture visual gate |
| 52 | Saved Messages | Частично · deferred gated UI | Migration 67 применена и зарегистрирована в настроенной Supabase 2026-09-09; Drizzle schema задаёт отдельное owner-only хранилище без фиктивного собеседника, Group membership, unread/presence/notification и social analytics. Browser roles не имеют table grants/RLS policy; весь transport fail-closed закрыт отдельной internal/server capability, protected tRPC идёт через service/data boundary, а list/search/reply/edit/delete/idempotency lookup всегда фильтруются по authenticated owner. Есть стабильная cursor-pagination, полнотекстовый поиск, client UUID retry, проверка private attachment и owner-only track, private hydration и безопасные generic ошибки без телеметрии содержимого. Одна shared web/desktop View переиспользует bubble/composer/attachment/reply, имеет отдельную identity, loading/empty/error/retry/offline-draft, pagination/search/edit/delete и capability-hidden shortcuts в обоих inbox. Create/edit/delete оптимистично обновляют только текущий query cache, подтверждаются server view, откатываются к точному snapshot при ошибке и не очищают draft/attachment до успеха. Source/unit тесты, architecture, lint и web TypeScript зелёные. Capability остаётся выключенной до отдельного продуктового решения после messenger/live IA; нужны desktop native type/build gate, authenticated 360/390/1024/1280/1440 Light/Void evidence, retention/export и mobile app parity |
| 53 | Room-context messages | Частично · P1 core | Сообщения остаются в Group Chat: migration 66 атомарно привязывает immutable Room/LiveSession snapshot в транзакции создания сообщения, выводя Room только из активной same-Group session отправителя. Клиент не передаёт Room ID. Общий read model совместим с ещё не обновлённой БД, разделяет визуальные группы при смене Room и показывает спокойную метку контекста в существующем message bubble без второй ленты. Migration 66 применена и зарегистрирована в настроенной Supabase 2026-09-09. Full Room drawer читает обычную историю выбранной Group/Section без Room/LiveSession-фильтра; выбранный `conversationId` входит в core session presentation context и сохраняется при same-Group Room switch, а серверный Room snapshot остаётся только metadata сообщения. Drawer переиспользует `ChatThreadFrameView`, общий conversation-keyed composer state и тот же tRPC query cache на web и desktop: text/reply/edit/upload/track не теряются при minimize и смене main/drawer, а отправка, редактирование, удаление, реакции и realtime invalidation обновляют обе поверхности. Остаются поиск/навигация к Room-контексту, реальный DB concurrency gate и authenticated web/desktop/mobile evidence |
| 54 | Full Room invitations | Частично · P0 Room | Migration 58 переиспользована как service-role-only session-bound store. Только актуальный участник точной core Room получает privacy- и block-filtered список участников группы и отправляет идемпотентный 15-minute invite под отдельным rate limit. Shared Room sheet web/desktop показывает поиск, loading/empty/error/retry и server-owned pending/accepted/declined/expired/cancelled status; pending invite можно атомарно и идемпотентно отменить только его отправителю из той же активной session. Notification и отдельный noindex authenticated `/room-invites/[inviteId]` preview повторно проверяют exact invitee, root membership, session, group/Room consistency, `roomsScope` и блокировку в обе стороны; заблокированный отправитель, закрытая, завершённая, expired или недоступная Room не раскрываются. Web и desktop используют один preview и общий cross-context confirmation + token/media handoff, а `accepted` сервер разрешает только после фактического join. Copy/share использует server-owned URL. Desktop регистрирует только `voople` protocol, принимает только точный Room-invite UUID без query/fragment, сохраняет последний адрес до завершения auth и открывает тот же preview без auto-accept. Release workflow устанавливает exact NSIS RC и fail-closed проверяет registry command, cold/warm replacement, unsafe query rejection, single-instance restore, renderer continuation и uninstall; provenance обязателен для stable promotion. Недоступный preview позволяет сменить аккаунт без раскрытия причины: web использует валидированный внутренний login redirect, desktop восстанавливает точный pending path только после успешного sign-out, а общий View показывает pending/error/retry. 221 source/unit tests, architecture, lint, web/desktop TypeScript, обе production-сборки и 360/1280 Void/Light visual gate зелёные. Остались реальный CI result installed-app gate, Authenticode certificate evidence, production migration evidence и multi-user authenticated E2E |
| 55 | Direct Room expansion | Планирование · P1 Room | Явный consent и создание group conversation без переноса private DM history; роли, leave/rejoin и audit event |
| 56 | Share to messages | Планирование · P1 | Typed access-aware preview для posts/profiles/events/Rooms/messages, unavailable state, optional comment, multi-recipient и idempotency |
| 57 | Conversation attachments library | Планирование · P1 | Paginated Media/Files/Links/Audio query с membership/section authorization, safe preview/download и responsive states |
| 58 | Message confidentiality programme | Частично · P0 trust | Зафиксированы current-state audit, trusted boundary, threat model, запрет преждевременного E2EE claim, требования к device identity/verification/rotation/recovery, encrypted attachments, groups/Room, moderation и no-downgrade rollout. Кандидаты ограничены audited Signal-style/MLS primitives и LiveKit frame encryption с app-owned key distribution. До реализации нужны protocol/dependency ADR, secure storage на каждой платформе, encrypted envelope pilot, независимый cryptography review и interoperability/compromise gates |
| 59 | Public repository protection | Готово для solo-maintainer · P0 engineering | GitHub ruleset `Protect master` активен: изменения только через PR, обязательны `Verify repository` и full-history `Scan complete Git history`, required conversation resolution, force-push и deletion запрещены. Server-side secret scanning, push protection, Dependabot alerts/security updates и private vulnerability reporting включены; Actions используют pinned commits и least privilege. Обязательное CODEOWNERS approval включать только после появления второго доверенного reviewer, иначе владелец не сможет легитимно одобрить собственный PR |
| 60 | Market validation before scale | Планирование · P0 product | Один beachhead-сегмент и обещание перехода, interviews/concierge pilots, invite activation, connected-group W1/W4, Room joins/WAU и cost per connected group вместо feature-count roadmap |
| 61 | Core rework foundation + Group Now contracts | Частично · P0 architecture | Tracked core plan и публичная инженерная сводка обязательных поправок addendum, ADR, typed feature registry и additive schema дополнены server-owned Group Now read model, service-role-only atomic mutations и fail-closed internal tRPC transport. Root membership/privacy/current-member filters применяются до View; SQL сериализует actor/target Room, различает same-group/cross-context switch и использует session-bound stale-safe leave/heartbeat + grace lifecycle. Legacy enter учитывает новую LiveSession. Transport требует internal channel, `multi_room_groups` capability и user allowlist, валидирует input, rate-limit-ит записи и не пишет private IDs в telemetry. Shared web/desktop Group Now View использует плоские Room sections и полные состояния; controller по умолчанию `enabled=false`. Dynamic join coordinator обслуживает Group Now, Home, actionable Room notifications и protected invite links без второго token/cleanup implementation: explicit cross-context consent, muted join, session-bound token и compensating exact-session leave. Create + join использует один idempotent RPC/request UUID. Read model несёт session metadata/`isMe`, heartbeat привязан к session ID, а VoiceSession adapter переиспользует существующий `ChatRoomControl`; core reconnect/token/leave и нативный screen-audio grant проверяют точную server-owned session, active participant и root membership. Root-group header, Group Info, Home, joined public-group preview, notification и invite-link entrypoints подключены к shared lifecycle. Home live refresh и Room invite reads повторно проверяют session/membership/privacy; legacy Home CTA имеет fail-safe auto-connect без преждевременного `presence_room_joined`. Migrations 58–66 применены и зарегистрированы в настроенной Supabase 2026-09-09; полный readiness подтвердил 25 обязательных checksum, функции privacy gate и replica identity. Installed-app protocol/provenance gate и защищённая смена аккаунта реализованы в коде. Остались authenticated responsive evidence, отдельный изолированный Postgres concurrency gate, Windows RC/Authenticode и old-client/two-client production gate |
| 62 | Room guest entry | Частично · P0 growth/core | Migration 62 отделяет гостя от User/Group membership и хранит только hash invite/access credentials; service-role RPC атомарно проверяет точную active Room, срок, capacity и идемпотентный request UUID. Публичный noindex web entry имеет preview/loading/expired/revoked/full/ended/error/retry, нормализованное имя, muted join, reconnect, heartbeat, explicit leave и stale-presence cutoff. Join API передаёт машинную причину терминального отказа отдельно от локализованного текста; клиент после race с отзывом, истечением, завершением или заполнением Room повторно сверяет preview и показывает точное действие, не разбирая текст ошибки. Повторная проверка доступна только для временно заполненной Room и блокируется offline; остальные терминальные состояния не предлагают бессмысленный retry. Reload больше не вызывает server leave: после preview клиент восстанавливает точную действующую HttpOnly guest session и media connection, не создавая нового гостя; только явный `Выйти` закрывает серверное участие, а закрытый tab исчезает из roster по stale cutoff. Неопределённая ошибка восстановления даёт retry и блокирует дублирующий Join, 401/ended возвращают обычный preview. Offline до join показывается отдельно и блокирует ложную попытку; media retry недоступен без сети. Отказ браузера в микрофоне и отсутствие устройства дают разные понятные причины и повтор включения внутри той же Room surface, без повторного join. HttpOnly same-site cookie не отдаёт access token browser JS; LiveKit grant разрешает subscribe и только microphone publish, гости появляются в Group Now/Room как непрофильные участники. Shared Room invite panel создаёт 15-minute copy/share link только для текущего зарегистрированного участника capability-gated core Room. Migration 62 применена и зарегистрирована 2026-09-09. Migration 68 добавляет privacy-safe, server-authoritative и идемпотентный funnel: new/existing/member preview, join, media-connected, полезное участие с собеседником ≥3 минут и conversion; raw invite/access/user/media IDs в события не попадают. Guest source/unit, architecture, targeted lint и TypeScript зелёные; актуальный source-CSS visual gate покрывает entry, joined Room, conversion, full и expired в 360/1440 Void/Light без overflow и runtime errors, authenticated gate не заявляется. До release остаются применить migration 68, реальный DB RPC/concurrency run, multi-client LiveKit и abuse/expiry evidence; limited Room chat и расширенный anti-abuse остаются отдельными срезами. |
| 63 | Room Guest → account conversion | Готово в коде · P0 growth/core | Migration 63 атомарно связывает ещё действующее гостевое место с точным authenticated User по hash-only HttpOnly credential. Постоянное membership появляется только после явного действия гостя и действующего права автора ссылки `owner/admin` либо открытой политики Group; `request` создаёт обычную модерируемую заявку, закрытая Group остаётся закрытой. Переход через существующие register/login/onboarding и подтверждение email в новой вкладке сохраняет server-validated continuation и не завершает guest credential при навигации; повторный claim идемпотентен и не может перехватить уже связанного гостя. UI имеет converting/signed-out/joined/requested/account-linked/error/retry, mobile wrapping и privacy-safe telemetry `room_guest_joined` → `room_guest_converted`. Migrations 62–63 применены и зарегистрированы 2026-09-09. 215 source/unit tests, architecture, lint, web/desktop TypeScript, production Next/desktop renderer builds и 360/1440 light/void visual gate зелёные; Impeccable detector не нашёл нарушений. До release остаются live email callback и реальный Postgres concurrency/policy run. |
| 64 | User blocking + Room invite gate | Готово в коде · P0 safety/core | Directional `user_blocks` доступна только service role; атомарная mutation запрещает self-block, сериализует пару пользователей, удаляет взаимные follows/contact pins и отменяет pending Room invites. DB triggers fail-closed для новых follows, pins, direct pairs/messages/Room participants и Room invites, а server повторно проверяет direct chat/message/call/media-token и invite send/respond. Presence, Room participants, candidates, previews и рекомендации фильтруют блокировку в обе стороны без раскрытия направления. Shared profile action для web и desktop имеет accessible menu/tooltip, явное подтверждение, pending/error и unblock state; telemetry хранит только итоговое состояние. Migration 64 применена и зарегистрирована 2026-09-09. 219 source/unit tests, architecture, lint, web/desktop TypeScript, production Next/desktop renderer builds и воспроизводимый 360/1440 light/void menu/unblock visual gate зелёные. До release остаются реальный Postgres concurrency run и authenticated in-app responsive/keyboard gate. |
| 65 | Messenger/live IA replacement | В работе · P1 messenger | Decision Memo, IA/UI Spec и Implementation Brief приняты как верхний decision set; source hierarchy, architecture и integration plan синхронизированы. Group открывается в Chat; bounded Shelf держит Lobby первым, показывает 3/2/1 Room по ширине, до трёх avatar tokens, count, live/share/current state, прямое действие и подписанный portalled overflow; пустой Shelf не рендерится. Значимые Shelf labels приведены к контракту 12/16 px, названия Room — к 14/16 px без увеличения заданной высоты. Root Group на wide desktop объединяет identity, `Чат / Войс / Люди` и Lobby action в один 64 px header; пользовательское название live overview уточнено до `Войс`, внутренний id `now` сохранён. `Войс` следует каноническому порядку: реальный summary участников/разговоров и `+ Комната` находятся сверху, Лобби выделено как общий разговор, дополнительные Room сгруппированы под `Комнаты · N`, а люди вне голоса остаются отдельными compact tokens. Действие Лобби различает начало, присоединение, переход и текущую Room; на mobile сохраняет полный accessible label при короткой подписи и укладывает identity, roster и action в компактную строку. Wide messenger следует измерениям IA: sidebar 216 px при 1200+, строки 48 px, identity-avatar 44 px; `Войс` выровнен от начала и ограничен 960 px, `Люди` — 760 px, чтобы рабочие области не плавали по центру пустого экрана. Sections не образуют horizontal scroller: текущий раздел открывает searchable dialog-picker, `+` остаётся в той же 36/44 px toolbar, unread текущего и сумма других видны у адресата, а picker группирует unread без дублей и поддерживает Arrow/Home/End с возвратом focus по Escape. Его служебные заголовки и unread summary используют читаемые 12/16 px и clean grotesk вместо 10 px mono-uppercase. Автоматические «первые две вкладки» заменены отдельным per-user favorites contract: максимум два доступных Section сохраняются сервером и выводятся рядом с selector только при достаточной ширине. Общий web/desktop renderer выводит Group и DM единым ограниченным по ширине левым dense stream: avatar/автор/Room snapshot один раз на 5-minute block, свои помечены `вы` и delivery ticks, replies разрывают блок, а текст больше не получает отдельную bubble-card; вложения, reactions, reply, edit/delete и selection сохранены. Поток использует канонические 1040 px, строка metadata доходит до его правого края, а содержимое сообщения остаётся ограничено 704 px для читаемости. Общая conversation-state surface покрывает initial loading, offline и error; при stale history история и composer не исчезают, retry находится в компактной полосе, а desktop очищает ошибку после успешного background recovery. Full Room теперь portalled точно в общую main area без внешнего Sheet/backdrop/body scroll lock: global sidebar остаётся, отдельная кнопка, Escape и смена web/desktop route сворачивают поверхность без выхода из LiveKit session, существующий Mini становится единственным представлением сессии вне Full. Full и Mini одновременно не рендерятся; fullscreen по-прежнему перекрывает всё content-пространство. P3 использует корректный audience contract: drawer читает обычную выбранную Group/Section без LiveSession-фильтра, а её `conversationId` сохраняется при same-Group Room switch. Drawer переиспользует `ChatThreadFrameView`; main и drawer в web и desktop используют один conversation-keyed composer store и общий tRPC query cache для text/reply/edit/upload/track, отправки, edit/delete/reaction и realtime invalidation. Desktop upload не отзывает preview при временном unmount. Desktop drawer стартует с 360 px, меняется мышью или клавиатурой в пределах 320–480 px и не занимает больше 40% main; ниже 1160 px Room switcher заменяется selector при открытом чате, ниже 1000 px drawer становится overlay и не сжимает media stage, ниже 800 px selector используется и без drawer. Закрытие возвращает focus на trigger. Screen-share subscription удерживает выбранную публикацию и после её завершения поднимает следующую, поэтому одновременный второй stream не перехватывает stage самовольно. Visual harness компилирует актуальный source CSS вместо устаревающего `desktop/dist`, загружает фактические Geist Sans/Mono/Pixel и отдельно фиксирует все `Чат / Войс / Люди`, открытый selector Sections, inline-create и collapsed Shelf в 1280 Void / 390 Light для web и desktop; 24 stateless captures подтверждают текущую геометрию, restrained `VOOPLE`/avatar/counter microtype и отсутствие overflow/runtime errors, но authenticated parity ещё не заявляется. Профильные native-тесты, architecture, targeted lint и web TypeScript зелёные. Web production build снова остановился до компиляции кода на Windows `os error 5` при запуске внутреннего Turbopack Node pool; desktop TypeScript не стартует без отсутствующего локального `vite/client`. Впереди convergence control language и identity glyphs по `voople_ref_rework` и `other_ref1/2`, authenticated web/desktop/mobile evidence и multi-client screen-share gates; затем P4 guest acceptance. |

### Быстрое создание Room — 2026-09-13

Канонические IA-23/24 больше не ведут через обязательную prejoin-форму:
`+ Комната` одним действием запускает идемпотентное создание temporary
`Новая комната` и muted join. Pending и ошибка остаются на исходной поверхности;
повтор использует тот же request ID. Подтверждение появляется только при
защищённом cross-context переходе до фактического создания. Серверный контракт
для pinned Room сохранён для отдельного последующего действия и inline rename.

Web и desktop используют тот же `GroupNowConnectedPanel`; targeted native-тесты
проверяют default draft, атомарную mutation, retry identity, media handoff и
отмену cross-context confirmation без открытия старой формы.

### Проверка authenticated invite preview — 2026-09-04

Пункт 54 остаётся частичным. Web route и desktop router открывают общий
`CoreRoomInvitePreview`, hook и stateless View. Предпросмотр проверяет адресата,
текущее membership и участников именно этой группы; ошибка хранилища не
выдаётся за истёкшее приглашение. Клиент скрывает данные при offline/error,
повторяет чтение по focus/reconnect и каждые 10 секунд в видимом окне.
Истечение срока убирает Room и кнопку входа без перезагрузки страницы.

Локально прошли 195 native Node tests, architecture, lint без ошибок,
web/desktop TypeScript и desktop renderer build. Локальный web build остановился
на разрешении путей Geist в checkout с junction на другом диске. Для кода
`f85cc55` обе production-сборки и остальные проверки прошли в чистом
[Quality gate](https://github.com/GalitskyKK/voople/actions/runs/33874732562);
[secret scan полной истории](https://github.com/GalitskyKK/voople/actions/runs/33874732571)
также прошёл.

`node scripts/verify-room-invite-preview.mjs` после desktop build проверяет
реальные View, hook и notification actions в Chromium: 360/1280 px, Void/Light,
loading, длинные имена, offline/recovery, error/retry, unavailable, expiry,
decline/cancel и keyboard focus. Скриншоты сохраняются в временный каталог,
путь выводится тестом; overflow и ошибок страницы нет. Query и media transport
заменены заглушками: это не authenticated E2E и не проверка нативного WebView.

До приёмки остаются живые DB/multi-user проверки отзыва доступа и приглашения,
block-модель, copy/share и OS deep links. Гостевой вход без аккаунта — отдельный
контракт; эта ссылка не добавляет гостя в группу. Миграции и release flags
в рамках этого среза не менялись.

### Отправка адресной ссылки — 2026-09-04

В списке отправленных приглашений добавлены `Скопировать ссылку` и
`Поделиться`. URL формирует сервер из адреса сайта; origin desktop WebView
не используется. Получатель остаётся прежним: пересылка ссылки не создаёт
приглашение для другого аккаунта. Share payload не содержит имён Room,
группы или участников.

Общий `ShareButton` теперь показывает pending/error/success, допускает retry,
не копирует ссылку после отмены системного меню и очищает таймер при unmount.
Просроченные и отменённые приглашения теряют share-действия; offline/error
скрывает список до проверки. View, clock/network hooks и кнопки общие для
web/desktop.

Локально: 202 native Node tests, architecture, lint без ошибок,
web/desktop TypeScript и desktop build. `node scripts/verify-room-invite-sharing.mjs`
после desktop build проверяет реальные компоненты на 360/1280 px в Void/Light:
copy/pending, share/cancel, clipboard error/retry, offline, expiry, revoked status,
keyboard и overflow. Регрессия `verify-room-invite-preview.mjs` также проходит.
Платформенные API и query заменены заглушками; реальную доставку и WebView
это не подтверждает. Локальный web build упирается в известный cross-drive
font path; чистый CI требуется отдельно.

Интеграция `57b634d` в `dev` прошла
[Quality gate](https://github.com/GalitskyKK/voople/actions/runs/33898866736):
architecture, 202 unit-теста, lint/TypeScript, production web build и desktop
renderer. [Проверка истории на секреты](https://github.com/GalitskyKK/voople/actions/runs/33898866795)
тоже прошла. Это закрывает прежний copy/share gap в пунктах 10, 54 и 61,
но не OS protocol и не реальные двухклиентные проверки.

Пункт 54 остаётся частичным: впереди OS deep links, сохранение приглашения
через вход в аккаунт, block-модель и двухклиентная приёмка. Guest entry не
включён. Миграции, native registration и release flags не менялись.

### Возврат к приглашению после авторизации — 2026-09-04

Web сохраняет `redirect` между login/register, после входа паролем или OTP,
регистрации с сессией и через кнопку входа на экране подтверждения почты.
Onboarding передаёт тот же адрес дальше; если сессия истекла перед открытием
страницы, повторный login сохраняет и onboarding, и вложенный адрес.
Перезагрузка и переходы между формами не требуют browser storage.

Вместо трёх проверок `startsWith` используется один client-safe валидатор:
только внутренний путь, без внешнего origin, обратных слешей, управляющих
символов и закодированных разделителей пути. Некорректный адрес отбрасывается.
Возврат к Room invite открывает существующий protected preview; это не grant,
не принятие приглашения и не автоматическое подключение к медиа.

Проверки: 207 native Node tests, architecture, lint без ошибок, web/desktop
TypeScript и desktop renderer build прошли. Локальный web build остановился
на прежнем cross-drive разрешении шрифтов Geist; результат чистого CI нужен
отдельно. `node scripts/verify-auth-continuation.mjs` проверяет реальные формы,
ссылки и OnboardingFlow на 360/1280 px в Void/Light: keyboard, reload,
password pending/error/retry, OTP, оба ответа регистрации, confirmation → login,
onboarding error/retry, отсутствие redirect и отклонение опасного адреса.
Горизонтального overflow и ошибок страницы нет; сервер и браузер закрываются.

Коммит `a632928` включён в `dev`;
[Quality gate](https://github.com/GalitskyKK/voople/actions/runs/33901771972)
прошёл, включая production web build и desktop renderer.
[Secret scan](https://github.com/GalitskyKK/voople/actions/runs/33901771946) зелёный.

Next navigation и auth/профиль API в probe заменены заглушками: это не проверка
Supabase, реального письма или server-rendered redirect. Проверен возврат через
исходную вкладку регистрации; отдельная вкладка из письма не получает этот
контекст автоматически. Desktop OS deep links, pending invite и guest entry
закрывались последующими P0-срезами и отражены в пунктах 54 и 61–63. В рамках
этого исторического web-среза миграции, release flags и production не менялись.

### Смена аккаунта для Room invite — 2026-09-06

В недоступном authenticated preview добавлено явное действие «Войти в другой
аккаунт». Причина остаётся общей для wrong-account, отозванного, истёкшего,
заблокированного и иного недоступного приглашения: клиент не получает новый
privacy oracle. Общий controller/View владеет pending и безопасным error/retry;
текст ошибки провайдера пользователю не показывается.

Web выполняет sign-out и только после успеха заменяет маршрут на login с тем же
валидированным внутренним invite path. Desktop также сначала завершает sign-out,
затем восстанавливает exact pending path в остающемся смонтированным session
router. При ошибке выхода текущий preview и возможность повтора сохраняются.
Повторный вход снова открывает protected preview и не принимает приглашение
автоматически.

Локально прошли 221 source/unit tests, architecture, lint, web/desktop TypeScript
и обе production-сборки. Расширенный `verify-room-invite-preview.mjs` проверяет
реальный общий компонент на 360/1280 px в Void/Light: pending и error смены
аккаунта, отсутствие horizontal overflow и private error copy, а также прежние
loading/offline/retry/expiry/status/keyboard состояния. Impeccable detector не
нашёл нарушений; скриншоты pending/error просмотрены вручную.

Supabase auth, установленный NSIS protocol, реальный второй аккаунт и повторное
получение invite с сервера в probe заменены контролируемыми boundary mocks. Это
не заменяет authenticated multi-user E2E, Windows RC/Authenticode и production
migration evidence. Миграции и production в этом срезе не применялись.

### Возврат после подтверждения email — 2026-09-06

Web и desktop registration формируют один HTTPS callback `/auth/confirm` и
передают ему только continuation, прошедший `safeAuthContinuation`. Callback
обменивает одноразовый PKCE code, сразу убирает его из адресной строки,
синхронизирует public user, регистрирует доверенное web-устройство и возвращает
нового пользователя в onboarding, а затем в исходный Room invite или guest
conversion. Для уже существующего public user onboarding не повторяется.

Component-local promise не допускает второго обмена кода при повторном запуске
effect в React StrictMode. Если обмен уже прошёл, а синхронизация оборвалась,
retry проверяет сохранённую сессию и продолжает без повторного использования
кода. Missing/expired/cross-browser verifier и network/provider ошибки получают
одинаковую безопасную error surface с retry и входом, который сохраняет invite;
сырой provider error не выводится.

Локально прошли 223 source/unit tests, architecture, lint, web/desktop
TypeScript и обе production-сборки точного коммита. Расширенный
`verify-auth-continuation.mjs` проверяет реальный callback вместе с
login/register/onboarding на 360/1280 px в Void/Light: pending, StrictMode
single exchange, invalid link, private-error suppression, retry, keyboard path,
overflow и возврат к invite. Impeccable detector зелёный, мобильный error и
desktop loading просмотрены вручную.

До release нужны разрешённые в Supabase Auth Redirect URLs адреса
`https://voople.ru/auth/confirm` и preview/dev equivalents, а также живое письмо
в новой вкладке того же браузера. Другой браузер или
устройство не имеют исходного PKCE verifier и штатно переходят в безопасный
login; межустройственное подтверждение требует отдельного server-side OTP
контракта. Миграции и production в этом срезе не менялись.

### Первый messenger-first shell — 2026-09-06

На web и desktop маршруты `/messages` используют один плотный sidebar из
нового core-rework reference: корневые Groups, Direct Messages и Search вместо
старого списка primary-разделов. Secondary-функции не удалены и продолжают
работать через существующие маршруты; их перенос в header/account/context
поверхности остаётся отдельным срезом. Аватары в messenger shell слабо
скруглены, violet обозначает current/focus, green — только подтверждённый
presence.

Desktop получает список чатов через один provider, поэтому sidebar и inbox не
создают два polling/realtime lifecycle. На 1024 px открытый диалог получает
приоритет и скрывает промежуточный список; на mobile остаётся только текущая
conversation. Пустой direct/group/section использует общий web/desktop
`ChatConversationStart`, а не отдельные заглушки платформ.

Локально прошли 12 точечных source/unit tests, architecture, narrow lint,
web/desktop TypeScript и desktop renderer build. Изолированный Chromium gate
проверил 360/1024/1280 px, Void/Light, ширину sidebar 200 px, загрузку assets,
отсутствие horizontal overflow/page errors и responsive priority. Скриншоты
просмотрены вручную. До полного `Готово` остаются server-owned unread/live
индикаторы, activity/inbox в header, перенос shell за пределы `/messages`,
authenticated 390/1440/fullscreen, keyboard/screen-reader и реальные long/error/
offline состояния.

### Group surface и live shelf — 2026-09-06

Корневая Group и её разделы используют одну shared web/desktop поверхность с
режимами `Чат / Сейчас / Люди`. Chat остаётся default; активные Room не
агрегируются в безымянный счётчик, а каждая появляется в компактном shelf с
участниками, screen-share state и прямым join/switch action. Пустые Room shelf
не занимают. Full `Сейчас` сохраняет несколько одновременных разговоров, а
People показывает реальное membership, role, presence и точную активную Room.
Messenger sidebar использует один 15-секундный bounded `home.activeRooms` read,
дедуплицирует участников между Rooms и отдельно показывает live count,
multi-Room count и screen-share state, не смешивая их с unread.

Изолированный visual gate проверяет Chat/Now/People при 1280 px и Chat при
390 px, отсутствие horizontal overflow и runtime errors. Root и desktop
TypeScript, lint без новых предупреждений, architecture и desktop production
build проходят. В этом срезе schema, migration и production state не менялись;
старые Group Info, теги, роли и secondary routes сохранены.

### Персональное непрочитанное — 2026-09-07

Messenger sidebar получил отдельный unread badge для Group и Direct, не
смешанный с зелёным live-marker. Новый `chat_read_cursors` хранит позицию чтения
для каждой пары пользователь–чат, продвигается только вперёд, ограничивается
серверным временем, исключает собственные сообщения и учитывает доступ к
закрытым разделам. Корневая Group агрегирует непрочитанное только из доступных
разделов. Существующий `messages.read_at` пока сохраняется параллельно для
совместимости с выпущенными desktop-клиентами и delivery ticks.

Source-тесты проверяют приватность, монотонность, агрегацию, ограниченный
visible/focused acknowledgement и присутствие migration 65 в release ledger.
Web и desktop используют один `ChatListItem` contract и один badge view;
изолированный visual gate покрывает одновременные unread и live states. Home
ranking использует те же счётчики и определяет reply/mention только среди
сообщений после персонального cursor, включая доступные разделы Group. До
release migration 65 нужно применить перед кодом приложения. Production БД в
этом срезе не менялась.

### Mobile core navigation — 2026-09-07

Authenticated bottom navigation сокращена до четырёх ежедневных направлений:
`Сейчас`, `Чаты`, `Поиск`, `Профиль`. Уведомления больше не занимают отдельный
пятый слот: компактная activity-кнопка со счётчиком находится в mobile topbar,
а на экране списка чатов — в его собственном header, который остаётся видимым,
когда общий topbar скрыт. Events, Store и download убраны из authenticated
topbar; существующие маршруты и функции не удалены. Навигационная капсула имеет
фиксированную доступную ширину, четыре равных touch-target и сохраняет safe-area.

Source-тест фиксирует четыре пункта, отсутствие Notifications в bottom nav и
наличие activity entry в header. До полного статуса остаются authenticated
visual/keyboard/screen-reader gates на 360/390 px и перенос secondary-функций в
контекстные Group/account surfaces без удаления их реализаций.

### Mobile messenger inbox — 2026-09-07

Основной список сообщений больше не требует постоянного переключателя
`Все / Личные / Группы`: в спокойном состоянии он сразу разделён на компактные
секции `Группы` и `Личные сообщения`, как предусмотрено messenger-first
структурой. Scope `Все / Люди / Группы` остаётся доступен только внутри
активного поиска. Строки не дублируют доменную реализацию, а продолжают
использовать общий `ChatListRow`; unread badge вынесен в один компонент для
мобильного inbox и desktop sidebar. Теги, роли, поиск контактов, переходы в
разделы и существующие secondary routes сохранены.

Source-тесты фиксируют секции, отсутствие постоянного фильтра и единый unread
компонент. До полного статуса нужны authenticated visual gates Void/Light на
360/390 px, keyboard/screen-reader проверка активного поиска и реальные
loading/error/offline состояния.

### Group Now room hierarchy — 2026-09-07

Полная поверхность `Сейчас` приблизилась к rework-референсу и каноническому
плану: каждая активная Room стала самостоятельной плоской секцией с названием и
простым счётчиком, участниками, live/screen-share сигналом и явным действием
входа или перехода. На узкой ширине те же данные перестраиваются в две колонки
без отдельной мобильной реализации. Создание Room остаётся внутри списка комнат
как обычная компактная строка без пунктирной карточки. Поведение
join/switch/current, server read model и прежние Group Chat/People/Info
возможности не менялись и не удалялись.

Source-тест фиксирует плоский room-section contract, простой счётчик и
participant variant. Visual gate покрывает `Сейчас` на 390 и 1280 px без
overflow/runtime errors. До полного статуса остаются настоящие аватары/длинные
имена, loading/offline/error visual states и authenticated web/desktop parity.

### Full Room visual hierarchy — 2026-09-07

Общая web/desktop-поверхность активной Room получила близкий к rework-референсу
каркас: демонстрация остаётся доминирующей, участники собраны во вторичную
полосу, toolbar режима и header/footer используют тонкие разделители и малый
радиус без декоративных теней. Active speaker обозначается границей, а не
светящимся halo. На мобильной ширине идентификатор Room и действия разнесены по
строкам, поэтому название не конкурирует с управлением и функции не скрываются.
Поверхность больше не является внешней модалкой: она портируется в main area
общего shell, заменяет текущий route content и оставляет один global sidebar.
Кнопка сворачивания, Escape и смена маршрута переводят ту же живую session в
Mini без вызова leave; пока открыт Full, Mini скрыт. Только настоящий fullscreen
перекрывает всю content-область. Настройки, приглашения и soundboard пока остаются
вторичными modal sheets и будут пересобраны отдельными bounded slices.
Открываемый из Full Room чат больше не является session-only лентой: он читает
обычную историю выбранной Group/Section. Выбор Section сохраняется при переходе
между Room той же Group. Drawer уже использует общий `ChatThreadFrameView`,
draft/read-attention contract и conversation-key; text draft синхронно
сохраняется при minimize/unmount, а явное открытие чата — при minimize той же
session. Desktop drawer начинает с 360 px и изменяется мышью либо клавиатурой в
пределах 320–480 px, не превышая 40% main. При доступной ширине main меньше
1160 px открытый drawer заменяет Room switcher компактным selector; ниже 1000 px
drawer перекрывает stage, а не сжимает демонстрацию, и оставляет доступным нижний
ряд media controls. Ниже 800 px selector используется даже с закрытым drawer.
Закрытие панели возвращает focus к её trigger. Main conversation и drawer в
web и desktop используют один conversation-keyed composer store: text, reply,
edit и готовый upload не сбрасываются при minimize или переходе
между поверхностями. Drawer передаёт серверу `replyToMessageId` и поддерживает
общие edit/delete/reaction/image-preview действия. Source/unit, TypeScript,
targeted lint и architecture gates зелёные; authenticated визуальная проверка
этих порогов не заявляется. Desktop main и drawer теперь читают и мутируют один
аутентифицированный tRPC/React Query cache; desktop realtime только инвалидирует
этот cache и больше не поддерживает вторую локальную копию переписки. Desktop
composer использует тот же conversation-keyed track и общий выбор из плейлиста.
Server-owned Room directory теперь образует switcher слева на desktop и
горизонтальную полосу на mobile: текущая Room, live/share/free states и refresh
берутся из `coreGroupNow`, а переход переиспользует существующие cross-context
confirmation и media handoff вместо локальной подмены active Room.
Пока handoff не завершён, общий stage закрывается спокойным непрозрачным
switch-state с названием целевой Room; header, footer и вся геометрия остаются
на месте, а `aria-live` сообщает переход без повторного dialog announcement.
Одновременная вторая screen publication больше не заменяет выбранную без
действия пользователя: подписка и stage удерживают первый focus, а после
завершения active publication детерминированно продвигают следующую вместе с её
screen audio. Это подтверждено source/unit policy; UI выбора между несколькими
streams и реальный multi-client visual gate остаются незакрытыми.

Source-тесты фиксируют общий каркас, доступные действия, operation-specific
ошибки, reconnect live-status без потери stage, voice-only grid, solo-поверхность
без старого gradient/oversized radius, отсутствие speaker glow, server directory
и confirmation coordinator. Stateless visual gate покрывает screen-share,
voice-only, solo, loading, reconnecting, switching, error, post-leave и fullscreen на 390,
1024, 1280 и 1440 px в Light/Void без overflow/runtime errors. До полного статуса остаются
authenticated multi-Room handoff и multi-participant media, Windows scale
125/150%, keyboard/screen-reader и реальный двухклиентный reconnect/leave gate.

### Mini Room visual hierarchy — 2026-09-08

Mini, Compact и Minimal Room используют одну плотную геометрию rework-слоя:
непрозрачную token-surface, малый радиус и спокойную floating-тень без glass
blur, hover-lift и декоративного halo. Media preview остаётся главным содержимым
Mini Room, а controls сохраняют доступные имена и не конкурируют с drag-area.
Исправлено базовое позиционирование: центрирование и пользовательский offset
теперь объединяются одним transform, поэтому inline style не отправляет dock за
правый край на узком viewport.

Source/unit gate сохраняет восемь resize-направлений, keyboard resize,
drag-suppression, full-room action и media-state contracts. Отдельный stateless
visual gate покрывает Mini, Compact и Minimal с voice/screen-share на 390 и
1280 px в Light/Void без overflow/runtime errors. До полного статуса остаются
authenticated web/desktop проверки, 360/1024/1440, Windows scale 125/150%,
touch/trackpad, keyboard/screen-reader и двухклиентный media gate.

### Group People presence hierarchy — 2026-09-07

Group `Люди` теперь разделяет один server-owned member list на три понятные
секции: `Сейчас`, `Онлайн` и `Не в сети`. Участник активной Room показывает её
название, обычный online остаётся отдельным состоянием, а роль и username
сохранены в каждой строке. Сортировка и профильное действие используют прежний
контракт; дополнительных запросов и отдельной desktop/mobile реализации нет.

Source-тест фиксирует все три состояния. Visual fixture содержит live, online и
offline участников и проверяет доступные имена секций. До полного статуса нужны
authenticated проверки длинных локализованных имён, guest/member moderation
actions и mobile full-screen profile transition.

### Messenger visual language — 2026-09-07

Group Chat/Now/People получили общий для web и desktop визуальный каркас из
rework-референса: усиленную uppercase-идентичность группы, центрированные
режимы Group, линейное выделение разделов и почти
прямоугольные message/composer surfaces без декоративного glow. Это не новая
параллельная тема: слой ограничен messenger-маршрутом и использует существующие
theme/group tokens. Mobile сохраняет те же данные и порядок действий, но
оставляет более крупные touch-target и мягче скругляет интерактивные controls.
Теги, роли, Group Info и остальные отложенные функции не удалялись.

Фирменный microtype теперь следует direction contract без пиксельного шума:
встроенный Geist Pixel Square применяется только к `VOOPLE` wordmark,
инициалам fallback-avatar и компактным counters. Основной текст, навигация и
пользовательские названия остаются в Geist Sans, metadata — в Geist Mono.
Fallback-avatar больше не использует фиолетовый gradient: это плоский
слабоокрашенный identity token с тонкой границей. Один и тот же локальный font
asset загружается Next и desktop renderer без внешнего запроса.

Source-тест фиксирует одинаковые маркеры Group header в web/desktop и единые
sections/composer contracts. Изолированный visual gate рендерит реальные shared
Header, Tabs, Sections и Composer вместе с Chat/Now/People; 1280 px проверяется
в Void, 390 px — в Light, включая новый wordmark/avatar/counter microtype,
overflow и runtime errors. До полного
визуального соответствия остаются активная Room, профиль/настройки и
authenticated captures на 360/1024/1440 px с реальным пользовательским
контентом.

Live Shelf теперь вручную сворачивается в компактную доступную строку: около
32 px на desktop и 44 px на touch, с краткой сводкой Rooms. Настройка хранится
по Group на текущем устройстве; обновление комнат не раскрывает Shelf
самовольно, а прямые действия возвращаются после раскрытия. Актуальный visual
gate содержит 24 web/desktop кадра, включая collapsed-state и inline-create на 1280 px Void и
390 px Light; overflow и runtime errors отсутствуют.

Создание Section перенесено из отдельного Sheet в тот же searchable selector:
toolbar сохраняет компактный `+`, click сразу открывает inline-поле, Enter
создаёт, Escape отменяет только ввод. Ошибка остаётся рядом с полем. Выбор
иконки и restricted-доступ не удалены, а раскрываются как вторичные настройки
внутри того же popover. Web и desktop используют один View и
свои transport-adapters; source/type/lint gates подтверждают паритет, а текущая
24-кадровая матрица — отсутствие регрессии геометрии selector.

До двух избранных Section теперь являются реальной per-user настройкой, а не
автоматическими «первыми вкладками». Отдельная star-action не переключает
текущий раздел; сохранённые ярлыки выводятся рядом с selector только там, где
хватает места. Migration 69 ограничивает два слота на Group, проверяет обычное
и restricted membership внутри Postgres, сериализует одновременные изменения,
удаляет запись при выходе из Group и освобождает слоты, если доступ к закрытому
Section отозван. Browser-роли не получают прямого доступа к таблице/RPC;
web/desktop используют защищённую rate-limited mutation и один shared View,
а настройка включена в account export. Три новых contract-теста, TypeScript,
lint и architecture зелёные; 24 stateless web/desktop captures на 390/1280 px
подтвердили ярлыки без overflow/runtime errors. До выпуска migration 69 нужно
применить и зарегистрировать, затем проверить authenticated keyboard/error
states на реальных данных.

### Room-context message read model — 2026-09-08

История Group Chat совместимо читает immutable snapshot из
`message_room_contexts`; отсутствие ещё не применённой таблицы не ломает старый
клиент. Контекст не выдаёт доступ к сообщению и появляется только после
существующей проверки conversation/section membership. Сообщения разных Room
или LiveSession больше не объединяются в одну визуальную группу, а общий
web/desktop bubble показывает одну спокойную строку `Из комнаты <название>` без
второй карточки или отдельной timeline.

Прошли 250 source/unit tests, architecture, lint, web/desktop TypeScript и
desktop renderer production build. Stateless visual gate реальных shared
Messenger-компонентов прошёл на 390 px Light и 1280 px Void для Chat/Now/People:
метка длинной Room не создаёт overflow или runtime errors. Migration 66
добавляет транзакционный trigger: контекст выводится из активного участника и
точной same-Group LiveSession, а клиент не может подставить Room ID. Исторически
core Room открывал точный LiveSession-фильтр Group-истории. Новый IA contract
отменяет это presentation-решение: contextual drawer показывает обычный
выбранный Group/Section Chat и использует тот же cache, draft, read cursor и
optimistic reconciliation, что main conversation. Room snapshot остаётся
метаданными сообщения. Остаются общая composition, authenticated/mobile states,
реальный DB concurrency gate и production evidence.

Панель Room-сообщений дополнительно прошла изолированный visual gate на 390 px
Light и 1280 px Void с реальными `RoomMessagesPanel`, message bubbles и composer:
на мобильном она остаётся частью того же окна и безопасно перекрывает сцену, на
desktop занимает контекстную правую колонку; overflow и runtime errors нет.

Прежний однострочный горизонтально прокручиваемый live shelf принят только как
временный этап. Целевой Shelf bounded: до трёх room cells с 2–3 avatar tokens,
count, live/share state, прямым Join и подписанным overflow; пустой контейнер не
рендерится, а mobile показывает одну Room и overflow без horizontal scroll.

`ChatWindow` возвращён в обычный component budget: delete, optimistic reaction,
playlist confirmation и lifecycle уведомлений теперь принадлежат одному
доменному hook. Таймер уведомления очищается при размонтировании, а общий web/
desktop Chat View и поведение сообщений не менялись. Architecture baseline для
`ChatWindow` удалён и защищён отдельным source contract.

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
