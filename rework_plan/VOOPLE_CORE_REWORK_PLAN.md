# Voople — Core Rework Plan

Статус: целевое состояние текущей переработки. Этот файл описывает только то, что нужно реализовать сейчас.

---

## 1. Core продукта

Voople — ежедневный мессенджер с live-слоем поверх постоянных переписок.

Есть два основных контекста:

1. **Личный диалог** — постоянный DM + обычный приватный звонок.
2. **Группа** — постоянный групповой чат + постоянное Лобби + дополнительные live-комнаты.

Главная механика группы:

`общий контекст → Лобби → несколько комнат одновременно → видно, кто где → переход в один клик → возврат в Лобби`

Ключевые правила:

- текст не зависит от lifecycle комнаты;
- voice/video/screen-share — live-состояние;
- пользователь одновременно находится только в одной активной voice/video session;
- переход между комнатами одной группы не требует confirmation;
- переход из личного звонка в групповую комнату требует короткого подтверждения;
- базовая коммуникация должна быть полноценной даже если пользователь вообще не пользуется voice.

---

## 2. Что считается core

### Core

- Direct Messages
- Group Chat
- Groups
- Lobby
- Temporary Rooms
- Pinned Rooms
- Presence
- Voice
- Video
- Screen Share
- Room switching
- Mini Room
- Invites
- Notifications
- Search по сообщениям и людям
- Attachments / files / images / video / GIF
- Replies / reactions / edit / delete / pins / drafts / typing / unread

### Secondary, но сохраняется

- Profile
- Mood / status
- Music
- Posts
- Profile card / «образ»
- Cosmetics
- Store
- Voople+
- Voops
- Boosts
- Public Groups

Secondary-функции не должны определять основную навигацию и не должны мешать core-flow.

---

## 3. Модель данных

```text
User

Conversation
├── DM
└── Group Chat

Group
├── Members
├── Lobby
└── Rooms
    ├── temporary
    └── pinned

LiveSession
├── participants
├── voice
├── video
└── screen_share

Message
├── conversation_id
├── author_id
├── context_room_id?   nullable / one-to-one context record
└── content / attachments
```

### Важное правило

`Room` не владеет сообщениями. Реализация может хранить nullable-контекст в
отдельной one-to-one таблице, если это позволяет добавить новую модель без
ломающей миграции `messages`.

Если пользователь отправил скрин во время DRG:

```text
nmggk · DRG · 23:41

[screenshot]

мы приехали
```

сообщение сохраняется в Group Chat. `DRG` — только контекстная metadata.

После исчезновения DRG сообщение остаётся:

- в чате;
- в поиске;
- в медиа;
- в reply threads;
- в pins.

Название и тип Room сохраняются immutable snapshot-ом, поэтому история не
теряет контекст после архивирования временной Room.

---

## 4. Lifecycle комнат

### Lobby

- создаётся вместе с группой;
- существует всегда;
- удалить нельзя;
- является точкой возврата группы.

### Temporary Room

Создание:

- `+ Комната`;
- optional: `Отойти с <user>`.

Когда последний участник выходит:

1. комната короткое время остаётся в live-state;
2. затем исчезает из `Сейчас`;
3. её сообщения не удаляются, потому что находятся в Group Chat;
4. название можно сохранить в recent-room suggestions для быстрого повторного создания.

### Pinned Room

- существует постоянно;
- может быть создана/закреплена пользователем с правом;
- пустые pinned rooms не должны занимать центральное место на `Сейчас`;
- при отсутствии активности могут отображаться в компактном блоке `Закреплённые` или только через `+ Комната`.

---

## 5. Личный звонок

В DM header оставить обычную кнопку звонка.

Flow:

```text
DM с Anya
→ нажать Call
→ пользователь сразу подключается к приватной live-session
→ Anya получает incoming call
→ Answer / Decline
→ обычный Room UI
```

Внутри доступны:

- mic;
- output/audio;
- camera;
- screen share;
- settings;
- leave.

