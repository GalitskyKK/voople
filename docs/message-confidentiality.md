# Конфиденциальность сообщений и Room

Статус: threat model и архитектурный план. Текущая production-схема **не
является end-to-end encrypted**. Этот документ запрещает заявлять обратное до
реализации, независимого review и проверяемого индикатора в клиентах.

## 1. Что защищено сейчас

| Поверхность | Текущая защита | Чего она не защищает |
| --- | --- | --- |
| Web/API/Supabase | HTTPS/TLS; Supabase HTTP API принудительно использует SSL | Сервер и оператор сервиса всё ещё видят plaintext |
| Сообщения | Membership проверяется на сервере; browser Realtime ограничен RLS `is_chat_member` | `messages.text` и `messages.content` хранятся plaintext; service role, backup или компрометация БД могут раскрыть их |
| Вложения чатов | Private bucket, owner-bound upload key и короткоживущий presigned download URL после проверки membership | Сам объект не шифруется ключом участников на клиенте |
| Room | Короткоживущий media token и стандартно защищённый WebRTC transport | В `Room` не передан LiveKit `encryption` config; Voople пока не распределяет E2EE-ключи между устройствами |
| Логи/аналитика | Telemetry нормализует private route identifiers; код не должен логировать payload сообщения | Provider/access logs и будущие integrations всё равно надо повторно проверять при каждом новом message path |

Открытый исходный код не ослабляет эту схему сам по себе. Он лишь делает
проверяемым важный факт: сейчас доверенная граница включает backend, Supabase,
object storage и media provider. Это надо говорить пользователю прямо.

## 2. Threat model

Защищаем содержимое сообщений, вложений, голоса, видео и screen share от:

1. пассивного перехвата сети;
2. пользователя вне разговора или Room;
3. утечки database backup/object storage;
4. любопытного или скомпрометированного service operator;
5. кратковременной компрометации ключа устройства — с forward secrecy и
   post-compromise recovery;
6. незаметной подмены устройства или участника сервером.

E2EE не может скрыть от сервиса всю metadata: account, membership, время и
примерный размер доставки, abuse/rate-limit signals и push routing остаются
операционными данными. Она также не защищает plaintext на разблокированном или
скомпрометированном endpoint и не мешает участнику сохранить либо переслать
полученный контент.

## 3. Обязательные свойства

- отдельная identity key pair на каждое устройство, а не один экспортируемый
  account secret;
- проверка устройств через safety number/QR и явное событие смены ключа;
- новый message key для сообщений и удаление использованных ключей;
- membership epoch меняется при каждом join/leave/remove;
- новый участник группы не получает старую историю автоматически;
- потерянное устройство отзывается без переиздания старых plaintext;
- recovery не загружает незашифрованные ключи на сервер;
- вложение шифруется локально уникальным AEAD key до upload; object key и
  download URL не являются ключом расшифрования;
- push содержит generic copy без plaintext preview по умолчанию;
- невозможен молчаливый downgrade: несовместимый клиент не входит в E2EE
  conversation/Room;
- moderation report формируется самим жалующимся клиентом как явный
  consented evidence bundle, а не скрытым server-side чтением переписки.

## 4. Не писать собственный протокол

Для direct messages базовый кандидат — поддерживаемая реализация Signal-style
asynchronous sessions: PQXDH/X3DH, Double Ratchet и multi-device session
management. Для групп и динамических Room базовый кандидат — MLS (RFC 9420),
который рассчитан на асинхронные группы и membership changes с forward secrecy
и post-compromise security.

Это кандидаты для spike, а не уже принятое dependency-решение. Перед выбором
нужно проверить web/WASM, Windows/macOS/Linux/Android/iOS support, secure storage,
performance, maintainer policy и лицензионную совместимость с AGPL, App Store и
будущей commercial license. Копировать алгоритмы из спецификаций вручную нельзя.

LiveKit уже поддерживает E2EE media/data, но приложение само должно безопасно
создать и передать participant keys. Shared key, полученный тем же сервером,
которому мы не доверяем plaintext, не решает threat model. Предпочтительный
направленный spike: выводить Room media key из проверенного MLS epoch/exporter,
а затем включать LiveKit frame encryption. Финальное решение требует security
review и совместимости со всеми клиентами.

## 5. Влияние на продукт

E2EE меняет не только таблицу `messages`:

- server-side search/ranking/preview больше не читает текст; индекс становится
  локальным либо строится из явно разрешённой metadata;
- replies, reposts, Saved Messages и Room messages передают typed encrypted
  envelopes, а не server-readable copy;
- web link previews требуют явного opt-in, proxy privacy policy либо
  client-side fetch;
- multi-device history sync и key backup становятся отдельной core feature;
- edits/deletes/reactions/read receipts должны иметь подписанные event types;
- attachment gallery индексирует безопасную metadata, а ключ получает только
  участник;
- account export отдаёт ciphertext и отдельно доступный пользователю локальный
  decrypted export;
- abuse tooling не обещает server-side proactive inspection E2EE content.

Поэтому «зашифровать поле перед insert» — ложное и опасное упрощение.

## 6. Порядок поставки

### Phase A — честная база

- не показывать E2EE badge;
- описать текущую trusted boundary и data retention;
- проверить TLS enforcement, backups, private bucket policy, logs, exports и
  notification payloads;
- добавить security regression tests на membership/RLS и отсутствие payload в
  telemetry/logs.

### Phase B — device identity

- protocol ADR и независимый design review;
- device registry, prekeys/key packages, revocation и key-change events;
- platform secure storage: desktop keychain/credential vault, Android Keystore,
  iOS Keychain; web получает отдельно документированный weaker-storage model;
- verification UI и recovery UX до первой encrypted conversation.

### Phase C — encrypted direct pilot

- versioned ciphertext envelope рядом с legacy plaintext contract;
- новый opt-in direct chat только между совместимыми устройствами;
- offline/out-of-order/multi-device, edit/delete/reaction/reply и attachment
  tests;
- отсутствие downgrade и migration/rollback без потери ciphertext.

### Phase D — groups, Room и attachments

- MLS membership lifecycle для groups и direct-to-group expansion;
- encrypted attachment manifest и per-object keys;
- LiveKit E2EE через проверенное распределение epoch keys;
- Saved Messages, reposts, Room messages и gallery поверх общего envelope.

### Phase E — default и claim

- внешний cryptography review, fixes и повторный review;
- cross-platform interoperability vectors и compromised-device drills;
- публичный protocol/version document и security contact;
- только после этого E2EE становится default и появляется проверяемый badge.

## 7. Release gates

Нельзя выпускать E2EE slice без тестов: two-device/offline, out-of-order,
multi-device add/remove, key rotation, reinstall/recovery, member add/remove,
old-client downgrade, encrypted attachment tamper, lost device, compromised
server simulation и web/desktop/mobile interoperability. Security-critical
crypto path не переводится в stable только по unit-тестам автора.

## 8. Нормативные источники

- [Signal: PQXDH](https://signal.org/docs/specifications/pqxdh/)
- [Signal: Double Ratchet](https://signal.org/docs/specifications/doubleratchet/)
- [Signal: Sesame multi-device sessions](https://signal.org/docs/specifications/sesame/)
- [IETF RFC 9420: Messaging Layer Security](https://datatracker.ietf.org/doc/html/rfc9420)
- [LiveKit encryption overview](https://docs.livekit.io/transport/encryption/)
- [Discord DAVE design overview](https://discord.com/blog/meet-dave-e2ee-for-audio-video)
- [Supabase SSL enforcement](https://supabase.com/docs/guides/platform/ssl-enforcement)
