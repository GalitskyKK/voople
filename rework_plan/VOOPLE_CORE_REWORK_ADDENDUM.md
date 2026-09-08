# Voople — Core Rework Addendum

Статус: дополнение к `VOOPLE_CORE_REWORK_PLAN.md`.

Этот файл **не заменяет** основной rework plan. Он меняет только перечисленные ниже продуктовые приоритеты и должен читаться поверх исходного плана.

Если решение из этого файла противоречит исходному плану — в рамках текущей переработки приоритет у этого addendum.

---

## 1. Главное изменение продуктовой иерархии

Voople остаётся **ежедневным мессенджером с live-слоем поверх постоянных переписок**.

Главная корректировка:

- несколько voice-комнат больше не считаются главным USP продукта;
- основная ежедневная поверхность — **переписка**;
- live-разговор появляется поверх переписки как естественное текущее состояние;
- Lobby / Temporary Rooms / Pinned Rooms остаются в архитектуре, но становятся инфраструктурой live-слоя;
- комнаты не нужно искусственно скрывать или удалять ради отличия от Discord.

Новая базовая модель группы:

```text
постоянный групповой чат
        ↓
кто-то зашёл поговорить
        ↓
live-state сразу виден в группе
        ↓
остальные входят одним нажатием
        ↓
если людей/разговоров стало несколько — используются комнаты
        ↓
чат всё время остаётся тем же
```

---

## 2. Messenger-first

Voople должен быть пригоден для обычного ежедневного общения даже в дни без voice.

### Обязательный baseline

DM и Group Chat должны поддерживать без компромиссов:

- text;
- images;
- GIF/video;
- files;
- voice messages;
- replies;
- reactions;
- mentions;
- edit/delete;
- pins;
- drafts;
- typing;
- reliable unread;
- search;
- message sync desktop ↔ mobile;
- stable notifications / push;
- media history;
- DM calls.

Цель: пользователь не должен уходить в Telegram только потому, что в Voople неудобно вести обычную переписку.

Это не означает копирование всех функций Telegram. Каналы, stories, bots, mini-apps, creator tooling и massive public groups не являются текущим scope.

---

## 3. Group screen: default = Chat

В исходном плане Group default tab был `Сейчас`. Меняем приоритет.

### Новый default

```text
VOICEKK

Чат      Сейчас      Люди
```

По умолчанию открывается `Чат`.

### Live-strip над чатом

Если никто не разговаривает — отдельного большого live-блока нет.

Если кто-то находится в Lobby/Room:

```text
● Biba, kk и Anya говорят сейчас              [Зайти]
```

Если одновременно активны несколько комнат:

```text
Сейчас
Лобби      3
DRG        2
Valorant   2

[Открыть]
```

Live-strip должен быть компактным и не отнимать место у переписки.

---

## 4. Rooms остаются, но не являются позиционированием

Сохраняются:

- Lobby;
- Temporary Rooms;
- Pinned Rooms;
- room switching;
- Mini Room;
- Full Room;
- camera;
- screen share;
- room context metadata.

Правила lifecycle из основного плана не меняются.

### Роль Rooms

Rooms нужны, когда одной компании реально требуется несколько одновременных разговоров.

Они не должны быть причиной существования Voople в marketing-copy и onboarding.

---

## 5. Global `Сейчас` понизить в приоритете

Отдельный большой Global `Сейчас` больше не является обязательной P1-поверхностью.

### P1 достаточно показывать live-state прямо в sidebar

```text
ГРУППЫ
VOICEKK      ● 3 говорят
Мы           2 новых
Design       ▣ экран
```

Статусы должны использовать только то, что Voople знает точно:

- кто находится в live-session;
- сколько людей говорит;
- активен ли screen share;
- unread/activity внутри Voople.

Не строить core вокруг внешнего game/music presence без надёжных интеграций.

### Полный Global `Сейчас`

Оставить как future/optional surface.

Добавлять только после проверки, что пользователи действительно состоят в нескольких одновременно живых группах и такой экран сокращает путь к действию.

---

## 6. Guest Join — часть core growth architecture

Guest Join нельзя оставлять только как поздний acquisition-эксперимент.

### Цель

Снизить стоимость приглашения нового человека в текущий разговор.

### Flow

```text
участник создаёт live invite
        ↓
voople.ru/invite/...
        ↓
web preview
        ↓
видно название группы / текущий разговор / участников
        ↓
[Зайти гостем]
        ↓
voice / screen share / ограниченный chat
```