Если звонок свернуть — появляется Mini Room.

После завершения в DM остаётся системное сообщение:

```text
Звонок · 18 мин
```

или

```text
Пропущенный звонок
```

Composer во время DM-call пишет в тот же постоянный DM.

---

## 6. Переключение комнат группы

Пользователь находится в DRG:

```text
VOICEKK

Лобби       3
DRG         2   здесь
Valorant    2
```

Нажатие на Лобби или Valorant:

- без confirmation;
- без call setup;
- без промежуточного disconnect-screen;
- UI мгновенно показывает новое местоположение;
- короткая animation 120–200 ms;
- короткий sound cue.

### Переход между разными контекстами

Если пользователь находится в DM-call и кликает групповую комнату:

```text
Перейти в VOICEKK?
Текущий разговор с Anya закончится.

[Перейти]
```

---

## 7. Desktop IA

### Основной sidebar

```text
VOOPLE

Сейчас

ГРУППЫ
VOICEKK
Мы
Design

ЛИЧНЫЕ
Anya
Biba
Astra
nmggk

Поиск

────────
[avatar]
```

Sidebar — основной способ повседневной навигации.

### Не держать отдельными primary-пунктами

- Уведомления
- События
- Магазин
- Настройки
- Feed

### Куда их перенести

- Notifications → компактная activity/inbox button в header;
- Events → внутри Group;
- Store / Voople+ / Settings → user menu;
- Posts → Profile + Search;
- public discovery → Search.

### Mobile IA

Bottom navigation не является сжатой копией desktop sidebar. Базовые пункты:

```text
Сейчас    Чаты    Поиск    Профиль
```

Notifications открываются компактной кнопкой activity/inbox в header. Groups
доступны из `Сейчас` и списка чатов. Активная Room остаётся persistent surface
над bottom navigation и учитывает safe area.

---

## 8. Global `Сейчас`

Задача страницы — ответить: **что происходит прямо сейчас в моих группах?**

```text
Сейчас

VOICEKK                         7 онлайн
Лобби              ● ● ●
DRG                 ● ●     экран
Valorant            ● ●

Мы                              2 онлайн
Stardew Valley      ● ●

Design                          3 онлайн
Review              ● ● ●   Astra говорит
```

Внизу допускается компактное `Недавнее`:

```text
Недавнее
VOICEKK       вчера
Мы            вчера
```

Не показывать здесь:

- feed;
- рекомендации;
- магазин;
- public communities;
- right rail;
- блок `Продолжить`.

---

## 9. Group screen

Header:

```text
VOICEKK                         7 онлайн

Сейчас      Чат      Люди
```

Default tab: `Сейчас`.

### Group / Сейчас

```text
ЛОББИ                                      3
────────────────────────────────────────────
[kk] [Biba] [Yozhik]

kk  ▂▅▇▄


▸ DRG                                      2
────────────────────────────────────────────
[nmggk] [Anya]

▣ nmggk показывает экран


VALORANT                                   2
────────────────────────────────────────────
[Astra] [Woj]


Онлайн
[Test]

+ Комната
```

Правила:

- rooms — плоские секции, не карточки;
- люди стоят компактно, не растягиваются на всю ширину;
- live-content имеет max-width примерно 850–1000 px;
- `Онлайн` намного компактнее room sections;
- `+ Комната` — обычная строка/action, не большая dashed-card;
- никаких split/merge diagram, Git-tree, activity timeline;
- никаких постоянных `Active Room + Chat + Members` справа одновременно.

### Contextual right side

Правая область появляется только по действию:

- click screen share → preview drawer;
- click person → mini-profile drawer;
- group info → info drawer.

Если ничего не выбрано — правая часть может оставаться пустой.

---

## 10. Group Chat

Group Chat должен быть полноценным ежедневным мессенджером.

Поддержать:

- text;
- images;
- GIF/video;
- files;
- voice messages;
- replies;
- reactions;
- mentions;
- pins;
- drafts;
- unread;
- typing;
- search;
- edit/delete.

