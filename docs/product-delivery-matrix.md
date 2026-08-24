# Voople product delivery matrix

Обновлено: 2026-08-24. Матрица — обязательный рабочий gate, а не декларация о
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
| 1 — Shell + Home | Компактный «Сейчас», feed в первом meaningful viewport, sticky right rail, expanded/compact/mobile shell | Общая композиция есть | Общая view подключена через adapter | Нужны snapshots 360/390/1024/1440, sticky и empty/live states | Частично |
| 2 — Messaging | `Nav → Chat List → Conversation`, drawers по запросу, единые header/composer/menus/Room CTA | Основной flow есть | Часть presentation общая, controllers ещё расходятся | Нужны parity snapshots, keyboard/context menu/upload states | Частично |
| 3 — Room | Full, Share, Empty, Mini, Compact, Minimal, mobile как одна state machine | Состояния существуют | Native adapters и общий view есть частично | Нужны двухклиентные media tests, reconnect/soak и все visual states | Частично |
| 4 — Identity | Реальный двухколоночный профиль + все cosmetics на каждой portable surface | Shared profile view есть | Shared profile view подключён | Mini-profile social context и полная surface matrix не закрыты | Частично |
| 5 — Settings + Boosts | Полноэкранные настройки с локальным nav, identity preview, perks/allocation/capacity | Секции и данные есть | Composition ещё не везде едина | Нужны reference snapshots, grace/expiry E2E и removal старых sheets | Частично |
| 6 — Discovery + Money + States | Wide Search/Notifications/Events, полноценные Store/detail/gift/Plus и системные состояния | Вертикали существуют | Часть использует общие views | Wide/mobile/reference/state matrix не закрыта | Частично |

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
| 13 | Public community page | Частично | Preview-first flow, privacy/join states и active Room surface |
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
| 23 | Social context в Mini Profile | Частично | Shared communities, relationship reason, room actions; cosmetics уже общие |
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
| 38 | Screen Share source preview polish | Частично | Desktop thumbnails/selected preview/quality/audio state; web post-selection track preview |

## Cross-platform architecture gate

- Канонические view-models и stateless views живут в `src/types`, `src/lib`,
  `src/hooks` и `src/components`.
- Web adapters владеют Next/tRPC/server boundaries. Desktop adapters владеют
  Tauri/auth/navigation/native capabilities.
- `desktop/src` не должен повторять profile, post, chat, Home, Search, settings
  или store markup. Остаток известных переносимых desktop-дублей контролирует
  `.architecture-baseline.json`; значение разрешено только уменьшать.
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
