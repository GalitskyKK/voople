# Voople: решение по core hook и продуктовой ставке

## VERDICT

**Решение: C. Сохранить messenger/live core; прекратить открытый поиск одного нового communication primitive.**
Нового кандидата, проходящего заданные ограничения, не найдено.
Это результат ограниченного исследования, а не доказательство невозможности изобретения.
Текущая архитектура пригодна для проверки спроса; её рыночная жизнеспособность пока не доказана.
Chat + доступный live уже существуют у конкурентов. Rooms сами по себе не обеспечивают отличия.
Единственная ближайшая ставка на привлечение — законченный Room Guest flow, уже предусмотренный addendum.
Его классификация: **strong feature / acquisition mechanism**, не новый core и не доказанный viral loop.
Следующий решающий источник данных — повторное использование целыми компаниями, а не ещё один каталог идей.

### Уточнение voice-first модели — 19 сентября 2026

Новый визуальный источник `voople_ssm_redesign/last_try` и прямое продуктовое
решение уточняют механику, не меняя ставку на messenger/live core:

- **Switch** — нажатие всей карточки Lobby/Room одним действием переносит
  пользователя в выбранный разговор. Отдельной кнопки Join на карточке нет.
- **Split** — быстрый временный боковой разговор без имени и setup. Сначала в
  него перемещается только инициатор; пустой Split исчезает автоматически.
- **Voop / «Вуп»** — действие на человеке, а не на Room. Получатель принимает
  компактное приглашение; только после согласия сервер создаёт Split и
  перемещает обоих. Принудительного перемещения нет.
- **`+ Комната`** — осознанное создание постоянной/закрепляемой Room, а не
  shortcut для временного разговора.
- Вход и switch по умолчанию сохраняют обзор Group / Войс. Full Room открывается
  только по явному раскрытию активного разговора; навигация не порождает modal.
- Leave доступен непосредственно у текущей Room по hover/focus/context state;
  отдельный обязательный voice dock не является частью core flow.

Продуктовая формула: **«Одна группа — несколько живых разговоров»**. Этот блок
имеет приоритет над более ранними местами документа, где `+ Комната` означала
temporary create-and-join, Join автоматически раскрывал Full Room или `Вуп`
трактовался как действие над комнатой.

## 1. Рамка решения

**Факт — материалы.** Рассмотрены core plan, addendum со всеми поздними поправками, integration plan, core architecture, delivery matrix, релевантные secondary social/UX положения, семь приложенных изображений и существующие компоненты. Срез кода: `53b7456`, ветка `feat/core-rework-live-layer`. Дата проверки внешних источников: 9 сентября 2026 года.

**Статус документа.** Это предложенное продуктовое решение. Оно не объявляет features реализованными и не заменяет автоматически принятые canonical sources. Конкретная целевая IA вынесена в [VOOPLE_IA_UI_SPEC.md](./VOOPLE_IA_UI_SPEC.md), техническая постановка — в [VOOPLE_IMPLEMENTATION_BRIEF.md](./VOOPLE_IMPLEMENTATION_BRIEF.md).

**Метод.** Ниже «Факт» обозначает описание источника или наблюдение в приложении; «Вывод» — интерпретацию; «Решение» — выбранное направление; «Гипотеза» — утверждение, которое требует пользовательского теста. Обзор сравнивает механики. Он не является переписью всех функций, независимым аудитом конкурентов или измерением их retention.

**Ограничение.** Публичные help pages доказывают наличие описанной возможности, но не качество исполнения и не её частоту использования. Жалобы показывают существование боли, но не её распространённость. Историческое закрытие компании не доказывает, что её механика была плохой или исключительно «слишком ранней». Для Airchat исследован документированный запуск 2024 года; текущая работоспособность сервиса не подтверждена. Для ряда закрытых продуктов доступны преимущественно репортажи времени запуска.

### Восстановленная модель Voople

| Сущность | Ответственность | Что сохраняется |
| --- | --- | --- |
| DM | Постоянная переписка двух людей | Сообщения, вложения, история звонков |
| Group | Постоянная компания, membership, один групповой текстовый контекст | Общая история и настройки доступа |
| Section | Необязательный текстовый раздел Group Chat | Собственный адресуемый поток внутри группы; существующие child `chats` |
| Room | Место текущего live-разговора в Group | Lobby и pinned постоянны; temporary архивируется после grace |
| LiveSession | Конкретный жизненный цикл voice/video/share | Участники, authoritative connection state; DM session без Group Room |
| Message | Запись DM/root Group/Section | Room — nullable immutable context snapshot, без владения историей |
| Room Guest | Ограниченное участие в конкретной LiveSession | Не превращается автоматически в Group Member |

`temporary Room` в таблице означает только Split/Voop conversation. Она не
создаётся через обычную плитку `+ Комната`.

**Факт — приоритеты.** Group по умолчанию открывает Chat. При активном live появляется Shelf. Group / Войс остаётся полноценным обзором нескольких разговоров (в ранних материалах и внутренних идентификаторах — `Сейчас` / `now`). Full/Mini Room представляют одну сессию; навигация не завершает её. Профили, cosmetics, music, posts, questions, Store сохраняются вторичными. Реальный двухколоночный профиль — исключение из упрощённых референсов.

**Вывод.** Новый механизм должен либо заменить способ общения, либо помочь доставить существующую ценность конкретным людям. Эти задачи нельзя смешивать в одной оценке «насколько это core».

## 2. Что в критерии core стоит уточнить

**Вывод.** Removal test полезен против переименования features. Однако при условии «полноценный обычный messenger остаётся обязательным» почти любая добавленная механика по определению удаляема: запасная система общения уже присутствует. Это сужает поиск до смены продукта, а не до следующей функции Voople.

Пример: механизм ограниченной аудитории может быть фундаментальным для отдельного приложения, но превращается в опциональную настройку поверх постоянной Group. Из этого не следует, что он бесполезен. Следует только, что его нельзя продавать как новый communication primitive.

**Решение.** Использовать три раздельных проверки:

1. **Структурная:** меняет ли удаление основную систему коммуникации?
2. **Поведенческая:** теряется ли регулярно используемый сценарий, ради которого компания возвращалась?
3. **Дистрибуционная:** получает ли non-user пользу и начинает ли затем приглашать других?

Сильная функция может пройти вторую и третью проверки, не проходя первую. Для небольшого продукта этого может быть достаточно. Ни одна из этих проверок не подтверждается глубиной интеграции или количеством экранов.

## 3. Рынок: где уже заняты механики

Все описания ниже — факты из указанных источников. Последняя колонка — вывод для Voople. Даты обозначают публикацию, если она известна; «текущая справка» — страницу, доступную на дату проверки.

### Повседневные мессенджеры и групповые продукты

| Продукт | Подтверждённая механика и источник | Следствие для Voople |
| --- | --- | --- |
| Discord | Постоянные voice channels и текст внутри voice channels; [официальная справка, S1](https://support.discord.com/hc/en-us/articles/4412085582359-Text-Channels-Text-Chat-In-Voice-Channels) | Текст рядом с голосом уже знаком; общий текстовый контекст всей компании — выбор организации истории |
| Discord Social SDK | Provisional accounts дают игровые social-возможности без привязки полноценного Discord account; это game-scoped flow, не обычный гостевой вход по ссылке; [S2](https://discord.com/developers/social-sdk) | «Без аккаунта» не является незанятой технической территорией |
| WhatsApp | С 22.05.2025 voice chats для групп любого размера: участники входят и выходят, переписка остаётся доступной; [S3](https://blog.whatsapp.com/voice-chat-on-whatsapp-audio-hangouts-for-groups-of-all-sizes) | Messenger-first + live поверх чата не новый primitive |
| Telegram | Групповые звонки, добавление людей в активный звонок, ссылки/QR, screen share; 30.04.2025, [S4](https://telegram.org/blog/group-calls-made-easy) | «Расширить звонок» и «зайти по ссылке» недостаточны для уникальности |
| Signal | Call links для пользователей Signal, опциональное одобрение участников; [S5](https://support.signal.org/hc/en-us/articles/7860719423002-How-to-create-and-share-call-links) | Ссылка на звонок и browser guest без аккаунта — разные уровни трения |
| Messenger | Group messaging, calls, replies/reactions и media — подтверждённый baseline; [S6, Meta, 2022](https://about.fb.com/news/2022/01/updates-to-end-to-end-encrypted-chats-messenger/amp/) | Нельзя считать replies/реакции самостоятельной ставкой на миграцию |
| Snapchat | Групповые чаты и обмен моментами; [S7, текущая справка](https://help.snapchat.com/hc/en-gb/articles/7012348774804-How-to-create-Group-Chats-on-Snapchat) | Быстрый social-media exchange уже конкурентная категория |
| Instagram DM | Music stickers, scheduled messages, pinned content, group QR; [S8, Meta, 19.02.2025](https://about.fb.com/news/2025/02/new-instagram-dm-features-stay-connected/amp/) | Music и share links усиливают базовый чат, не заменяют его |
| iMessage | Polls непосредственно в conversation; [S9, Apple, текущая справка](https://support.apple.com/en-mide/guide/iphone/iphde1787df4/ios) | Координация встречи — существующая функция messaging; доступность зависит от клиента |
| GroupMe | Events, polls, shared albums и messaging; компания объявила сворачивание SMS Mode в 2026; [S10](https://www.groupme.com/blog/goodbye-sms-mode) | Исторический SMS-вход важен как пример distribution, но его нельзя рекомендовать как актуальный baseline |
| Geneva / BFF | Bumble приобрела Geneva для групповой дружбы; BFF переработан в 2025; [S11](https://bumble.com/en/the-buzz/bumble-inc-friendship-communities-geneva), [S12](https://support.bumble.com/hc/en-us/articles/30781191036317-Changes-to-Bumble-For-Friends-and-Bumble-BFF-Mode) | Сравнивать со старым независимым Geneva без оговорки уже некорректно |
| Guilded | Roblox объявила sunset продукта к концу 2025; [S13, официальное объявление](https://devforum.roblox.com/t/update-on-guilded-and-communities/3966775) | Это исторический конкурент архитектуры, не надёжный действующий ориентир для roadmap |
| Slack | Huddle в DM/channel, screen share и связанный message thread; [S14](https://slack.com/intl/en-gb/help/articles/4402059015315-Use-huddles-in-Slack) | Плавный переход text/live уже реализованный паттерн, хотя аудитория другая |
| Teams | Вход через browser без входа в аккаунт возможен; политики организатора могут требовать проверку/аккаунт; [S15](https://support.microsoft.com/en-us/teams/meetings/join-a-meeting-without-an-account-in-microsoft-teams) | Guest link — commodity workflow с важными деталями доступа |

### Voice, presence и private social

| Продукт | Механика и источник | Следствие |
| --- | --- | --- |
| Houseparty | Drop-in group video; официальный источник подтверждает прекращение работы 14.10.2021; [S16](https://www.fortnite.com/news/houseparty-brings-video-chat-to-fortnite?lang=en-US), исторический обзор [S17](https://www.axios.com/2017/12/15/meet-houseparty-the-next-big-gen-z-craze-1513300377) | «Видно друзей → зайти» было полноценным продуктом, а не недавним открытием |
| Buz | Push-to-talk voice messaging; [S18, сайт и help](https://www.buz.ai/help-center/) | Короткий путь записи полезен; сам по себе не даёт новой модели Group |
| ten ten | Live walkie-talkie для знакомых; [S19, developer listing](https://apps.apple.com/us/app/ten-ten-your-friends-on-tap/id1481768339) | Отдельный продукт на PTT уже есть; заимствование остаётся known mechanic |
| Airchat | Голосовые посты с транскрипцией; наблюдение запуска 2024, [S20](https://techcrunch.com/2024/04/17/airchat-the-buzzy-new-social-app-could-be-great-or-it-could-succumb-to-the-same-fate-as-clubhouse/) | Speech-to-text social — известное направление; текущий статус и retention здесь не установлены |
| Clubhouse | В 2023 представила voice Chats с асинхронным прослушиванием и PTT; [S21](https://blog.clubhouse.com/the-new-clubhouse/) | Переход между async и live не делает идею незанятой |
| Stereo | Voice notes и spontaneous conversations; [S22](https://stereo.com/about) | Ещё один аналог social audio, но не свидетельство спроса компаний Voople |
| Yubo | Live social discovery и новые знакомства; [S23](https://www.yubo.live/faq) | Для повторяющихся компаний это другая acquisition/moderation задача |
| Yope | Private photo sharing; текущий сайт акцентирует доставку снимков на lock screens; [S24](https://yope.app/), [S25](https://www.esafety.gov.au/key-topics/esafety-guide/yope) | Нужно отличать историческое позиционирование private groups от текущей презентации |
| Locket | Снимок друга появляется в Home Screen widget; [S26](https://help.locket.com/en/articles/14225418-my-teen-asked-me-to-get-locket-what-is-it) | Сильная поверхность получения; добавленная к Voople всё равно остаётся feature |
| Retro | Weekly friend photo updates; [S27](https://retro.app/) | Ритуал недели имеет собственную ценность; несколько раз в неделю для данной компании не доказано |
| BeReal | Ограничения публикации и ожидаемой аутентичности изучались в HCI; [S28, исследование 2024](https://arxiv.org/abs/2408.02883) | Правила публикации могут формировать продукт; это не коммуникационный core Voople |
| Path | Private sharing с ограниченным кругом, закрытие в 2018; [S29](https://techcrunch.com/2018/09/17/rip-path/) | Ограниченный круг — выбор аудитории; причины закрытия нельзя свести к одному UX-решению |

### Gaming и внешнее распространение

| Продукт | Механика и источник | Следствие |
| --- | --- | --- |
| Medal | Capture → upload → shareable clip link; [S30](https://support.medal.tv/support/solutions/articles/48001169792) | Replay → Chat конкурирует с существующим workflow и библиотекой привычек |
| Discord Clips | Запись и отправка клипа в текстовый канал; [S31](https://support.discord.com/hc/en-us/articles/16861982215703-Clips) | «Клип прямо в беседу» нельзя объявить новым primitive |
| Steam social | Обновлённый group/friends voice chat документирован в 2018; [S32](https://store.steampowered.com/news/posts/?enddate=1528841999) | Игровой social graph уже встроен в платформу; копирование списка друзей не решает migration |
| Xbox parties/LFG | Parties и Looking for Group обслуживают поиск совместной игры; [S33, Xbox Wire](https://news.xbox.com/en-us/podcast/578-the-next-xbox-one-system-update-and-leeroy-jenkins/?ver=3.7.1) | LFG решает дефицит участников, а не ежедневную переписку постоянной компании |
| PlayStation parties | Open/closed party, приглашения, party links и Share Play; [S34](https://www.playstation.com/en-us/support/games/ps5-party-voice-chat/) | Ссылка и групповое присутствие уже входят в platform social; Voople не обещает console parity |
| GamerLink | LFG плюс parties для voice; [S35](https://gamerlinkapp.com/faq) | «Найти пятого → говорить» занят отдельными продуктами |
| Partiful | Event page и RSVP по ссылке без установки приложения; [S36](https://partiful.com/invitations/invitation-apps) | Полезное действие получателя предшествует установке. Это переносимый принцип, не свободная идея «Сбора» |
| NGL | Автор публикует link, посетитель отправляет сообщение; [S37](https://ngl.link/p/privacy) | Автор получает входящие; motivation внешнего отправителя нельзя автоматически перенести на Group live |
| Jitsi | Гостевой meeting flow; на meet.jit.si создателю нужен аккаунт с августа 2023; [S38](https://jitsi.org/security/) | Различать host authentication и guest authentication |
| FaceTime links | Browser participation Android/Windows; [S39](https://support.apple.com/en-us/109364) | Browser access до установки Voople не новая категория поведения |

**Вывод.** В просмотренном поле нет основания объявлять exclusivity для voice, rooms, live shelf, clips, guest links, identity или private sharing. Есть место для лучшей связности конкретного workflow; наличие этого места ещё не доказывает willingness to switch.

## 4. История 2008–2018: что стоит извлечь

Таблица намеренно не называет все закрытия «провалами идеи». Колонка про современность — аналитическая оценка переносимости, не установленная причина закрытия.

| Продукт | Исторический факт | Что было ценным | Что изменилось / что не решено | Решение |
| --- | --- | --- | --- | --- |
| Early GroupMe, 2010 | Групповой SMS и conference call; [S40](https://techcrunch.com/2010/08/25/groupme-born-at-techcrunch-disrupt-secures-funding-and-launches/) | Получатель участвовал через уже доступный транспорт | Browser позволяет лёгкий вход, но не создаёт группу друзей автоматически | Заимствовать value-before-install; не строить SMS-мост |
| Fast Society, 2010 | Временные group texts, conference calls; [S41](https://techcrunch.com/2010/10/01/group-text/) | Быстрая координация ограниченного события | Истечение текста конфликтует с постоянной историей Voople | Reject как core; Room уже даёт временный live |
| Path, 2010–2018 | Ограниченный круг, private sharing; S29 | Понятная социальная граница | Современные private-photo продукты уже продолжают эту линию | Сохранить private-by-context, не копировать cap друзей |
| Color, 2011 | Proximity-based media sharing; contemporaneous UX review [S42](https://adrianroselli.com/2011/03/color-has-gray-pallor.html) | Общий момент мог собирать локальные фото | Лучше сенсоры не устраняют пустой nearby graph и неопределённую аудиторию | Reject |
| Highlight / Glancee, 2012 | Ambient location discovery; интервью/наблюдения [S43](https://ricmac.org/2012/03/19/glancees-sxsw-adventure-battling-bad-wifi-battery-drain-the-silicon-valley-mafia/) | Обнаружение потенциально знакомых рядом | Battery/background ограничения были реальны; необходимость знакомства остаётся ситуационной | Reject для постоянных компаний |
| Bump, 2009–2014 | Жест обмена контактами/файлами, затем закрытие; собственный blog [S44](https://blog.bu.mp/) | Явное согласованное действие двух людей | Browser/deep link снижает барьер; физический жест не нужен для удалённой компании | Полезный принцип явного handoff, не новый core |
| FireChat, 2014 | Offline mesh коммуникация; практический эксперимент [S45](https://thaliproject.org/ExperimentWithFireChat/) | Доставка при отсутствии сети | Это транспортная задача; локальная плотность устройств и дальность сохраняют значение | Reject: другая частота и инженерный профиль |
| Yo, 2014 | Однословный сигнал, смысл задавался контекстом; [S46](https://digiday.com/marketing/french-soccer-team-says-yo-fans/) | Минимальная стоимость адресного сигнала | Избыточные сигналы и неоднозначность не исчезли вместе со старым железом | Обычный ping может быть feature; core не предлагать |
| Meerkat → Houseparty, 2015–2016 | Переход от broadcast к group video; [S17](https://www.axios.com/2017/12/15/meet-houseparty-the-next-big-gen-z-craze-1513300377) | Повторяющееся совместное участие вместо постоянного производства broadcast | Join по-прежнему зависит от наличия знакомых онлайн | Урок в пользу текущего live, не новый hook |
| Secret, 2014–2015 | Anonymous sharing; основатель закрыл продукт, сославшись на расхождение с исходным замыслом; [S47](https://www.forbes.com/sites/miguelhelft/2015/04/29/secret-the-100-million-social-app-shuts-down/) | Низкий порог высказывания | Abuse и последствия для отношений — часть механики | Reject как ставка Voople |
| Yik Yak, 2013–2017; relaunch 2021 | Local/campus anonymous community, затем перезапуск; [S48](https://yikyak.com/faq) | Плотность одного сообщества помогает cold start | Campus graph и moderation нельзя получить добавлением anonymous tab | Reject для текущего сегмента |
| Peach, 2016 | Magic words вызывают типы публикаций; [S49, developer listing](https://apps.apple.com/gb/app/peach-share-vividly/id1067891186) | Быстрое выразительное действие | Команды не дают non-user самостоятельной пользы | Feature; не считать «умершим» только из-за отсутствия массового внимания |
| Google Wave, 2009–2010 | Совместный live text/rich media; Google сообщила о недостаточном adoption; [S50](https://googleblog.blogspot.com/2010/08/update-on-google-wave.html) | Один редактируемый объект разговора | Более быстрый realtime не отвечает на вопрос «когда писать обычное сообщение?» | Reject для данного rework; это отдельная продуктовая ставка |

**Вывод о «слишком ранних» идеях.** Сильнее всего подтвердились технические ограничения у локального mesh, ambient location и раннего мобильного media. Но именно эти направления хуже соответствуют частоте, небольшой команде и уже выбранной аудитории Voople. Не найдено свидетельства, что снятие старого технического барьера сегодня освобождает подходящий незанятый core.

**Решение.** Брать из истории три принципа: участвовать до установки, понимать социальную границу до отправки, продолжать существующее общение без создания лишних объектов. Ни один из них не нужно переименовывать в новое изобретение.

## 5. Реальные боли и академическая проверка

| Evidence | Что действительно наблюдалось | Чего оно не доказывает | Следствие |
| --- | --- | --- | --- |
| [S51: Old Timers Guild, август 2018](https://forums.oldtimersguild.com/t/channels-in-discord/3882) | При нескольких играх люди обсуждают временные каналы, ботов и необходимость обращаться к администраторам | Что всем small groups нужны 20 rooms; что проблема по-прежнему не имеет решений | Temporary Rooms и плоский switcher обоснованы как удобство |
| [S52: Discord API issue, октябрь 2018](https://github.com/discord/discord-api-docs/issues/720) | Разработчик создаёт комнаты ботом по мере заполнения существующих | Что API issue является массовым consumer demand | Бот — реальный обходной путь, а не источник нового primitive |
| [S53: запрос text-in-voice, 2020](https://www.reddit.com/r/discordapp/comments/j3o8kc) + S1 | Пользователи хотели писать рядом с voice; сегодня Discord документирует такую возможность | Что старый request всё ещё означает незанятую нишу | Старые жалобы проверять на закрытие конкурентом |
| [S54: Telegram issue, январь 2024](https://bugs.telegram.org/c/36325) | Автор путается в topics/messages view; администратор закрывает issue как expected behavior | Что это текущий bug или большинство пользователей не понимает topics | Один адресат composer и стабильный selector лучше неоднозначного агрегата |
| [S55: WhatsApp discussion, май 2025](https://www.reddit.com/r/whatsapp/comments/1kgyhju/how_to_disable_swipe_up_to_talk_on_group_chats/) | Жалобы на случайные voice-chat активации жестом | Долю пользователей и текущую частоту дефекта | Явный Join CTA; навигация никогда не включает микрофон |
| [S56: Medal discussion, 2021](https://www.reddit.com/r/MedalTV/comments/q21gg1) | Пользователь описывает workaround: показывать клип через Discord screen share из-за доступа по ссылке | Что Medal до сих пор воспроизводит тот же дефект | Проверять recipient access; это reliability/permissions, не новый core |

**Факт — HCI.** Исследование Microsoft Research опирается на интервью с 48 участниками 15–24 лет в США и описывает групповое messaging, выбор инструментов и управление несколькими threads. Прямой перенос на российские взрослые gaming-компании был бы необоснован. [S57: «They're blowing up my phone», 2015](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/youth_comm_TechReport.pdf).

**Факт — HCI.** Исследование с 18 участниками рассматривает распределение отношений между приложениями. Использование нескольких мессенджеров может поддерживать разные социальные контексты, а не только компенсировать missing features. [S58: «WhatsApp is for family; Messenger is for friends», 2017](https://groups.cs.umass.edu/nmahyar/wp-content/uploads/sites/8/2019/01/reading13.pdf).

**Факт — CSCW.** Diary study с 17 участниками, опубликованное в 2025, связывает переключение каналов с темой, темпом общения, функциями и социальным ощущением приложения. Доступен author/institutional reprint. [S59: Channel Switching and Adaptive Behaviors in Multichannel Communication](https://acris.aalto.fi/ws/portalfiles/portal/199536161/Channel_Switching_and_Adaptive_Behaviors_in_Multichannel_Communication.pdf).

**Расхождение исследований.** S59 уточняет картину S58: в новой выборке люди не обязательно сознательно распределяют отношения по приложениям; распределение формируется адаптацией и инерцией прошлых разговоров. Поэтому из этих работ нельзя вывести универсальное правило «одна компания — одно приложение» или гарантированное желание объединить всё. Для Voople нужно наблюдать конкретные переходы целевой компании.

**Факт — историческая research-линия.** Aoki, Szymanski и Woodruff обсуждают lightweight communication, availability и небольшие существующие группы в mobile media spaces ещё в 2006. Это концептуальная работа; она не доказывает сегодняшние рыночные показатели. [S60: Media Spaces in the Mobile World](https://www.paulaoki.com/papers/cscw06-media.pdf).

**Вывод.** Подтверждаются четыре класса боли: трудно быстро подключить нужного человека; шум мешает сообщениям; контекст дробится между потоками; участники неодинаково доступны для voice. Ни один источник не позволяет сделать скачок к «компания обязательно перейдёт в ещё один messenger». Более того, попытка объединить всё может разрушить полезное разделение контекстов.

**Гипотезы для полевого дневника Voople.** «Спросить в Telegram → собрать голос в Discord», «сделать клип → загрузить → прислать ссылку», «узнать где друзья → найти комнату», «пригласить гостя → объяснить сервер и роли». Это конкретные цепочки для наблюдения. Их распространённость среди целевых компаний не измерена; нельзя выдавать их за установленную статистику.

## 6. SHORTLIST

**Новых true-core кандидатов: 0.** Не заполнять пять строк вариациями уже отвергнутых идей.

Ниже одна практическая ставка из существующего плана. Она включена для решения о разработке, без претензии на новую механику. Основание вернуться к ней — ограниченный scope, уже существующие контракты и возможность проверить external activation до миграции всей компании.

### NAME: Гостевой вход

**ONE-LINER.** Участник зовёт конкретного знакомого в текущую Room; знакомый разговаривает в браузере до создания аккаунта.

**FLOW.**

1. Двое участников уже находятся в DRG; нужен ещё один знакомый.
2. Участник нажимает «Пригласить» и копирует ссылку на эту LiveSession.
3. Сам отправляет её знакомому в существующей переписке.
4. Получатель открывает browser preview: кто приглашает, какая Room, состояние разговора и граница гостевого доступа.
5. Вводит отображаемое имя, выбирает mic/listen-only и явно нажимает «Зайти».
6. Получает разговор и доступную демонстрацию без обязательной регистрации; при ошибке видит retry в той же поверхности.
7. По собственному желанию создаёт аккаунт с сохранением понятного continuation; membership группы требует отдельного явного действия.
8. В следующий реальный совместный сценарий возвращается; после регистрации может пригласить уже своего знакомого.

**REAL USER PAIN.** Для одного вечера человеку не обязательно вступать в постоянную компанию и проходить полный onboarding messenger. Получатель хочет попасть к знакомым, отправитель — начать совместное действие.

**EVIDENCE.** Teams, FaceTime и Jitsi доказывают реализуемость полезного guest/browser участия (S15, S38, S39). Early GroupMe демонстрирует value через уже доступный транспорт (S40). Partiful даёт полезное действие по invitation link без установки (S36). Эти аналоги одновременно опровергают новизну.

**WHY FREQUENT.** Только для компаний с регулярно пересекающимся составом: например, 4–10 знакомых, иногда добавляющих одного гостя. Для замкнутого состава частота может оказаться близкой к нулю. Это ограничение сегмента, а не повод искусственно стимулировать invites.

**VIRAL LOOP.** Участник → ссылка знакомому → реальный разговор/совместный просмотр → ответное участие → добровольный аккаунт → повторный разговор → собственное приглашение. Конверсия в аккаунт сама по себе не закрывает цикл; новый человек должен стать инициатором следующего полезного приглашения.

**CORE TEST.** Удаление guest flow оставляет полноценный messenger + calls + rooms. Теряется путь входа внешнего человека до регистрации. **Removal test на true core не пройден.**

**CLASSIFICATION.** Strong feature; acquisition mechanism. Core-adjacent только в описательном смысле proximity к разговору, не как доказательство варианта B.

**NEAREST COMPETITOR.** Guest meeting link в Jitsi/Teams/FaceTime; внутри consumer social — room invites и party links. Нельзя называть это уникальным «живым приглашением» только из-за preview аватаров.

**WHAT IS ACTUALLY NEW.** Новый для текущего Voople workflow: внешний человек участвует в конкретном разговоре компании без членства и без аккаунта. Нового для рынка поведения не установлено.

**IMPLEMENTATION.** Backend 3/5, frontend 3/5, media/device QA 4/5 при использовании существующей архитектуры. Основная сложность: expiry, scopes, reconnect, idempotency, conversion и несколько устройств. Не требуется frontier ML. При исходно отсутствующем guest backend оценки были бы выше.

**KILL CONDITION.** После устранения явных access/media дефектов и четырёх недель использования 12–15 подходящими компаниями остановить расширение этой ставки, если менее четырёх компаний повторно используют external guest flow в разные дни или менее 20% из минимум 30 уникальных успешно подключившихся гостей возвращаются в течение 14 дней. Это заранее выбранные пороги решения, не рыночные benchmarks и не статистическое доказательство. При меньшей выборке результат неопределённый; не объявлять успех по двум энтузиастам.

Гостевой доступ остаётся полезной базовой функцией, даже если как growth bet не сработает. «Kill» здесь означает прекратить дальнейшее инвестирование в гипотезу распространения, а не удалить работающий доступ и сломать существующие ссылки.

### Почему не добавлены остальные кандидаты

| Направление | Removal / competitor test | Итог |
| --- | --- | --- |
| Replay → Chat / clips | Общение сохраняется; Medal и Discord Clips близки | Strong feature, уже известная; не строить recorder сейчас |
| Transcript / mixed voice-text | Общение сохраняется; Airchat/Clubhouse/voice-note workflows близки | Feature; сначала доказать потребность, затем оценивать latency/cost |
| Branches / mutable audiences / session messenger | Можно сделать фундаментом только сменив правила conversation и доступов | Reject для этого продукта: высокая когнитивная цена и конфликт постоянной истории |
| Сбор / game night / LFG | Messenger сохраняется; Partiful, polls, LFG уже обслуживают задачу | Feature; частота и удержание не установлены |
| Presence / Global Сейчас / ambient | Удаление ухудшает обнаружение, но оставляет коммуникацию | Infrastructure/feature; Group Сейчас уже достаточно для проверки |
| Profile cards / cosmetics / photo widget | Удаление сохраняет разговоры; identity/private-photo аналоги существуют | Identity feature; считать отдельно от conversion в общение |
| Anonymous questions / streaks / rewards | Изменяют стимулы активности, не коммуникационный фундамент | Reject как ближайшая ставка |
| External message fragments / guest thread | Внешняя польза возможна, но остаётся shared-content feature; сложнее privacy | Не возвращать под названием нового контекста |

## 7. Решение о ближайших шести месяцах

**BET NOW:** довести Room Guest от ссылки до успешного разговора и добровольного повторного участия. Использовать его как проверяемый вход в продукт, не как обещание вирусности.

**RESERVE:** только Replay → Chat, если дневники покажут частый существующий клип-workflow. Начать с импорта/отправки уже записанного файла; собственный ring buffer и recorder разрешать себе после доказанного повторного использования. Второй резерв не нужен.

**STOP RESEARCHING:** каталоги новых названий для branches, presence, temporary conversations, voice notes, transcription, clips, gatherings, anonymous messages и profile cards. Возвращаться к ним только при новом наблюдаемом поведении или изменившемся техническом ограничении; не по календарю.

**Если у founder шесть месяцев runway:** после минимально надёжного rework я построил бы именно гостевое участие в живом разговоре. Если весь этот flow уже реально проходит приёмку, следующей работой стала бы проверка retention компаний, без добавления ещё одной механики ради novelty.

| Период | Работа | Решение на выходе |
| --- | --- | --- |
| Недели 1–2 | 12–15 существующих компаний; diary текущих действий, baseline способов приглашать/говорить/переписываться | Есть ли повторяющийся сценарий внешнего участника |
| Недели 3–6 | Законченный messenger/live slice, guest flow, сквозные события и двухклиентные проверки | Доступность ценности и техническое качество |
| Недели 7–10 | Самостоятельное использование без ежедневных напоминаний founder | Повторяют ли компании сценарий; зачем гости возвращаются |
| Недели 11–16 | Исправление доминирующих препятствий, одна повторная когорта | Держится ли эффект за пределами первых знакомых |
| Остаток runway | Углубить подтверждённый сегмент или остановить growth bet и пересмотреть аудиторию | Решение по спросу, а не косметический pivot |

**Метрики.** Единица основной оценки — компания. Weekly Connected Group: минимум два разных человека совершили взаимное общение в неделю; дополнительно отдельно считать text и live. Retention считать по неизменной когорте активированных групп. Не приравнивать отправленный ботом/system event к общению.

Guest funnel: eligible invite created → preview opened → explicit join → media connected → useful participation → voluntary signup → repeat participation → own external invitation. Отдельно failed/expired/permission-denied и invite открытый уже участником. Один человек и повторные открытия одной ссылки не должны раздувать acquisition.

**Гипотеза полезного участия:** гость пробыл с другим человеком ≥3 минут либо совершил подтверждённое взаимное действие. Длительность — прокси, не доказательство ценности; короткие успешные визиты разбирать отдельно. Считать долю активированных новых пользователей, создавших следующее приглашение, и число активированных получателей на такого пользователя. Пока полного цикла нет, говорить «invite conversion», а не «virality».

**Решение о differentiation.** Рабочая ставка — качество целой системы для определённой компании: ежедневная переписка, видимые параллельные разговоры, непрерывность сессии при навигации, понятное гостевое участие и выразимая identity. Это воспроизводимо конкурентами. Защита, если появится, будет в привычке компании и накопленном контексте; сейчас она не доказана.

## 8. Реестр источников и пределы атрибуции

Ссылки S1–S60 приведены непосредственно у фактов и составляют реестр источников. Доступ: открытые web pages/документы на 09.09.2026. Primary: официальные product/help/developer pages, исходные научные публикации и публичные сообщения самих пользователей. Secondary: репортажи о закрытых продуктах и независимые обзоры. Corporate claims о масштабах/успехе не используются как независимые доказательства.

Ключевые работы: S57 — Microsoft Research, 2015, интервью 48 участников; S58 — CHI 2017, качественная выборка 18 участников; S59 — PACM HCI 2025, diary/interviews 17 участников, доступен institutional reprint; S60 — Aoki, Szymanski, Woodruff, CSCW workshop 2006. Небольшие и контекстные выборки не дают оценки рынка Voople.

Локальные источники: `rework_plan/VOOPLE_CORE_REWORK_PLAN.md` (§3–13, §14, §20–22), `rework_plan/VOOPLE_CORE_REWORK_ADDENDUM.md` (messenger-first, guest, поздняя поправка Live Shelf), `docs/rework-integration-plan.md`, `docs/core-rework-architecture.md`, `docs/product-delivery-matrix.md`, secondary social/UX plan (§39: 44–58), приложенная развёрнутая постановка и изображения `current1–3`, `other_ref1–3`, `voople_ref_rework`. Отдельных более ранних screenshots помимо переданных семи изображений в этом сравнении нет.

### Полный список источников

Для страниц без надёжной даты публикации указана текущая справка или отсутствие даты. Дата доступа для всех записей — 09.09.2026. Историческая статья не подтверждает нынешнюю работоспособность продукта.

| ID | Автор / издатель | Материал | Дата / версия |
| --- | --- | --- | --- |
| S1 | Discord | [Text Channels & Text Chat In Voice Channels](https://support.discord.com/hc/en-us/articles/4412085582359-Text-Channels-Text-Chat-In-Voice-Channels) | Текущая справка |
| S2 | Discord | [Discord Social SDK](https://discord.com/developers/social-sdk) | Текущая документация |
| S3 | WhatsApp | [Voice Chat on WhatsApp: Audio Hangouts for groups of all sizes](https://blog.whatsapp.com/voice-chat-on-whatsapp-audio-hangouts-for-groups-of-all-sizes) | 22.05.2025 |
| S4 | Telegram | [Extra-Secure Group Calls, Automated Accounts, and More](https://telegram.org/blog/group-calls-made-easy) | 30.04.2025 |
| S5 | Signal | [How to create and share call links](https://support.signal.org/hc/en-us/articles/7860719423002-How-to-create-and-share-call-links) | Текущая справка |
| S6 | Meta | [Updates to End-to-End Encrypted Chats on Messenger](https://about.fb.com/news/2022/01/updates-to-end-to-end-encrypted-chats-messenger/amp/) | 27.01.2022 |
| S7 | Snapchat | [How do I create or join a Group Chat on Snapchat?](https://help.snapchat.com/hc/en-gb/articles/7012348774804-How-to-create-Group-Chats-on-Snapchat) | Текущая справка |
| S8 | Meta | [New Instagram DM Features to Help You Stay Connected](https://about.fb.com/news/2025/02/new-instagram-dm-features-stay-connected/amp/) | 19.02.2025 |
| S9 | Apple | [Poll people in Messages on iPhone](https://support.apple.com/en-mide/guide/iphone/iphde1787df4/ios) | Текущая справка |
| S10 | GroupMe | [Saying goodbye to SMS mode](https://www.groupme.com/blog/goodbye-sms-mode) | 2026 |
| S11 | Bumble | [Expanded Friendship Vision & Planned Geneva Acquisition](https://bumble.com/en/the-buzz/bumble-inc-friendship-communities-geneva) | 2024 |
| S12 | Bumble Support | [Changes to Bumble For Friends and Bumble BFF Mode](https://support.bumble.com/hc/en-us/articles/30781191036317-Changes-to-Bumble-For-Friends-and-Bumble-BFF-Mode) | Обновлено 30.10.2025 |
| S13 | Roblox Developer Forum | [Update on Guilded and Communities](https://devforum.roblox.com/t/update-on-guilded-and-communities/3966775) | 2025; объявление sunset |
| S14 | Slack | [Use huddles in Slack](https://slack.com/intl/en-gb/help/articles/4402059015315-Use-huddles-in-Slack) | Текущая справка |
| S15 | Microsoft Support | [Join a meeting without an account in Microsoft Teams](https://support.microsoft.com/en-us/teams/meetings/join-a-meeting-without-an-account-in-microsoft-teams) | Текущая справка |
| S16 | Epic Games / Fortnite | [Houseparty Brings Video Chat to Fortnite](https://www.fortnite.com/news/houseparty-brings-video-chat-to-fortnite?lang=en-US) | 2020; shutdown update 14.10.2021 |
| S17 | Axios | [Meet Houseparty, the next big Gen Z craze](https://www.axios.com/2017/12/15/meet-houseparty-the-next-big-gen-z-craze-1513300377) | 2017 |
| S18 | Buz | [Help Center](https://www.buz.ai/help-center/) | Без даты |
| S19 | ten ten / Apple App Store | [ten ten — your friends, on tap](https://apps.apple.com/us/app/ten-ten-your-friends-on-tap/id1481768339) | Текущий developer listing |
| S20 | TechCrunch | [Airchat, the buzzy new social app, could be great — or, it could succumb to the same fate as Clubhouse](https://techcrunch.com/2024/04/17/airchat-the-buzzy-new-social-app-could-be-great-or-it-could-succumb-to-the-same-fate-as-clubhouse/) | 17.04.2024 |
| S21 | Clubhouse | [the new clubhouse](https://blog.clubhouse.com/the-new-clubhouse/) | 2023 |
| S22 | Stereo | [About Stereo](https://stereo.com/about) | Без даты |
| S23 | Yubo | [Everything You Need to Know About Yubo](https://www.yubo.live/faq) | Текущая FAQ |
| S24 | Yope | [Yope — friends-only photo app](https://yope.app/) | Текущая страница |
| S25 | eSafety Commissioner | [Yope safety guide](https://www.esafety.gov.au/key-topics/esafety-guide/yope) | 2025 |
| S26 | Locket Help Center | [My teen asked me to get Locket. What is it?](https://help.locket.com/en/articles/14225418-my-teen-asked-me-to-get-locket-what-is-it) | 2026 |
| S27 | Retro | [Your friends, week to week](https://retro.app/) | Без даты |
| S28 | Jaewon Kim et al. | [Sharing, Not Showing Off: How BeReal Approaches Authentic Self-Presentation on Social Media Through Its Design](https://arxiv.org/abs/2408.02883) | arXiv:2408.02883, 2024 |
| S29 | TechCrunch | [Mobile social network Path, once a challenger to Facebook, is closing down](https://techcrunch.com/2018/09/17/rip-path/) | 17.09.2018 |
| S30 | Medal Support | [How to Share Your Clips on Medal](https://support.medal.tv/support/solutions/articles/48001169792) | Текущая справка |
| S31 | Discord | [Clips](https://support.discord.com/hc/en-us/articles/16861982215703-Clips) | Текущая справка |
| S32 | Valve / Steam News | [Steam Friends and Chat update, news archive](https://store.steampowered.com/news/posts/?enddate=1528841999) | 12.06.2018 |
| S33 | Xbox Wire | [578: The next Xbox One System update. And Leeroy Jenkins](https://news.xbox.com/en-us/podcast/578-the-next-xbox-one-system-update-and-leeroy-jenkins/?ver=3.7.1) | Исторический podcast transcript |
| S34 | PlayStation | [How to use party voice chat on PS5 consoles](https://www.playstation.com/en-us/support/games/ps5-party-voice-chat/) | Текущая справка |
| S35 | GamerLink | [FAQ](https://gamerlinkapp.com/faq) | Текущая FAQ |
| S36 | Partiful | [Free Online Invitations with RSVP Tracking](https://partiful.com/invitations/invitation-apps) | Текущая product page |
| S37 | NGL | [Privacy policy: description of app/link/message sender flow](https://ngl.link/p/privacy) | Политика, доступная на дату проверки |
| S38 | Jitsi | [Jitsi Meet Security & Privacy](https://jitsi.org/security/) | Текущая документация; изменение 24.08.2023 |
| S39 | Apple Support | [Join a FaceTime call from an Android or Windows device](https://support.apple.com/en-us/109364) | Текущая справка |
| S40 | TechCrunch | [GroupMe, Born At TechCrunch Disrupt, Secures Funding And Launches](https://techcrunch.com/2010/08/25/groupme-born-at-techcrunch-disrupt-secures-funding-and-launches/) | 25.08.2010 |
| S41 | TechCrunch | [Group Texting App Fast Society Distracts My Entire Panel](https://techcrunch.com/2010/10/01/group-text/) | 01.10.2010 |
| S42 | Adrian Roselli | [Color Has a Gray Pallor](https://adrianroselli.com/2011/03/color-has-gray-pallor.html) | 29.03.2011; обновление 07.07.2018 |
| S43 | Richard MacManus | [Glancee's SXSW Adventure: Battling Bad WiFi, Battery Drain & The Silicon Valley Mafia](https://ricmac.org/2012/03/19/glancees-sxsw-adventure-battling-bad-wifi-battery-drain-the-silicon-valley-mafia/) | 19.03.2012 |
| S44 | Bump | [Bump Blog: closure and product posts](https://blog.bu.mp/) | Архив, 2013–2014 |
| S45 | Thali Project | [Experimenting with FireChat on Android](https://thaliproject.org/ExperimentWithFireChat/) | Исторический technical field report, без подтверждённой даты |
| S46 | Tanya Dua / Digiday | [French World Cup team says Yo to its fans with viral app](https://digiday.com/marketing/french-soccer-team-says-yo-fans/) | 27.06.2014 |
| S47 | Miguel Helft / Forbes | [Secret, The $100 Million Social App, Shuts Down](https://www.forbes.com/sites/miguelhelft/2015/04/29/secret-the-100-million-social-app-shuts-down/) | 29.04.2015 |
| S48 | Yik Yak | [FAQ](https://yikyak.com/faq) | Текущая FAQ с историей shutdown/relaunch |
| S49 | Peach / Apple App Store | [Peach — share vividly](https://apps.apple.com/gb/app/peach-share-vividly/id1067891186) | Developer listing; исторические release notes |
| S50 | Google Official Blog | [Update on Google Wave](https://googleblog.blogspot.com/2010/08/update-on-google-wave.html) | 04.08.2010 |
| S51 | Old Timers Guild; Daemoro и участники | [Channels in Discord?](https://forums.oldtimersguild.com/t/channels-in-discord/3882) | 02–20.08.2018 |
| S52 | discord/discord-api-docs; автор issue | [Specify Position when creating a guild channel, issue 720](https://github.com/discord/discord-api-docs/issues/720) | 17.10.2018 |
| S53 | r/discordapp; автор discussion | [Repost/Idea: Integrated Text Chat in Voice Channels](https://www.reddit.com/r/discordapp/comments/j3o8kc) | 2020 |
| S54 | Telegram Bugs; Herbert, comments/admin reply | [The view as messages/view as topics function isn't working properly in the Windows 10 app](https://bugs.telegram.org/c/36325) | 17.01.2024; Closed |
| S55 | r/whatsapp; автор и участники discussion | [How to disable swipe up to talk on group chats?](https://www.reddit.com/r/whatsapp/comments/1kgyhju/how_to_disable_swipe_up_to_talk_on_group_chats/) | 07.05.2025 и последующие комментарии |
| S56 | r/MedalTV; автор и участники discussion | [Log in/Create an account or contact the clip owner to watch clip](https://www.reddit.com/r/MedalTV/comments/q21gg1) | 2021 |
| S57 | Madeline E. Smith; John C. Tang | [They're blowing up my phone: Group Messaging Practices Among Adolescents](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/youth_comm_TechReport.pdf) | Microsoft Research technical report; submitted to CHI 2015 |
| S58 | Midas Nouwens; Carla F. Griggio; Wendy E. Mackay | [WhatsApp is for family; Messenger is for friends: Communication Places in App Ecosystems](https://groups.cs.umass.edu/nmahyar/wp-content/uploads/sites/8/2019/01/reading13.pdf) | CHI 2017; DOI 10.1145/3025453.3025484 |
| S59 | Rongjun Ma; Feng Feng; Janne Lindqvist | [Channel Switching and Adaptive Behaviors in Multichannel Communication](https://acris.aalto.fi/ws/portalfiles/portal/199536161/Channel_Switching_and_Adaptive_Behaviors_in_Multichannel_Communication.pdf) | PACM HCI 9(7), CSCW220, 2025; DOI 10.1145/3757401 |
| S60 | Paul M. Aoki; Margaret H. Szymanski; Allison Woodruff | [Media Spaces in the Mobile World](https://www.paulaoki.com/papers/cscw06-media.pdf) | CSCW workshop, 2006 |