### Разделы

Существующие `Общий / Game / Мемы` оставить, но они принадлежат только `Чат`.

Если группа не использует разделы — пользователь видит только один чат без лишней channel hierarchy.

Room side panel, если он нужен во время live-session, показывает
access-aware фильтр сообщений Group Chat по Room context. Он не создаёт второй
текстовый lifecycle и отдельную исчезающую историю.

---

## 11. People

```text
Люди

Сейчас
kk             Лобби
Biba           Лобби
Yozhik         Лобби
nmggk          DRG
Anya           DRG
Astra          Valorant
Woj            Valorant

Онлайн
Test

Не в сети
...
```

Admin/moderation actions открываются отдельно.

People view не должен выглядеть как таблица управления сотрудниками.

---

## 12. Full Room

Сохраняем текущую механику Room.

### При screen share

Shared content занимает основную площадь.

### Controls

- mic;
- audio/output;
- camera;
- screen;
- settings;
- leave.

### Room switcher

```text
VOICEKK

Лобби       3
DRG         2   здесь
Valorant    2
```

Switcher должен позволять перейти в другую комнату одним нажатием.

---

## 13. Mini Room

Сохраняем плавающую механику.

### Standard

```text
DRG · 2

[avatar][avatar]
nmggk ▂▅▇▄

[mic] [expand] [leave]
```

### Minimal

```text
DRG · 2   nmggk ▂▅▇▄
```

При активном mic/camera/share должно всегда оставаться видимое системное состояние.

---

## 14. Profile — сохранить и привести к новой системе

Профиль остаётся глубокой identity-поверхностью. Его не надо превращать в минимальную карточку из generic reference.

Текущий профиль со сложной рамкой — ближе к целевому продукту, чем упрощённые AI-профили.

### Wide desktop layout

```text
┌──────────── identity card ────────────┐  ┌──────────── content ─────────────┐
│ banner                                │  │ Posts   Media   Questions        │
│ avatar + frame                        │  │                                  │
│ name / handle                         │  │ post                             │
│ status / role                         │  │ post                             │
│ mood                                  │  │ ...                              │
│ music                                 │  │                                  │
│ reactions                             │  │                                  │
│ share identity                        │  │                                  │
│ stats                                 │  │                                  │
└───────────────────────────────────────┘  └──────────────────────────────────┘
```

### Сохранить

- banner;
- avatar frame;
- profile frame / skin;
- name / handle;
- bio;
- online status;
- mood;
- music;
- profile reactions;
- profile stats;
- posts;
- media;
- questions;
- `Поделиться образом`;
- cosmetic post-header.

### Ограничения cosmetics

Cosmetics могут менять:

- рамки;
- фон;
- banner;
- небольшие эффекты;
- badges;
- post header decoration.

Cosmetics не меняют:

- layout;
- положение основных кнопок;
- размеры интерактивных зон;
- читаемость текста;
- navigation.

### Profile visual rule

Системный UI спокойный. Профиль пользователя может быть максимально выразительным.

На одном экране допустимы ice / meme / pastel / brutalist / retro-профили — это часть identity system, а не стиль всего Voople.

---

## 15. Mood

Mood оставить.

Это короткое пользовательское состояние, которое живёт дольше одного сообщения и короче bio.

### Показывать

- Profile;
- Mini-profile;
- optional в People/Profile hover;
- optional в Global Сейчас, только если не перегружает live-state.

### Не превращать mood в отдельную социальную ленту

Mood — identity/context, а не самостоятельная публикация по умолчанию.

Можно разрешить `Опубликовать настроение` как explicit action.

---

## 16. Music

Music оставить как полноценную identity/utility-функцию.

### Где показывать

- Profile;
- Mini-profile;
- persistent mini-player при воспроизведении;
- optional activity label рядом с пользователем;
- share-to-chat.

### Поведение

Пользователь может:

- включить трек из профиля;
- поставить паузу;
- открыть источник/детали;
- поделиться треком в DM/Group Chat;
- optionally использовать текущий трек как status.

