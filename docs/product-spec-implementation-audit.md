# Voople Product Spec — implementation audit

Канонический оперативный статус и привязка к референсным бордам ведутся в
[`product-delivery-matrix.md`](./product-delivery-matrix.md). Этот аудит даёт
укрупнённую оценку `VOOPLE_PROJECT_SPEC`; матрица дополнительно покрывает
`VOOPLE_FINAL_PRODUCT_SOCIAL_UX_IMPLEMENTATION_PLAN` и запрещает считать готовым
только созданный маршрут, SQL, skeleton или частично похожий экран.

Статус впервые зафиксирован после `desktop-v0.1.23` и обновляется по рабочему
дереву. Это не список
обещаний и не оценка по внешнему сходству. Пункт считается `готов`, только если
есть данные/контракт, серверная авторизация, общий web/desktop UI, системные
состояния и проверка. До этого используется `частично` или `нет`.

Обозначения: `готов` — подтверждено кодом и проверкой; `частично` — есть рабочая
часть, но отсутствует часть контракта/платформ/состояний/тестов; `нет` — продуктовый
контракт не реализован.

## 1. Продуктовая модель

- Core loop «Сейчас → чат → комната»: `частично`. Главная, чат и комнаты есть,
  но ranking/закрепления и некоторые одношаговые переходы не завершены.
- Текст/voice/video/share/group/sections/roles/events/community identity:
  `частично`; базовые вертикали существуют, качество и parity ещё проходят аудит.
- Приоритет core-функций над лентой/магазином: `частично`; IA изменена, но Home и
  rooms ещё не имеют полного продуктового качества.

## 2. Бренд и позиционирование

- Формулы «Свои рядом», «Мессенджер для своих», «Переписка, голос и экран — один
  разговор»: `частично`; brand assets и часть copy применены, тексты всех public
  surfaces ещё не сверены.
- Тон интерфейса: `частично`; требуется полный copy review, особенно errors,
  boosts и release notes.

## 3. Информационная архитектура

- Главная/Чаты/Поиск/Уведомления/События/Профиль/Магазин: `готов` по маршрутам.
- Настройки/Помощь/Выход только в account area: `частично`; sidebar всё ещё
  содержит footer actions, что расходится с формулировкой spec.
- Sidebar 210–220 / 68–76, ручное сворачивание и сохранение: `готов`.
- Автовыбор expanded >=1440 и compact на узком desktop: `частично`; ручное
  предпочтение есть, правило начального выбора требует отдельной проверки.
- Mobile bottom navigation: `готов` по компоненту, визуальный/E2E gate предстоит.

## 4. Главная

- Заголовок → Сейчас → tabs → feed → wide right rail: `готов` по композиции web и
  desktop на общем `HomeOverviewPanelsView`.
- «Сейчас» 5/3–4/mobile scroll: `частично`; responsive layout есть, средний лимит
  и карточки требуют visual gate.
- Типы online/game/music/room: `частично`; server-filtered online, listening и
  active room используют общий web/desktop контракт. Candidate pool включает
  accepted DM и людей из общих групп без создания чата до клика; game activity
  отсутствует.
- Actions Написать/Позвать/Зайти: `частично`; message/join есть, invite/call action
  покрыт не везде.
- Ranking по live/frequency/recency/room/pin: `частично`; точные rule-based веса,
  relationship score и time decay подключены к Home, но candidate pool и все
  downstream recommendations ещё неполны.
- До 3 закреплённых контактов: `частично`; server-only slots, toggle в
  mini-profile и Home ranking реализованы, migration 55 и visual E2E ожидаются.
- Right rail identity/Продолжить/Ваши сообщества: `готов` по композиции; unread,
  reply/mention, recent/reciprocal ranking, локальные account/device drafts,
  recently-opened signal и active-Room dedup подключены. Visual parity,
  multi-session UX и end-to-end data gate остаются `частично`.
- Feed text/image/gallery/link/poll/status: `частично`; text/media/gallery/status
  есть, полноценные poll и link-card не подтверждены.

## 5. Чаты

- Desktop 3-column global nav/list/conversation: `готов` по shell.
- Chat list search/filters/pinned/unread/mute/typing/room/time/preview: `частично`;
  search/filters/unread/time/preview есть, pin/mute/typing/room требуют полного
  контракта и parity.
- Group header identity/member count/search/members/info/menu/sections/room CTA:
  `частично`; web и desktop используют общий members/info drawer и identity
  visuals, но поиск по сообщениям и wide members rail ещё не завершены.
- Members right drawer с room/online/roles/status/actions: `частично`; shared
  drawer теперь общий для web/desktop и содержит «Сейчас/Онлайн/Все/Роли», live
  room state и role counts; статусы, расширенные actions и постоянный wide rail
  ещё не завершены.
