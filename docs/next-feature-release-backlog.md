# Обязательный backlog следующего feature-релиза

Этот список фиксирует продуктовые возможности, сознательно не входящие в
текущий стабилизационный релиз. Они не отменены и не считаются закрытыми
наличием UI-каркаса. Переносить сюда дефекты уже существующего функционала
нельзя: такие дефекты блокируют текущий релиз.

## P0 следующего feature-релиза

- Завершить web/desktop presentation migration: профиль уже полностью вынесен
  из portable desktop baseline; composer перенесён в общие Views, разобрать
  оставшиеся 8 записей
  `desktopPortableUi` в `.architecture-baseline.json`, перенести переносимую
  разметку в один stateless View, оставить в desktop только data/navigation/
  native adapters и удалить запись после parity-теста. Найденное до этого
  пользовательское расхождение не ждёт feature-релиза и исправляется как
  дефект текущей версии.
- Закрыть зафиксированный component debt без повышения baseline: send/attention
  orchestration уже вынесен из `ChatWindow`, его лимит снижен с 404 до 329 строк.
  В первую очередь разделить `ChatRoomControl`, message-list `ChatWindow`,
  `ProfileEditSheet`, затем
  остальные review-threshold компоненты и монолитные data-модули по доменным
  ответственностям.
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

## UX-итерации после presentation migration

- Унифицировать sticky-stack на Home, Search, Notifications, Store и остальных
  authenticated-экранах: одна геометрия, непрозрачная/blur-подложка без
  просвечивания контента и без маскирующих чёрных полос над header.
- На Home сворачивать «Сейчас» в компактную строку после направленного вниз
  скролла и раскрывать при возврате вверх/к началу. Активная Room/presence-информация
  остаётся доступной, а состояние не перекрывает ленту.
- Кнопку сворачивания основного navbar показывать при hover/focus-within;
  клавиатурный focus и доступное имя должны оставаться видимыми всегда.
- Системные Room-события остаются тихими элементами timeline беседы и дневными
  summary, но не подменяют последнее пользовательское сообщение в списке
  диалогов.
- Ввести один branded loading-state для web и desktop: анимированный знак
  Voople, спокойная общая подпись и варианты для initial auth/session/consent/
  route loading без показа пользователю внутренних проверок вроде
  «восстанавливаем сессию» или «проверьте актуальные условия». Ошибки и реально
  требуемое действие при этом не маскируются загрузкой.
- Сделать общую адаптивную 404/not-found страницу в айдентике Voople с понятным
  возвратом на Главную/назад; использовать один presentation View в web и
  desktop routing fallback.

## P4 — некритичный polish

- Улучшить выбор демонстрации: desktop-пикер с миниатюрами окон и экранов,
  крупным preview выбранного источника, качеством и честным audio state. В web
  сохранить защищённый системный picker браузера и показывать preview уже
  выбранного пользователем media track.

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