Не превращать основной messenger UI в музыкальный сервис.

---

## 17. Profile card / `Поделиться образом`

Сохранить и усилить как viral/identity feature.

`Поделиться образом` создаёт визуальную карточку текущего профиля:

- avatar/frame;
- banner/background fragment;
- name / handle;
- mood;
- current music optional;
- short status;
- voople.ru/@handle.

Пользователь может:

- скопировать ссылку;
- сохранить/share card наружу;
- отправить в DM;
- отправить в Group Chat;
- опубликовать как post.

Карточка должна наследовать текущую косметику пользователя и быть визуально узнаваемой.

Не добавлять биржу/оценку handle в этот этап.

---

## 18. Posts

Posts сохраняются как secondary social layer.

### Где живут

- Profile → Posts;
- Search → Posts;
- direct links;
- optional subscription feed позднее.

### Не делать сейчас

- feed default Home;
- тяжёлый For You recommender;
- trends;
- creator dashboard.

Post types:

- text;
- image/media;
- poll/question;
- shared profile card;
- music/share.

Посты поддерживают identity и sharing, но не определяют core продукта.

---

## 19. Search

Ближайший scope:

```text
Сообщения
Люди
Группы
Посты
```

Глобальный поиск сообщений и поиск внутри текущего Conversation используют один
authorization-aware индекс, но разные scope и entry point.

Public Groups поддерживают:

- public;
- unlisted;
- private.

Join policy:

- open;
- request;
- invite_only.

Не создавать отдельную сущность `Community`.

---

## 20. Visual baseline

За основу разработки брать текущий «mute-like» reference:

- плотный desktop shell;
- почти чёрный фон;
- тонкие borders;
- компактные панели;
- небольшие радиусы;
- restrained violet;
- user identity даёт основной визуальный цвет.

### Не копировать буквально

Исправить в reference при переносе в продукт:

1. убрать `GLOBAL NOW` как отдельный громкий пункт;
2. убрать `Recent` из основного sidebar;
3. убрать большие dashed `+ Room` блоки;
4. убрать подсказки вида `click a room to move instantly`;
5. убрать декоративного человечка `move to another room`;
6. убрать лишние `/03`, `/02`, `/01` там, где достаточно `3`, `2`, `1`;
7. убрать постоянный cockpit из Active Room + Group Chat + Online справа;
8. не показывать пять profile examples в реальном app layout;
9. уменьшить количество рамок вокруг вторичных элементов;
10. green использовать только для live/presence;
11. violet использовать только для current/focus/primary;
12. room sections держать компактными;
13. аватары не растягивать по ширине;
14. текущий room marker сделать собственным Voople glyph;
15. speaking signal сделать собственным и единым во всём приложении.

### Что сохранить из reference

- плотность;
- контраст;
- жёсткую desktop-компоновку;
- compact sidebar;
- тонкие линии;
- restrained palette;
- сильную иерархию;
- квадратные/слабо скруглённые avatar tokens;
- ощущение утилиты, которую можно держать открытой весь день.

---

## 21. Visual tokens

### Geometry

- 3 px
- 4 px
- 6 px
- 8 px редко

### Color roles

- near-black graphite — background;
- dark graphite — surface;
- warm off-white — primary text;
- muted grey — secondary;
- Voople violet — current/focus/primary;
- green — online/live success;
- warm red — destructive/leave.

Не использовать orange brand accent, neon gradients, glassmorphism, purple blobs.

### Typography

- основной UI: clean grotesk;
- короткие room/group headings: допускается чуть более характерный condensed grotesk;
- mono/technical font только точечно для времени/малой metadata.

---

## 22. Три фирменных паттерна Voople

### 1. Current Room Marker

Небольшой glyph, производный от logo mark.

Используется для:

- current Room;
- selected nav;
- focus.

### 2. Speaking Signal

Один компактный сигнал:

```text
kk  ▂▅▇▄
```