Аккаунт нужен для:

- постоянного членства в группе;
- полной истории;
- DM;
- notifications;
- profile/identity;
- возврата в группу позже.

---

## 7. Room Guest и Group Member — разные сущности

Добавить явную продуктовую разницу.

### Group Member

- постоянный участник группы;
- видит историю;
- получает unread / notifications;
- может участвовать в групповой переписке по правилам группы.

### Room Guest

- приглашён только в конкретный live-разговор;
- не обязан становиться постоянным участником группы;
- может позже получить предложение `Добавить в группу`;
- не должен автоматически засорять member list.

Пример:

```text
VOICEKK

Лобби
nmggk
Biba
Anya

DRG
nmggk
Woj       guest
Astra     guest
```

Это важно для пересекающихся компаний и одноразовых игровых сессий.

---

## 8. Mobile — обязательная часть продукта

Mobile-клиент не является companion-only приложением.

Обязательный mobile scope:

- DM;
- Group Chat;
- message sync;
- notifications / push;
- voice messages;
- DM calls;
- join Lobby/Room;
- camera;
- базовый screen share/viewing;
- guest links / deep links;
- profile;
- attachments/media;
- search.

Desktop остаётся более сильным для:

- длительного voice;
- screen share;
- игр;
- Mini Room;
- multitasking;
- будущих instant-replay экспериментов.

---

## 9. Profile / Mood / Music / Posts — новый приоритет

### Profile

Сильный кастомизируемый профиль сохранить.

Оставить:

- avatar;
- avatar frame;
- banner;
- profile frame / skin;
- name / handle;
- bio;
- reactions;
- cosmetics;
- share identity card;
- posts/media, если уже существуют и не мешают core.

### Mood

Не развивать как core-feature.

Можно оставить в профиле как необязательное поле.

Не строить вокруг него Global `Сейчас`, feed или retention-loop до появления доказанного использования.

### Music

Не делать ключевым presence-механизмом.

Оставить существующую profile/mini-player функциональность, если она уже работает.

Не вкладывать значительную разработку в универсальный social music layer без надёжных источников данных.

### Posts

Оставить secondary.

Не делать default feed / recommender / creator ecosystem.

---

## 10. Два продуктовых эксперимента после core

Они не входят в P0–P3 и не должны тормозить основной rework.

### Experiment A — Speech → Live Transcript

Цель: дать отправителю скорость голоса, а получателю скорость чтения.

Flow:

```text
пользователь говорит
        ↓
текст появляется у собеседника ещё во время речи
        ↓
после окончания остаётся обычное сообщение
        ↓
аудио доступно как оригинал
```

Критерий качества:

- transcript начинает появляться во время речи;
- задержка должна ощущаться близкой к real-time;
- получателю не требуется слушать audio;
- обычный typed text остаётся равноправным способом общения.

Если transcript появляется только после отправки voice-message, experiment не считается реализованным по исходной гипотезе.

### Experiment B — Instant Replay → Chat

Цель: максимально короткий путь от момента в игре/экране до сообщения в группе.

Flow:

```text
игра / экран
        ↓
hotkey
        ↓
последние 20–60 секунд
        ↓
клип сразу появляется в выбранном чате
        ↓
upload идёт в фоне
```

Не делать:

- отдельную clip-social-network;
- editor-first flow;
- публичную clip feed;
- Medal clone.

Главная ценность — `момент → чат` одним действием.

---

## 11. Invite / viral loop

Главный текущий growth-loop:

```text
группа уже активна
        ↓
участник зовёт конкретного человека
        ↓
человек открывает live invite
        ↓
заходит гостем без регистрации
        ↓
получает immediate value
        ↓
создаёт аккаунт для постоянного участия
```

### Live invite preview

Пример:

```text
VOICEKK

Biba
Anya
nmggk

3 говорят сейчас

[Зайти]
```

Статический текст `Вас пригласили в Voople` не должен быть основной формой invite-preview.

---

## 12. Метрики: поправка

Room-метрики остаются диагностическими, но перестают быть главными признаками жизнеспособности продукта.

### Главные

- D1 / D7 / D30 user retention;
- D7 / D30 group retention;
- Weekly Active Groups;
- active days per group;
- доля active groups с text usage;
- доля active groups с voice usage;
- доля groups, использующих text и voice в разные дни;
- invite_opened → invite_joined;
- guest_joined → signup_after_guest;
- new active groups created by existing users;
- messages per active group/day;
- live sessions per active group/week;
- infrastructure cost / active user;
- infrastructure cost / live hour;
- payer conversion;
- ARPPU.

