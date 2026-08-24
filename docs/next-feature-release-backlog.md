# Обязательный backlog следующего feature-релиза

Этот список фиксирует продуктовые возможности, сознательно не входящие в
текущий стабилизационный релиз. Они не отменены и не считаются закрытыми
наличием UI-каркаса. Переносить сюда дефекты уже существующего функционала
нельзя: такие дефекты блокируют текущий релиз.

## P0 следующего feature-релиза

- Завершить web/desktop presentation migration: разобрать оставшиеся 11 записей
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
