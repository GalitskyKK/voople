# Voople: implementation brief для messenger/live IA

## Результат

Реализовать IA из [VOOPLE_IA_UI_SPEC.md](./VOOPLE_IA_UI_SPEC.md): обычная переписка по умолчанию, bounded Live Shelf, Full Room в основной области приложения, один общий Group Chat в drawer и непрерывная сессия при навигации через Mini Room.

Этот brief предназначен для следующей задачи реализации. Сам файл не является командой немедленно менять приложение, базу, ветки или выпуск. Решения по hook находятся в [VOOPLE_PRODUCT_DECISION_MEMO.md](./VOOPLE_PRODUCT_DECISION_MEMO.md). Они не добавляют новые обязательные функции в P0–P3.

## 1. Продуктовый контракт

- Одна Group соответствует постоянной компании. Group Chat и необязательные Sections сохраняют историю.
- Room — live placement. Lobby/pinned/temporary lifecycle остаётся существующим.
- Лобби — постоянный общий разговор группы, визуально отдельно от дополнительных комнат; подробный контракт в §9 IA spec. Group остаётся общим хабом без новой Hub-сущности. Обычное открытие группы не подключает к звуку; явный общий voice action ведёт прямо в Лобби, конкретный Room Join — прямо к своей цели.
- LiveSession — authoritative сессия. DM-call не получает фиктивную Group Room.
- Message принадлежит ровно одному DM/root Group/Section. Room snapshot — metadata.
- Обычный вход в Group → Chat. Live badge → Войс. Чат/Войс/Люди взаимоисключающие; внутренний id `now` не переименовывается.
- Join → Full Room в main content area. Global sidebar остаётся доступным.
- Chat drawer → тот же выбранный Section Group Chat без implicit room/session filter.
- Открытие DM, другой Group, Search/Profile → Mini той же session. Это не новый join/switch.
- Switch внутри actual active Group без confirmation; между voice contexts — с confirmation.
- Guest scope ограничен одной LiveSession; guest не видит Group Chat и не становится member при signup автоматически.

Сквозной interaction contract — §1 IA spec: ordinary actions сразу, короткий ввод inline, небольшие selectors/invites в одном popover, большие формы/settings в main route. Не заменять лишние modal лишними drawers. Join, temporary create-and-join, same-group switch, mute и self-leave — одно осознанное действие при готовых разрешениях. Никакого обязательного prejoin wizard или повторного Join после platform permission.

`+ Комната` создаёт temporary Room и входит в неё существующей атомарной операцией с одним request ID. Default name «Новая комната» проходит действующие правила имён; optional rename — inline уже в Full Room. Type/icon/privacy/capacity не требуют заполнения до входа. Pin — отдельное действие после создания при наличии права. Cross-context confirmation выполняется до mutation; cancel не создаёт Room. Platform permission/source picker и подтверждения destructive consequences допустимы, но не оборачиваются дополнительными product dialogs.

Лобби занимает отдельный компактный блок в Сейчас и постоянную первую позицию над разделителем локального switcher. Пустое Лобби не создаёт Chat Shelf. При скрытом switcher дополнительная Room имеет прямое действие `В Лобби` в header, включая 360 px. Оно выполняет same-group switch; self-leave прекращает участие и не отправляет в Лобби. `Комнаты · N` исключает Lobby; `N разговоров` включает занятое Lobby; голосовой roster не заполняется online/member presence. Использовать существующие Room/LiveSession contracts; permanent Lobby не означает permanent media session. Закрытие комнаты, kick, refresh и guest invite не создают автоматический вход в Лобби.

Запрещённые интерпретации brief: полноэкранный Room modal вместо main; отдельная room-owned история; второй global sidebar; permanent Chat + People + Room одновременно; десятки горизонтальных sections tabs; новый media provider для drawer/Mini; скрытый auto-join по route/hover; client-only authorization.

## 2. Что в репозитории уже есть

Срез анализа: `53b7456`, `feat/core-rework-live-layer`. Перед началом реализации повторно проверить HEAD, uncommitted changes и вложенные AGENTS. Текущие пути — карта переиспользования, не обещание неизменности кода.

