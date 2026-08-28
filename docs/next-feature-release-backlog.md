# Обязательный backlog следующего feature-релиза

Этот список фиксирует продуктовые возможности, сознательно не входящие в
текущий стабилизационный релиз. Они не отменены и не считаются закрытыми
наличием UI-каркаса. Переносить сюда дефекты уже существующего функционала
нельзя: такие дефекты блокируют текущий релиз.

## P0 следующего feature-релиза

- Web/desktop presentation migration: baseline `desktopPortableUi` обнулён.
  Переносимая разметка chat, post, composer, profile, Home, Search и group
  management живёт в корневых stateless Views; desktop содержит только data/
  navigation/native adapters. Новые desktop UI-копии запрещены architecture
  gate. Найденное визуальное или функциональное расхождение исправляется как
  дефект общего View/контракта, а не добавлением platform fork.
- Закрыть зафиксированный component debt без повышения baseline: send/attention
  orchestration уже вынесен из `ChatWindow`, его лимит снижен с 404 до 329 строк.
  `ChatRoomControl` закрыт: публичная граница, controller/lifecycle, preferences
  и общий presentation View разделены, а его baseline удалён. `VoiceRoomSheet`
  также разделён на общие stateless header/content/footer-секции, его architecture
  notice закрыт. `ProfileEditSheet` также закрыт: transport/optimistic lifecycle
  вынесен в session-bound controller, preview/catalog/tag и панели стали общими
  stateless-компонентами, а baseline удалён. Следующая цель — message-list
  `ChatWindow`, затем остальные review-threshold компоненты и монолитные
  data-модули по доменным ответственностям.
- Windows application audio: если provenance текущего стабильного артефакта
  содержит `processAudioPublisher: false`, следующий feature-релиз нельзя
  продвигать в stable до восстановления обязательной native-сборки, проверки
  захвата выбранного процесса, исключения Voople, lease refresh и понятного
  video-only fallback только для реально неподдерживаемых версий Windows.
- Discovery тем: страницы topic, подписка, персональные рекомендации и
  объяснимая причина показа.
- People discovery: общий candidate pool, mutuals/shared communities,
  relationship reason и временный статус `open to chat` с expiry/privacy.
- DM requests: отдельный inbox запросов, accept/decline, block/report,
  privacy scopes, rate limit и одинаковый web/desktop UI.
- Relationship graph v2: shared-room history, материализованные edges,
  decay/recalculation job и использование одного score во всех surfaces.
- Home ranking v2: gaming presence, приглашение в Room, mutual recency вне DM,
  multi-session UX и end-to-end проверка ranking без ложного «Сейчас».
- Room discovery/privacy: отдельная visibility-модель комнаты и разрешённые
  поверхности показа вне чата.

## P1 следующего feature-релиза

- Community quality ranking: quality gates, negative feedback,
  exploration/exploitation и полноценный social proof карточки/страницы.
- Полный event → room lifecycle, CTA и уведомления.
- Расширенная модель категорий/настроек уведомлений.
- Organic onboarding с выбором интересов и attribution приглашений.
- Connected-group и relationship analytics поверх privacy-safe pipeline.
- Native application-audio adapters для macOS/Linux после отдельного
  platform spike; Windows publisher и browser selected-surface audio остаются
  текущими поддерживаемыми путями.
- Управляемый каталог интересов: категории, темы, алиасы, локализация,
  moderation/lifecycle и ranking хранятся как продуктовые данные, а не как
  короткий hardcoded-массив в UI. Клиент показывает персональные и поисковые
  подсказки из одного контракта.
- Search Board 6: общий адаптивный layout web/desktop, полноценные карточки
  top-results и оформленные темы/хештеги. Нажатие на групповой тег открывает
  общий identity-preview сообщества (баннер, аватар, статус, описание и действие
  «Использовать тег»), а не безымянную строку.

## Закрытые UX-итерации после presentation migration

- [x] Унифицирован sticky-stack на Home, Search, Notifications, Store и остальных
  authenticated-экранах: одна геометрия, непрозрачная/blur-подложка без
  просвечивания контента и без маскирующих чёрных полос над header.
- [x] На Home «Сейчас» сворачивается в компактную строку после направленного вниз
  скролла и раскрывается при возврате вверх/к началу. Активная Room/presence-информация
  остаётся доступной; есть доступное ручное раскрытие, а состояние не перекрывает
  ленту. Логика и View общие для web/desktop.
- [x] Один `BrandedLoadingView` используется для initial auth/session/consent и
  route fallback web/desktop. Внутренние проверки больше не показываются до
  фактического consent/error state; анимация уважает `prefers-reduced-motion`.
- [x] Общий адаптивный `NotFoundView` подключён к глобальной, profile/post и
  desktop routing 404, имеет возврат на Главную, desktop back action,
  privacy-safe analytics и public mobile E2E.