### Диагностические

- Room Split Rate;
- Room Switch Rate;
- Lobby Return Rate;
- avg Room duration;
- screen share hours.

Не использовать Room Split Rate как основной product-success критерий.

---

## 13. Обновлённый порядок реализации

### P0 — Core architecture

Без изменений по основным сущностям:

- DM / Group Conversation;
- Lobby;
- Rooms;
- LiveSession;
- context_room_id;
- DM calls;
- room switching;
- cross-context rules.

Дополнительно:

- GuestSession / RoomGuest model;
- invite/deep-link architecture;
- account conversion from guest.

### P1 — Daily messenger shell

- compact desktop sidebar;
- Group default = Chat;
- live-strip над чатом;
- DM;
- Group Chat;
- People;
- search;
- unread;
- notifications.

### P2 — Live layer

- Lobby;
- Room join/switch;
- Full Room;
- Mini Room;
- screen share;
- speaking signal;
- live-state в sidebar;
- guest join.

### P3 — Messenger reliability

- drafts;
- sync;
- media history;
- reliable push;
- attachments;
- replies;
- voice messages;
- search quality;
- mobile parity по messaging.

### P4 — Mobile parity

- complete DM/Group flow;
- calls;
- Lobby/Room join;
- deep links;
- guest join;
- notifications;
- profile.

### P5 — Identity / acquisition

- сохранить текущий expressive profile;
- cosmetics;
- profile card;
- live invite preview;
- landing;
- analytics;
- download/install flows.

### P6 — Product experiments

A/B / limited rollout:

- Speech → Live Transcript;
- Instant Replay → Chat.

Ни один experiment не становится core до подтверждённого повторного использования.

### P7 — Economy

- Voople+;
- Voops;
- gifts;
- Store polish;
- Boosts только после устойчивого group retention.

---

## 14. Definition of Done — дополнение

После текущего rework пользователь должен без объяснений уметь:

1. ежедневно переписываться в DM и Group Chat;
2. продолжить тот же диалог на другом устройстве;
3. открыть группу и сразу увидеть обычный чат;
4. заметить, что участники уже говорят;
5. войти в текущий разговор одним действием;
6. продолжить переписку во время live-session;
7. при необходимости перейти в другую Room;
8. пригласить человека только в текущий Room;
9. открыть invite в браузере без аккаунта;
10. войти гостем;
11. после этого создать аккаунт и стать постоянным участником;
12. пользоваться Voople в день, когда никто не заходил в voice.

---

## 15. Текущий продуктовый тезис

Использовать внутри команды, а не как обязательный marketing slogan:

> **Voople — messenger-first приложение для постоянных небольших компаний, где live-разговор является естественным состоянием переписки, а не отдельной системой звонков или серверных voice-каналов.**

Роли компонентов:

```text
Messenger
└ ежедневное использование

Live
└ главное UX-отличие

Rooms
└ инфраструктура для нескольких разговоров

Guest Join
└ growth / low-friction acquisition

Profile + Cosmetics
└ identity / monetization

Speech→Transcript / Replay→Chat
└ будущие кандидаты на сильный product hook
```

---

## 16. Что специально НЕ менять этим addendum

Не переписывать без отдельной причины:

- базовую Conversation / Group / Room / LiveSession model;
- правило `Room не владеет сообщениями`;
- lifecycle Temporary / Pinned Rooms;
- DM call model;
- room switch без confirmation внутри одной группы;
- Mini Room;
- Full Room;
- screen share architecture;
- compact mute-like visual baseline;
- текущие ограничения cosmetics;
- базовую free / Voople+ / Voops модель.

Этот addendum меняет **иерархию и приоритеты**, а не требует заново перепроектировать уже согласованный фундамент.

---

## 14. Поправка: messenger-first не означает chat-only

После проверки UI-концепта уточнить разделы 3–5 этого addendum.

Voople остаётся messenger-first по ежедневному использованию, но live-слой должен оставаться first-class, когда он активен. Нельзя превращать групповой voice в маленький баннер, который выглядит как вторичная функция обычного мессенджера.

### Правило адаптивной иерархии

```text
нет активного voice
→ Chat занимает почти весь экран

1 активный разговор
→ над Chat появляется компактный Live Shelf

2+ активных комнаты
→ Live Shelf показывает каждую активную комнату отдельно

пользователь открыл Сейчас
→ полноценный обзор комнат и участников

пользователь уже в комнате
→ Mini Room + быстрый room switcher остаются доступны поверх навигации
```