| Область | Existing | Изменение |
| --- | --- | --- |
| Messenger navigation | `src/components/layout/MessengerSidebar*.tsx` | Сохранить один shared sidebar; добавить явные live/unread/focus semantics |
| Group views | `GroupSurfaceShell`, `GroupSurfaceTabs` | Сохранить chat default и exclusive views; согласовать wide header |
| Live Shelf | `GroupLiveShelfView` | Chips/скрытый horizontal scroll заменить room cells + avatars + overflow |
| Sections | `ChatSectionsBarView` | Current dropdown + до двух pinned shortcuts; searchable list |
| Stream | `ChatMessageBubble`, `ChatMessageBubbleVisual`, content/reactions/uploads | Refactor presentation в dense stream, сохраняя все действия и одну реализацию |
| Сейчас/Люди | `GroupNowPanelView`, `GroupNowRoomSection`, `GroupPeoplePanelView` | Compact hierarchy; не повторять participant tree в switcher |
| Full Room | `voice/VoiceRoomSheet` | Извлечь Main-area View из Sheet; invites/device menus — popovers, большие settings — main route; без modal chain |
| Session runtime | `VoiceSessionProvider`, `useVoiceRoomRuntime`, server/media adapters | Сохранить владельца сессии; navigation не размонтирует provider |
| Room chat panel | `voice/RoomMessagesPanel` | Удалить implicit `liveSessionId` filter и отдельный draft controller через переиспользование conversation surface |
| Mini | `VoiceSessionDock`, compact/minimal Views, geometry hooks | Один runtime, reserved safe zone, всегда видимые mic/share states |
| Guests | `RoomGuestPage`, guest session/conversion APIs | Сохранить узкий доступ, complete failure/retry/conversion flow |
| Desktop | Shared Views + `desktop/src/adapters/DesktopChatThreadAdapter.tsx` | Adapter-only navigation/auth/media distinctions, без параллельного JSX |

Архитектура уже сохраняет root Group ID в `chats` и Sections в child `chats`. Не создавать новую Group table без отдельного ADR. Не удалять legacy tables до существующих compatibility/rollout gates. Новую IA выпускать через существующий capability registry и server exposure gates.

## 3. Порядок срезов

### Slice 0 — согласовать source of truth

При начале принятой реализации обновить core architecture и integration plan точечными ссылками на решения §3 IA spec. Убрать конфликтующие default Сейчас, modal default, room-filtered Chat и старую mobile primary navigation из активных инструкций. Сохранить историю решений; не объявлять старую работу ошибочной только из-за новой IA.

Delivery matrix: добавить строку нового IA slice со статусом «Не проверено/В работе» и ссылкой на spec. Наличие brief не закрывает feature. PRODUCT.md и старые boards могут содержать более раннюю live-first трактовку: синхронизировать их в рамках принятого изменения, не предоставлять им приоритет над core/addendum.

### Slice 1 — повседневный messenger

Единый sidebar, wide header, section selector, dense stream, bounded Live Shelf и state surfaces. Переиспользовать Group Now read model и существующие permissions. Не переписывать отправку сообщений только ради нового markup. Отдельно обеспечить доступ к existing search/media/replies/pins/edit/delete/voice/files.

Приёмка: Chat работает без live; Shelf появляется/исчезает по фактическому snapshot; 30 Sections доступны мышью/клавиатурой; unread другого раздела не обнуляется; 360 px без document overflow; Void/Light.

### Slice 2 — Full/Mini continuity

Main-area host, local switcher/dropdown, shared connection states и persistent dock. Существующий session runtime живёт выше route/main view. Route лишь выбирает surface; никаких join в render или automatic effects только из-за `roomId` в URL.

Приёмка: join/switch/leave на двух клиентах, переходы Full→Mini→DM→другая Group→Full без смены actual session, cancelling pending join, reconnect, другое устройство, stopped publishing при смене аудитории.

### Slice 3 — Group Chat drawer и screen share

Одна Conversation composition для main/drawer. Drawer 360 px, resize 320–480; thresholds из §5 IA. Current Group/Section видны в composer. Shared message cache/draft/read receipts/optimistic send. Смена Room обновляет metadata будущих сообщений, но не удаляет history и не сбрасывает Section.

Приёмка: оба клиента видят одно message ID в main/drawer; draft/reply/upload переживают minimize; Group Chat не фильтруется по session; guest получает отказ; сообщение в другую Group не получает room context; screen share contain на portrait/16:9/ultrawide; несколько streams не переключают focus самовольно.

### Slice 4 — Guest acquisition acceptance

Существующие invite/guest/conversion контракты довести до фактического браузерного разговора. Preview не превращать в единственный продуктовый результат. Expired/revoked link, capacity, denied permission, offline и conversion имеют понятный next action. Никакого signup wall до первой разрешённой guest value.

Статистика: приглашения по реальному user action; новые/существующие пользователи раздельно; repeated opens дедуплицированы. Content, access credentials и private media identifiers не попадают в analytics.

## 4. State и navigation contract

Три независимых владельца:

1. Navigation: destination, Group view, Section, return destination.
2. Session runtime/server: actual session, pending target/operation, media state, access.
3. Conversation controller: cache, draft, uploads, pending sends, read cursor, scroll anchor.

Presentation (`full/mini`, drawer, fullscreen, selected stream) не владеет session membership. Не хранить copied participants в каждом компоненте. Отдельный `pendingTarget` обязателен: target label не подменяет current session до ACK.

Для chat messages сохранить server-assigned immutable context из migration 66. Сервер проверяет, что active room принадлежит root Group отправки. `optimisticRoomContext` — только временная иллюстрация и обязана заменяться серверным результатом. При offline queue metadata относится к actual server insertion, а не к устаревшему UI room name.

Для same-group switch — одна authoritative/idempotent операция. UI не вызывает независимые leave+join без существующего coordinator. Поздний heartbeat/leave несёт concrete session ID и не перезаписывает новую сессию. Ошибка требует reconciliation, не слепого возврата labels.

Перед switch остановить camera/share publication; они не должны автоматически попасть новой аудитории. Mic preference сохраняется. Обычный self-leave без confirmation; archive/end-for-everyone — destructive confirmation. Другой browsed Group не означает другой actual voice context.

## 5. Конкретные acceptance cases

| ID | Действие | Ожидаемый результат |
| --- | --- | --- |
| IA-01 | Открыть Group без live | Chat; нет пустого Shelf контейнера |
| IA-02 | Появились 8 occupied rooms | Bounded Shelf + подписанный overflow; каждая доступна по имени и Join |
| IA-03 | Добавить/найти 30-й Section | Width toolbar не растёт; searchable picker; stable shortcuts |
| IA-04 | Читать Game при unread в Мемах | Только viewed range Game считается прочитанным |
| IA-05 | Join DRG | Full Room занимает main; sidebar остаётся доступным, modal backdrop отсутствует |
| IA-06 | Full→Chat drawer | Обычная история выбранного Section, включая сообщения вне DRG |
| IA-07 | Отправить из drawer, открыть main | Одно сообщение с тем же ID, reactions/reply и серверным snapshot |
| IA-08 | Во время DRG открыть другую Group и отправить текст | Mini остаётся DRG; чужое сообщение без DRG metadata |
| IA-09 | Switch DRG→Lobby | Нет confirmation; pending до ACK; после success один active participant record |
| IA-10 | Switch при active screen share | Share останавливается; в новой Room не публикуется автоматически |
| IA-11 | DM-call→Group, cancel | DM-call сохраняется; room join не создан |
| IA-12 | То же, confirm | Server transition, старый разговор завершён, новый отрисован без duplicate runtime |
| IA-13 | Join response потерян | Retry с тем же ID; нет дублирования room/participant |
| IA-14 | Cancel joining, поздний ACK | Session-bound compensation; не появляется незаметный mic-on |
| IA-15 | Истёк guest link | Нет auto-join в другой session/Lobby; честный ended/expired preview |
| IA-16 | Guest запрашивает Group messages напрямую | Server deny; никакого client-only скрытия |
| IA-17 | Signup after guest | Continuation сохранён; нет implicit membership/history grant |
| IA-18 | 1440→1280→1024 при открытом drawer | Switcher → dropdown → overlay, по формулам spec |
| IA-19 | 360 px, открыта клавиатура | Composer + mic controls доступны; bottom nav не перекрывает их |
| IA-20 | Refresh/Back/deep link | Просмотр route не начинает новый звонок; active session reconciles |
| IA-21 | Room archive после сообщений | Сообщения доступны через прежний Group/Section/search/pins/media по тем же правам |
| IA-22 | Access revoked / session on another device | Media stop/reconcile; нет ложного connected или доступной cached private history |
| IA-23 | `+ Комната` из своей Group | Одно действие create-and-join; без обязательной формы, temporary/default name, final Full geometry |
| IA-24 | Rename новой Room / создать Section | Inline ввод и Enter; validation/retry на месте, без modal |
| IA-25 | Первый Join с запросом микрофона | После platform allow продолжается исходный join; повторное подтверждение входа не появляется |
| IA-26 | Invite link / device change | Один popover, success/error на месте; без вложенных dialogs и без потери сессии |
| IA-27 | Создать Room при другом active context, отменить | Текущий разговор продолжается; Room и новая session не созданы |
| IA-28 | Перейти между main/drawer/mobile selector | Нет добавленных шагов только ради layout; draft/scroll/focus сохраняются |
| IA-29 | Открыть Group с тремя людьми в Лобби | Chat + реальный roster в Shelf; у просмотревшего нет нового participant record или аудиоподписки |
| IA-30 | Нажать общий voice action группы | Сразу Join Lobby в main, без выбора комнаты; target-specific Join и create-and-join обходят Lobby |
| IA-31 | Трое в Lobby, двое в DRG, один online вне голоса | `5 в голосе · 2 разговора`; `Комнаты · 1`; online не изображён в Lobby. Недоступный roster не раскрывается |
| IA-32 | DRG → `В Лобби` на desktop и 360 px | Прямое видимое действие, один switch без picker/confirm; перед ACK нет ложного placement |
| IA-33 | DRG → self-leave / закрытие Room / kick | Нет автоматического участия в Lobby; media stop/reconcile и корректные права на дальнейшие действия |
| IA-34 | Последний человек покидает Lobby | LiveSession завершается, постоянная Lobby остаётся; Chat Shelf исчезает при отсутствии других разговоров |
| IA-35 | Уже в Lobby → header `Открыть разговор` | Возвращается тот же Full; повторная session не создаётся; mic/share не перезапускаются |