- [x] «Что нового» использует общий `ReleaseNotesView`: версия, дата и заголовок
  разделены, старые числовые маркеры и повторный заголовок удаляются, длинный
  русский текст не line-clamp-ится, bundled/CDN/updater history объединяются.
  Safe links теперь рендерятся внутри desktop tRPC boundary.

## Открытые UX-итерации после presentation migration

- [x] A0 Shell useful-space implementation: compact global rail стал default
  без сохранённого preference, pinned expanded сохраняется, а hover/focus по
  rail показывает только collapse control. Подписи compact-разделов доступны
  через tooltip; Profile/Settings/Help/Logout собраны в единое account menu у
  нижнего account trigger и не дублируются в основном rail; Search не
  дублируется одновременно в mobile topbar и bottom navigation.
  Web/Tauri используют один state hook и presentation View; Chat List ограничен
  диапазоном 280–320 px, а Home right rail управляется доступной шириной
  контейнера. Unit/contract 109/109, architecture, lint, web/desktop TypeScript и
  обе production-сборки проходят.
- Public responsive smoke gate закрывает 360×800, 390×844, 1024×720, 1280×800
  и 1440×900 без horizontal overflow. Остаётся authenticated visual/interaction
  RC gate: fullscreen, Windows scale 125/150%, dark/light, keyboard/account menu
  и screen-reader evidence. Не считать весь Board 1 закрытым до этих evidence.
- [ ] Shared icon controls/tooltips: отдельным срезом инвентаризировать Room,
  chat headers/composers и media controls; убрать подписи только у однозначных
  действий, сохранив `aria-label`, keyboard focus, touch alternative и общий
  web/desktop tooltip primitive.
- Системные Room-события остаются тихими элементами timeline беседы и дневными
  summary, но не подменяют последнее пользовательское сообщение в списке
  диалогов.

## P4 — некритичный polish

- Улучшить выбор демонстрации: desktop-пикер с миниатюрами окон и экранов,
  крупным preview выбранного источника, качеством и честным audio state. В web
  сохранить защищённый системный picker браузера и показывать preview уже
  выбранного пользователем media track.

## P2 — локализация после стабилизации общих Views

- Ввести единый typed message catalog для web/desktop/mobile без строковых
  platform-копий, оставить русский полной исходной локалью и добавить полный
  английский перевод одним вертикальным срезом.
- Хранить выбранную локаль в профиле с device fallback, локализовать server-
  generated notifications/release notes и проверять plural/date/time formats в
  часовом поясе пользователя.
- Не выпускать «частичный English»: маршруты, loading/empty/error/offline,
  accessibility labels, emails и критические legal surfaces входят в один DoD.

## Стратегические потоки после стабилизации P0/P1

- Open source и защита продукта выполняются по
  [отдельному decision plan](./open-source-strategy.md). Собственный код уже
  опубликован под `AGPL-3.0-only`, бренд и ассеты отделены. До ownership/asset/
  dependency audit, legal review и CLA нельзя считать governance завершённым,
  принимать значимые внешние PR или обещать коммерческое перелицензирование.
- Linux, macOS, Android и iOS развиваются по
  [capability-driven platform roadmap](./platform-roadmap.md). Сначала общий
  контракт возможностей и platform spikes, затем перенос функций по вертикальным
  срезам; создавать вторые реализации portable UI запрещено.
- Эти потоки не вытесняют незакрытые P0/P1. Платформенный этап может выполняться
  параллельно только в изолированной ветке и не должен менять общие контракты без
  web/Windows regression evidence.

## Definition of Done для каждого пункта

1. Общий контракт/view-model без raw DB rows.
2. Серверная авторизация, privacy enforcement, rate limit и telemetry без
   приватного содержимого.
3. Один stateless View; web и desktop содержат только transport/navigation/
   native adapters.
4. Loading, empty, error, offline/reconnecting и rollback/retry состояния.
5. Проверка 360/390/1024/1440 px, light/dark, keyboard/focus/screen reader.
6. Unit + authenticated E2E и обновлённые architecture/audit документы.
7. Feature flag/kill switch и совместимость с предыдущим desktop-клиентом.

## Запрет на преждевременное закрытие

Пункт остаётся открытым, если готов только SQL, API, отдельный web-экран или
отдельная desktop-копия. Статус `готово` допустим только после прохождения всех
семи критериев выше.

## Блокирующее правило следующего выпуска

Следующий feature-релиз нельзя считать готовым к promotion, пока все P0 выше
не закрыты или не перенесены отдельным явно одобренным владельцем продукта
решением с причиной и новой датой. Автоматический или молчаливый перенос P0 в
ещё один релиз запрещён. `processAudioPublisher: false` в provenance текущего
релиза автоматически активирует первый P0.