### Group header

```text
VOICEKK

Чат      Сейчас      Люди                         [Войти в Лобби]
```

`Войти в Лобби` — постоянное компактное действие в header. Если пользователь уже в live-session, вместо него показывается текущее состояние/управление.

### Live Shelf в Chat

Не агрегировать несколько параллельных разговоров в строку `7 говорят сейчас`.

Если активна одна комната:

```text
● Лобби
Biba  kk  Anya                                      [Зайти]
```

Если активны несколько комнат:

```text
Сейчас

Лобби      [Biba][kk][Anya]              3
DRG        [nmggk][Woj]                  2   экран
Valorant   [Astra][Test]                 2
```

Shelf должен занимать минимум высоты, но давать мгновенный ответ на `кто где` и позволять войти в конкретную комнату одним нажатием.

Пустые pinned rooms в Shelf не показываются.

### `Сейчас` остаётся полноценной live-поверхностью группы

Понижение приоритета Global `Сейчас` не означает удаление Group `Сейчас`.

Group `Сейчас` нужен для сценария, когда одна компания параллельно сидит в нескольких играх/разговорах.

Пример:

```text
VOICEKK

ЛОББИ                                      3
[Biba] [kk] [Anya]

DRG                                        2
[nmggk] [Woj]
▣ nmggk показывает экран

VALORANT                                   2
[Astra] [Test]

Закреплённые
Minecraft
Фильмы

+ Комната
```

Активные комнаты визуально главнее пустых закреплённых.

### Sidebar

Группа должна одновременно работать как вход в messenger и как быстрый вход в live.

```text
VOICEKK                       ● 7 в голосе
                              3 комнаты
```

Рекомендуемая модель взаимодействия:

- click по названию/строке группы → открыть последний используемый Group view или Chat;
- click по live badge / live avatars → открыть `Сейчас`;
- hover action `mic` → войти в Lobby;
- unread остаётся отдельным индикатором и не смешивается с live-state.

Не заставлять пользователя выбирать между `мессенджером` и `говорилкой`: оба действия должны быть доступны из одной строки группы.

---

## 15. Параллельные компании и несколько игр

Одна Group может одновременно содержать несколько активных live-разговоров. Это обязательный поддерживаемый сценарий, а не edge case.

Пример одной постоянной компании:

```text
VOICEKK

Лобби        3
DRG          2
Valorant     2
```

Это означает:

- все 7 человек остаются участниками одной Group;
- Group Chat общий и постоянный;
- каждая активная Room имеет свой live состав;
- один пользователь находится максимум в одной voice-session одновременно;
- переход между Room внутри Group — один клик;
- Pinned Room подходит для регулярно повторяющихся контекстов (`Valorant`, `DRG`, `Фильмы`);
- Temporary Room подходит для разового разделения;
- пустые Pinned Room не должны засорять основной Chat/Live Shelf.

### Пересекающиеся компании

Если человек из другой компании нужен только на конкретный вечер, использовать Room Guest.

```text
VOICEKK / DRG
nmggk
Biba
Woj      guest
Astra    guest
```

Если человек начинает регулярно участвовать в общей переписке и live-сессиях, его можно добавить как Group Member.

Не создавать отдельную Group на каждую игру только ради voice-room. Группа соответствует устойчивой социальной компании; Room соответствует текущему разговору/занятию.

---

## 16. Коррекция визуального референса

Новый Chat-first reference использовать только как демонстрацию messenger-поверхности. Он не является целевым layout для live-state.

Сохранить из исходного mute-like reference:

- полноценную `Сейчас`-поверхность группы;
- явное отображение нескольких одновременно активных комнат;
- компактные участники внутри Room;
- room switcher;
- Mini Room;
- сильное ощущение, что voice является базовой возможностью продукта.

Исправить относительно исходного reference:

- Chat — нормальная ежедневная default-поверхность;
- active Rooms показываются поверх Chat через Live Shelf;
- убрать Global Now как громкую обязательную сущность;
- убрать гигантский `+ Room`;
- убрать декоративные подсказки/диаграммы;
- не держать постоянный right-side cockpit;
- пустые pinned rooms убирать из active surface;
- DM и Group должны визуально ощущаться как части одного messenger shell.

Целевая формула UI:

```text
calm messenger when nobody talks
+
obvious live layer when somebody talks
+
full room overview when several conversations exist
```