Проверять не только source regex. Native logic tests покрывают инварианты, browser interaction — действия/фокус/read state, два реальных клиента — membership/media, screenshots — layout. Ни один тип проверки не заменяет остальные.

## 6. Тесты, которые потребуется изменить осознанно

`tests/room-message-context.test.mjs` сейчас закрепляет exact-session filter и отсутствие markRead в Room panel. После перехода на полный Conversation view это требование устаревает. Заменить на проверки общей истории, одного draft/read store, scope доступа, отсутствия дубликатов и authoritative room metadata. Сохранить тесты immutable snapshot и same-group server mapping.

`tests/core-rework-group-surface.test.mjs` закрепляет horizontal overflow Shelf и точные небольшие высоты chips. Изменять вместе с утверждённым bounded Shelf contract, а не обходить CSS ради regex. Сохранить проверки chat-default, взаимоисключающих views и occupied-only rooms.

Смежные gates: `room-surface-continuity`, `core-room-voice-session-provider`, `group-now-room-switch-ui`, `room-guest-entry`, `room-guest-account-conversion`, `core-room-concurrency-gate`, `conversation-exit-read-lifecycle`. Перед редактированием прочитать фактическое содержимое; названия сами по себе не доказывают coverage.

## 7. Обязательные проверки и handoff

До изменения Next.js API прочитать соответствующий guide в `node_modules/next/dist/docs/` для установленной версии. Соблюдать root/desktop AGENTS, architecture limits, shared Views и `app → components → hooks/lib/types`. Не расширять baseline exceptions, чтобы протолкнуть выросший компонент.

Из корня checkout вне `node_modules`:

```text
npm run check:architecture
npm run test:unit
npm run lint
npx tsc --noEmit
npm run build
npm --prefix desktop run build
```

Эти команды сверены с package.json на срезе анализа: desktop build включает `tsc --noEmit` и Vite production build. Перед запуском проверить актуальные scripts; не изобретать aliases и не заменять failed native run TSX-loader-ом. Desktop renderer build не заменяет installed native RC/media gate. Проверить приложение на desktop/mobile widths и остановить только запущенные для задачи dev servers после проверки.

В `docs/product-delivery-matrix.md` записать: commit, web/desktop contracts, authorization, interactions, loading/empty/error/offline/reconnect, viewport/theme captures, native tests, реальные media/DB gates и оставшиеся пробелы. Source tests или mocks не обозначать real two-client E2E.

Не делать merge/release частью визуального slice без соответствующей задачи. Не удалять unrelated changes. Финальный handoff должен перечислять реально изменённое поведение, проверки и оставшиеся риски, без утверждения «готово» по одним макетам.

## 8. Direction contract

**THESIS.** Voople показывает переписку и живой разговор как один непрерывный контекст, а не как чат плюс отдельное приложение звонка.

**OWN-WORLD.** Плотный graphite canvas, тёплый off-white, системный violet и зелёный только для live/online; тонкие линии, радиусы 3–6 px, чистый grotesk и mono только для metadata. Pixel/retro характер живёт в identity tokens, counters и точных микродеталях, не в декоративном шуме.

**STORY.** Пользователь открывает Group в Chat, видит занятые Room в bounded Shelf, одним действием входит в Lobby/Room и продолжает ту же session как Full или Mini без потери переписки.

**FIRST VIEWPORT.** Один global sidebar; 64 px Group header; bounded Shelf; 36 px section toolbar; dense stream. Full Room заменяет main content и при ширине добавляет local switcher и contextual Group Chat drawer.

**FORM.** User-pinned messenger/live operating surface; seed key не требуется, поскольку утверждённые IA spec и референсы фиксируют направление.

**FINISH.** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