- Group Info banner/avatar/description/count/room/sections/invite/roles: `частично`;
  общий web/desktop drawer получил live Room CTA, topics,
  sections, invite/settings и четырьмя member filters; social proof и visual E2E
  ещё не закрыты.
- Unified composer attachment/input/emoji/voice/send и states reply/edit/upload/
  disabled/error: `частично`; message bubble, attachment, context menu и composer
  input теперь общие для web/desktop. Upload/preview controllers пока разные, а
  playlist attachment недоступен в desktop.

## 6. Комнаты

- Full/Screen Share/Empty/Mini/Compact/Minimal: `частично`; все UI states имеют
  компоненты, но unified state-machine, visual reference и tests ещё не закрыты.
- Adaptive grid/active speaker/media/settings/leave: `частично`.
- Повторяющиеся group Room start/end events агрегируются по дню в одну тихую
  строку с суммарной длительностью; direct-call события остаются отдельными.
- Screen share primary + filmstrip: `частично`.
- One-user invite suggestions: `частично`; empty copy есть, релевантные участники
  не подтверждены.
- Persistent active-media indicator: `готов` по `VoiceSessionDock`, E2E предстоит.
- Reconnect/lease/soak: `частично`; recovery существует, 8/24h soak не выполнен.
- Web share audio: `частично`; Voople напрямую запрашивает и публикует отдельный
  audio track для вкладки, окна приложения или экрана, включая Chromium hints
  `windowAudio/systemAudio`. Исправлена гонка поздней подписки. Фактическая
  доступность всё равно зависит от browser/OS picker; cross-browser E2E не закрыт.
- Desktop capture/audio: `частично`; один общий picker получает реальные окна и
  экраны через Tauri, а auxiliary LiveKit publisher отправляет native video и
  audio в одном stream. Для окна используется WASAPI include-process-tree, для
  всего экрана — системный loopback с исключением дерева Voople. TypeScript,
  default Rust и production renderer gates проходят; feature-сборку и реальное
  двухклиентное прослушивание ещё должен подтвердить Windows CI/E2E.

## 7. Профили и identity

- Portable avatar/frame/badge/effect/presence: `частично`; canonical visuals есть,
  но mini-profile и все surfaces ещё сверяются.
- Full profile banner/frame/background/decorations/badges/effects: `готов` по
  shared profile view, visual parity gate предстоит.
- Content identity without changing body: `частично`.
- Community identity avatar/banner/accent/background/roles/emoji/sounds:
  `частично`.
- Cosmetics preserve layout/controls/contrast/hit targets: `частично`; требуется
  snapshot/a11y matrix.
- Profile status/mood/music/bio/follows/communities/posts-media-replies:
  `частично`; основная структура есть, community aggregation неполна.
- Mini Profile full identity/presence/activity/shared communities/actions:
  `частично`; базовый popover, interests и pin action общие, shared communities,
  relationship reasons и invite action не завершены.
- Privacy scopes для online/music/rooms/invites/requests/recommendations/interests:
  `частично`; общий settings View и server-filtered online/profile music/interests
  готовы, остальные enforcement-точки и migration 54 ожидаются.

## 8. Сообщества

- Banner on Group Info/invite/public/search/Home/settings/store preview:
  `частично`; data asset есть, все surfaces ещё не используют его.
- Banner separate from daily chat background: `частично`; поля разделены, полный
  editor/store flow не завершён.
- Full settings screen with 9 sections: `частично`; навигация/sections существуют,
  часть flows остаётся sheet-like и web/desktop composition отличается.
- Rename group: `частично`; защищённый server mutation и общий editor добавлены,
  миграция 48 применена. Не завершены visual/E2E parity и полный settings flow.

## 9. Бусты

- Progress + allocation points: `частично`; реальный выбор perks, capacity,
  active/suspended state и сохранение конфигурации реализованы, migration 51
  применена. Не подтверждены production rehearsal и полный UI/E2E gate.
- Milestones 1/3/6/12/24: `готов` по calculation.
- Perk costs/classes: `частично`; единый catalog и allocation реализованы,
  требуется продуктовая проверка при истечении grace.
- Base avatar/banner/sections/roles/invite/voice/moderation without Boost:
  `частично`; banner/accent/tag/permanent random invite и migration 48 готовы,
  но все surfaces и permissions ещё не прошли общий visual/E2E gate.
- Loss/grace/suspended while preserving config: `частично`; автоматическое
  suspension без удаления выбора реализовано в TypeScript и SQL, production
  rehearsal ещё не выполнена.

## 10. Voople+, Voops и Store