Используется одинаково в:

- Group Сейчас;
- Room;
- Mini Room;
- People;
- Mini-profile.

### 3. Avatar Token

Default avatar: rounded-square 44–52 px.

Платная/custom frame может выходить за базовый bounding box.

---

## 23. Landing — новая структура

Лендинг должен показывать продукт, а не рассказывать абстрактные «ценности».

### Hero

**7 онлайн. 3 комнаты. 0 созвонов.**

Подзаголовок:

**Один чат для группы, несколько живых комнат. Видно, кто где. Нажал на комнату — уже там.**

CTA:

`Скачать Voople`

Secondary CTA только если web-клиент реально готов:

`Открыть в браузере`

Hero visual: короткий реальный product loop:

```text
Lobby: 7
→ двое переходят в DRG
→ двое переходят в Valorant
→ один возвращается в Lobby
```

Без 3D-рендеров, floating feature cards и gradient spheres.

### Block 1

**Кто где — видно.**

> Лобби — 3. DRG — 2. Valorant — 2. Не нужно спрашивать, где все.

### Block 2

**Перешёл. Всё.**

> Нажал на комнату — оказался там. Без новой ссылки и нового звонка.

### Block 3

**Комната исчезла. Мем остался.**

> Скрин из DRG, файл и сообщения остаются в общем чате группы.

### Block 4

**Можно вообще не заходить в войс.**

> Лички и группы работают как обычный мессенджер.

### Block 5

**Профиль можно испортить как хочешь.**

> Рамки, баннеры, фон, настроение, музыка и эффекты. Кнопки остаются на месте.

Показать реальный кастомизированный профиль, близкий к текущему screenshot, а не generic card.

### Block 6

**Музыка тоже здесь.**

Показать:

- профиль с треком;
- mini-player;
- share track в чат.

Текст держать буквально описательным, без «музыка объединяет».

### Footer / download

- Windows;
- macOS / Linux / mobile только если реально доступны;
- version;
- system requirements;
- privacy / terms / status / changelog.

---

## 24. Brand voice

Тон:

- короткий;
- сухой;
- конкретный;
- немного странный;
- geeky;
- без корпоративного восторга.

### Допустимые строки

- `7 онлайн. 3 комнаты. 0 созвонов.`
- `Кто где — видно.`
- `Перешёл. Всё.`
- `Комната исчезла. Мем остался.`
- `Можно вообще не заходить в войс.`
- `Профиль можно испортить как хочешь.`
- `Biba зовёт в Лобби.`
- `DRG опустела.`
- `Экран nmggk.`
- `Микрофон не найден.`

### Не использовать

- «свои»;
- «твоё место»;
- «твои люди»;
- «будь рядом»;
- «общение без границ»;
- «всё в одном месте»;
- «новое поколение общения»;
- «для игр, работы и учёбы»;
- «пространство для общения»;
- «место, куда возвращаются».

---

## 25. SMM / product marketing

Основной формат — короткие реальные product clips.

### Clip A

```text
Lobby · 7
→ 2 уходят в DRG
→ 2 уходят в Valorant

7 онлайн. 3 комнаты.
Voople
```

### Clip B

Hover Valorant → click → avatar перемещается.

Текст:

`перешёл. всё.`

### Clip C

Во временной DRG отправляется скрин.

Позже DRG исчезает.

Скрин остаётся в Group Chat.

Текст:

`комната исчезла. мем остался.`

### Clip D

Кастомный профиль → mood → track → share identity card.

Текст:

`да, профиль можно было не делать таким. но уже поздно.`

---

## 26. Монетизация

### Free

- DM;
- Group Chat;
- Lobby;
- Temporary Rooms;
- normal voice;
- baseline screen share;
- basic profile;
- basic cosmetics.

### Voople+

- higher stream quality / bitrate;
- larger uploads;
- animated cosmetics;
- advanced profile customization;
- premium effects/themes;
- periodic Voops bonus;
- 1 Boost.

### Voops

