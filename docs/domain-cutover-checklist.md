# Переезд Voople с `voople.ru` на `voople.app`

Статус: обязательный operational checklist после покупки `voople.app`. Старый
домен планируется отключить, поэтому смена считается полным cutover, а не только
добавлением второго адреса. Этот документ не содержит ключей и значений
секретных переменных.

## До выпуска

1. Добавить DNS-зону `voople.app` у выбранного DNS-провайдера. Регистратор и
   DNS-хостинг могут быть разными; перенос инфраструктуры с Selectel не нужен.
2. Направить `voople.app` и `www.voople.app` на Selectel VDS, развернуть
   tracked Caddy/Compose-конфигурацию, выпустить TLS и оставить `voople.app`
   canonical host. Vercel удалить из production DNS после smoke.
3. Добавить новые Supabase Auth Site URL и redirect allowlist для web, desktop
   callback/deep links и email confirmation. Старые callbacks не удалять до
   проверки новой сборки.
4. Обновить UniSender: sender domain, SPF, DKIM, DMARC, tracking domain,
   шаблоны и все ссылки из писем. Проверить доставку на нескольких почтовых
   провайдерах.
5. Перенести self-hosted LiveKit до отключения `.ru`:
   - создать DNS для `rtc.voople.app` и отдельного TURN-host, если он
     используется;
   - выпустить доверенные TLS-сертификаты для signaling и TURN/TLS;
   - обновить reverse proxy/Caddy и `turn.domain` в LiveKit;
   - заменить `NEXT_PUBLIC_LIVEKIT_URL`, `LIVEKIT_URL` и fallback endpoints в
     окружениях web/backend;
   - проверить WSS, WebRTC UDP/TCP и TURN/TLS с web и установленным desktop.
     LiveKit API key/secret из-за смены домена ротировать не требуется.
6. Проверить CORS/CSP и allowed origins у storage, CDN, Sentry/telemetry,
   OAuth-провайдеров, webhook-получателей и внешних интеграций.
7. Заменить hardcoded `voople.ru` в приложении, desktop config/updater,
   приглашениях, Open Graph, legal/support links, sitemap/robots, release
   workflows, тестах и документации. Перед изменением использовать `rg`, а не
   слепую глобальную замену.
8. Обновить GitHub/Selectel environment variables и secrets только через
   защищённые настройки. Значения секретов в git не добавлять.

## Порядок переключения

1. Развернуть backend/web и LiveKit на `.app`; доступность `.ru` не считать
   условием cutover, так как production ещё не был публично запущен.
2. Выпустить desktop-версию, которая использует `.app`, и проверить updater,
   auth callback, приглашение, чат и реальный звонок с демонстрацией экрана.
3. Перевести всех существующих пользователей на новую сборку. Если redirect не
   используется, старая desktop-сборка после отключения `.ru` больше не сможет
   получить обновление или подключиться к старым endpoints; для небольшой
   тестовой аудитории допустима ручная переустановка.
4. Переключить canonical URL и email links, затем проверить логи и ошибки.
5. Отключать `.ru` только после успешного smoke на web и двух desktop-клиентах.

## Финальная проверка

- `voople.app` и все публичные callback/deep links работают только по HTTPS;
- вход, регистрация, подтверждение email и восстановление сессии проходят в web
  и desktop;
- LiveKit signaling, UDP/TCP fallback и TURN/TLS работают из разных сетей;
- приглашения и старые сохранённые ссылки дают понятный результат;
- updater и release metadata больше не зависят от `.ru`;
- `rg -n "voople\.ru"` оставляет только явно сохранённую историю либо ничего;
- в репозитории, артефактах и логах нет ключей, токенов и приватных URL.