- Single Plus value across communication/identity/economy: `частично`; offer и
  subscription существуют, benefits/copy требуют сверки.
- Base messages/voice/group participation not paywalled: `готов` по contracts.
- One Voops currency and intended categories: `частично`; wallet/purchases есть,
  все categories/content не заполнены.
- Store categories + context preview: `частично`; detail sheet/preview есть,
  отдельные contexts и board-6 visual quality не закрыты.
- Gift choose item/recipient/message/pay/gift card: `частично`; purchase dialog
  есть, delivery card in chat/profile не подтверждена.

## 11. Поиск, уведомления, события

- Search tabs and default/recent/results/filters/no-results/loading: `частично`;
  tabs/highlights/results/loading есть, recent/filters и wide layout неполны.
- Notification categories and live-room notification: `частично`; базовые
  notifications есть, полный category model/live CTA не подтверждён.
- Events retained and usage tracked: `частично`; route exists, `events_opened`
  contract added in working tree but call/metric review ещё не завершены.

## 12. Mobile

- Bottom nav 4 items + profile/more entry: `частично`; bottom nav есть, separate
  More/profile flow требует проверки.
- Chat List → Conversation → sheets: `готов` по composition, mobile E2E pending.
- Full/mini/compact/minimal room: `частично`; responsive states есть, touch/safe
  area/active-media test matrix не закрыта.

## 13. Analytics

- Общий typed event catalog: `частично`; полный список spec, privacy allowlist и
  client/server sinks добавлены, coverage каждой UI-точки ещё сверяется.
- Durable privacy-safe storage: `частично`; migration 49, pseudonymous actor key,
  server-authoritative sink и агрегирующие SQL views добавлены, миграция
  применена. Coverage событий и production data validation не завершены.
- Acquisition: `частично`; signup/invite events подключены, friend_invited нет.
- Home/Presence: `частично`; open/seen/click/message/join подключены на shared Home.
- Chats: `частично`; open/send/reply/attachment/reaction подключаются web/desktop.
- Rooms: `частично`; reconnect operational events были, обязательные lifecycle,
  state transition и duration events ещё не все подключены.
- Communities: `частично`; create/join/section/appearance/emoji/sound/boost/perk
  events подключены, custom role creation в продукте отсутствует.
- Identity: `частично`; profile/mini/cosmetic hooks подключены, shared-community и
  все secondary surfaces ещё не закрыты.
- Economy: `частично`; store/item/checkout/purchase/gift/Plus events есть, purchase
  и gift подтверждаются server-side fulfillment.
- D1/D7/D30, activation, connected users/groups, payer/ARPPU/cost: `частично`;
  actor-aware retention/activation/daily views добавлены. Внешние acquisition и
  инфраструктурные costs пока не загружаются, поэтому CAC/cost incomplete.
- Activation within 24h (reply received OR room with another person): `частично`;
  server activation facts для reply recipient и комнаты добавлены, migration 49
  применена. Дополнительное требование про комнату не менее 2 минут пока не
  соблюдается полностью и требует корректировки правила агрегации.

## 14. Growth и маркетинг

- Initial segment/ad scenario: продуктовая/маркетинговая задача, не code-complete.
- Invite preview banner/avatar/name/member/room/privacy/CTA: `частично`; identity и
  CTA есть, live aggregate/privacy ещё добавляются.
- Referral on activated user + rewards: `нет`.

## 15. Brand assets

- Standalone logo at icon sizes/app/monochrome/wordmark: `частично`; generated
  web/Tauri icon set есть, monochrome and pixel visual gate pending.
- Mascot as secondary asset only: `нет` (допустимо; не acceptance blocker).

## 16. Реализация по этапам

- Phase 1 Foundation: `частично`; tokens/navigation/naming/basic entitlements есть,
  analytics/allocation/feature flags неполны.
- Phase 2 Shell + Home: `частично`.
- Phase 3 Messaging: `частично`.
- Phase 4 Rooms: `частично`.
- Phase 5 Identity: `частично`.
- Phase 6 Community Settings + Boosts: `частично`.
- Phase 7 Money: `частично`.
- Phase 8 Discovery & states: `частично`.
- Phase 9 Mobile: `частично`.

## 17. Acceptance criteria

Ни один из десяти acceptance criteria пока не отмечается полностью принятым до
visual/E2E parity gate. Наиболее близки: chat without default fourth column,
persistent room access, stable customizable profile structure, separate banner/
chat background, one Plus/Boost/Voops model. Analytics criterion №8 не выполнен.

## 18. Freeze

Новые крупные verticals не добавляются. Текущая работа ограничена core loop,
  identity/community, economy, analytics, reliability и web/desktop/mobile parity.