- avatar frames;
- profile frames;
- banners;
- backgrounds;
- post header cosmetics;
- effects;
- gifts.

### Boosts

Оставить существующую progress + allocation architecture, но не делать её текущим growth-focus.

---

## 27. Analytics

### Messaging

- dm_opened
- group_chat_opened
- message_sent
- reply_sent
- reaction_added
- attachment_sent
- search_used

### Live

- group_now_opened
- room_created
- room_joined
- room_switched
- room_left
- lobby_joined
- lobby_returned
- room_became_empty
- screen_share_started
- mini_room_opened

### Identity

- profile_opened
- mood_changed
- track_started
- track_shared
- identity_card_shared
- post_created
- cosmetic_equipped

### Acquisition

- invite_created
- invite_opened
- invite_joined
- guest_joined
- signup_after_guest

Не отправлять содержимое сообщений/медиа в analytics.

---

## 28. Главные метрики

- D1 / D7 / D30 retention;
- Weekly Active Groups;
- users per active group;
- days active per group;
- Room Split Rate;
- Room Switch Rate;
- Lobby Return Rate;
- group text usage on days without voice;
- invite → activated user conversion;
- avg voice room duration;
- screen-share hours;
- infrastructure cost / active user;
- infrastructure cost / room hour;
- payer conversion;
- ARPPU.

Activation:

> пользователь получил ответ в DM/Group Chat ИЛИ провёл live-session с другим человеком в первые 24 часа.

---

## 29. Порядок реализации

### P0 — Core architecture

- Lobby;
- Room types;
- temporary lifecycle;
- room switching;
- presence;
- context_room_id;
- DM calls;
- cross-context confirmation.

### P1 — Desktop shell

- compact sidebar;
- Global Сейчас;
- Group Сейчас;
- Chat;
- People;
- contextual drawers.

### P2 — Room

- room switcher;
- full room;
- mini room;
- minimal room;
- speaking signal;
- screen share states;
- room switch animation.

### P3 — Daily messenger polish

- drafts;
- reliable unread;
- search;
- replies;
- attachments;
- voice messages;
- notifications;
- sync.

### P4 — Profile / identity

- сохранить текущий profile skeleton;
- интегрировать новую shell-систему;
- mood;
- music;
- reactions;
- share identity card;
- post header cosmetics.

### P5 — Landing / acquisition

- новый landing;
- invite preview;
- download flow;
- analytics;
- guest join после проверки core.

### P6 — Economy

- Store polish;
- Voople+;
- Voops;
- gifts;
- Boosts только после появления устойчивых активных групп.

### P7 — Later

- public Group discovery;
- Events expansion;
- subscription feed;
- advanced recommendations;
- username marketplace.

---

## 30. Definition of Done

Пользователь должен без объяснений уметь:

1. открыть Voople и сразу увидеть свои группы и DM;
2. написать человеку;
3. позвонить человеку из DM;
4. свернуть звонок и продолжить пользоваться приложением;
5. открыть группу и сразу увидеть, кто где;
6. зайти в Room одним кликом;
7. перейти из Room в Lobby одним кликом;
8. создать временную Room;
9. отправить скрин во время Room;
10. найти этот скрин после исчезновения Room;
11. использовать Group Chat в день без voice;
12. открыть профиль;
13. изменить mood;
14. включить музыку;
15. поделиться треком;
16. поделиться своей profile card;
17. опубликовать post;
18. изменить cosmetics без поломки layout.
19. выполнить те же core-flow на 360 px без сжатия desktop-компоновки.

---

## 31. Нефункциональный критерий

Voople должен выглядеть как приложение, которое можно держать открытым весь день.

Системный интерфейс:

- простой;
- плотный;
- тёмный;
- быстрый;
- немного странный;
- без визуального шума.

Пользовательская identity:

- может быть яркой;
- может быть абсурдной;
- может быть анимированной;
- не должна ломать usability.

Главный визуальный baseline — текущий compact mute-like reference, доработанный по правилам этого файла.
