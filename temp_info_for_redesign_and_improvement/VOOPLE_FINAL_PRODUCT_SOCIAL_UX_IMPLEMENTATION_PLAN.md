# VOOPLE — FINAL PRODUCT / SOCIAL / UX IMPLEMENTATION PLAN

Статус: целевая спецификация для реализации. Документ дополняет
`VOOPLE_PROJECT_SPEC.md`; при конфликте применяется иерархия из
`VOOPLE_REFERENCE_MAP.md`.

---

# 1. Core продукта

Voople строится вокруг двух пользовательских циклов.

## Свои

```text
Сейчас
→ человек / группа
→ Написать / Зайти / Позвать
→ чат / комната
→ совместное общение
→ возврат
```

## Новые люди

```text
Интерес
→ публичная группа
→ люди / активность / комнаты
→ вступление
→ общение
→ формирование постоянных связей
```

Главные продуктовые сущности:

- пользователь;
- личный чат;
- группа;
- раздел группы;
- комната;
- событие;
- пост;
- публичная страница группы;
- интерес / тема;
- Voops;
- Boost;
- Voople+.

---

# 2. Группы и сообщества

Использовать одну сущность `Group`.

У группы добавить два независимых параметра.

## Visibility

```text
private
unlisted
public
```

### private
- отсутствует в глобальном поиске;
- вход через приглашение.

### unlisted
- отсутствует в глобальном поиске;
- доступна по публичной ссылке.

### public
- присутствует в Search;
- имеет публичную страницу;
- может участвовать в рекомендациях.

## Join policy

```text
open
request
invite_only
```

UI-терминология:

- внутри `Чаты` → **Группы**;
- в Discovery → **Сообщества**.

Один и тот же объект после вступления появляется в списке групп пользователя.

---

# 3. Интересы

Добавить нормализованную систему interests/topics.

Пример:

```text
Игры
  Valorant
  Minecraft
  Deep Rock Galactic

Технологии
  Programming
  Web
  Linux

Творчество
  UI/UX
  Blender
  Photography

Музыка
Кино
Аниме
и т.д.
```

## User

Пользователь может выбрать до 10 интересов.

Публично отображаются только выбранные пользователем интересы.

## Group

Публичная группа имеет:

```text
primary_category
topics[]
language
region optional
```

Рекомендуемый лимит:

- 1 основная категория;
- до 5 topics.

---

# 4. Главная

Desktop:

```text
Sidebar

Main
├── Главная
├── Сейчас
├── Для вас / Подписки / Сообщества
└── Feed

Right rail
├── собственный mini-profile
├── Продолжить
└── Ваши сообщества
```

При уменьшении ширины:

1. скрывается right rail;
2. sidebar переходит в compact;
3. основной feed сохраняет нормальную ширину.

---

# 5. Блок «Сейчас»

Назначение: отображать актуальное состояние ближнего круга пользователя.

## Допустимые состояния

```text
online
playing
listening
in_room
```

Примеры:

```text
Biba
● В сети
[Написать]

WATDOINK?
🎮 Deep Rock Galactic
[Позвать]

nmggk
🎧 UNIQ
[Написать]

kk
🎙 4 в комнате
[Зайти]
```

## Количество

Desktop:
- до 5 элементов.

Mobile:
- горизонтальный список.

## Источники кандидатов

Использовать:

- accepted DM relationships;
- общие группы;
- закреплённых пользователей;
- недавнее взаимное общение.

## Ranking

Начальная rule-based система:

```text
active room                    +100
pinned user                     +50
playing                         +35
listening                       +20
online                          +10

communicated today              +30
communicated last 3 days        +20
high relationship score         +20
```

Дальше сортировать по итоговому score.

## Закрепления

Разрешить закрепить до 3 пользователей.

Закрепление увеличивает ranking.

## Empty state

Использовать компактный вариант:

```text
Сейчас тихо                         Позвать своих →
```

Высота блока около 48–56 px.

Пустой `Сейчас` не должен занимать большую карточку.

---

# 6. Блок «Продолжить»

Назначение: вернуть пользователя в незавершённое общение.

Максимум:

```text
3–4 элемента
```

Пример:

```text
Продолжить

Biba
Вы: вечером посмотрю                       2

kk
Yozhik: зайдёшь сегодня?                   1

Design
Черновик: насчёт нового экрана...          •
```

## Ranking

```text
mention/reply to user            +100
unread                            +70
draft                             +60
conversation today                +40
recent reciprocal conversation   +30
recently opened                   +5
```

Учитывать:

- unread count;
- draft;
- последнее meaningful interaction;
- direct replies;
- mentions.

## Dedup

Если объект уже отображается в `Сейчас` как active Room, не показывать тот же объект одновременно в `Продолжить`.

---

# 7. Relationship graph

Добавить внутренний relationship score.

Пользователю его не показывать.

Источники:

```text
accepted DM                 +40
shared active group         +30
reciprocal messages         +25
shared Room                 +20
mutual contacts             +15
shared interests            +10
pinned                      +30
```

Добавить time decay.

Использовать score для:

- `Сейчас`;
- `Продолжить`;
- suggestions;
- invite recommendations;
- people ranking.

---

# 8. Глобальный Search / Discovery

Страница без запроса:

```text
Поиск
[ Найдите людей, сообщества, посты... ]

Все   Люди   Сообщества   Посты

Активно сейчас
...

По вашим интересам
...

Люди, которых вы можете знать
...

Сообщества
...
```

Не показывать слишком много секций одновременно.

Основной desktop экран:

- 2–3 секции;
- остальные через `Показать все`.

---

# 9. Поиск внутри Чатов

Поиск внутри `Чаты` ищет только:

- мои личные чаты;
- мои группы;
- мои контакты.

Если результатов нет:

```text
Ничего не найдено

Искать «cyberpunk» во всём Voople →
```

Глобальный Discovery и поиск пользовательских чатов должны оставаться разными search scopes.

---

# 10. Страница темы

Каждый topic может иметь discovery page.

Пример:

```text
Blender

Сейчас
────────────────
3D Artists
🎙 7 в комнате
[Зайти]

Сообщества
────────────────
Blender RU
34K участников

3D Beginners
8.2K участников

Люди
────────────────
Astra
Blender · UI/UX
2 общих сообщества

Посты
────────────────
...
```

Topic page открывается из Search, профиля, группы или post tags.

---

# 11. Рекомендации сообществ

Community ranking начать с rule-based системы.

Пример факторов:

```text
interest match                  35%
friends/mutuals inside          20%
currently active users          15%
community retention             10%
meaningful recent activity      10%
language/region                 10%
```

Дополнительный quality score учитывать отдельно:

- reports;
- bans;
- spam;
- retained members;
- активность разных пользователей;
- качество moderation;
- возвращаемость новых участников.

Размер группы не должен быть главным ranking factor.

---

# 12. Карточка сообщества

Стандарт:

```text
[BANNER]

[avatar] DesignHub
         8.7K участников

UI/UX · Figma · Frontend

Biba и ещё 4 ваших знакомых здесь

🎙 12 сейчас общаются

[Посмотреть]
```

Главные social signals:

- знакомые внутри;
- активные участники;
- активная Room;
- topics.

---

# 13. Публичная страница группы

Для `public` и `unlisted` групп.

Структура:

```text
Banner

Avatar
Название
Описание

Количество участников
Количество online
Активность сейчас

Ваши знакомые здесь
[avatars]

Topics

Разделы

Активные комнаты
События

[Вступить]
```

После вступления группа появляется:

```text
Чаты → Группы
```

---

# 14. Участники группы

Для маленьких групп оставить простой member list.

Для крупных добавить member directory.

## Tabs

```text
Сейчас
В сети
Все
Роли
```

## User card

```text
[avatar frame] Astra

@astra
● Онлайн

UI/UX · Blender

2 общих интереса

[Профиль]
```

## На public group page

Показывать:

```text
Сейчас здесь
[avatar] [avatar] [avatar] +12

Ваши знакомые
[avatar] [avatar] +3
```

Видимые лица важнее одной цифры количества участников.

---

# 15. Поиск людей

Рекомендация пользователя должна иметь объяснимый контекст.

Пример:

```text
Astra
@astra

UI/UX · Blender

Biba и ещё 2 общих знакомых
2 общих сообщества

[Профиль] [Написать]
```

Основные ranking signals:

1. общая группа;
2. общие знакомые;
3. общие interests;
4. совместная активность в public group;
5. shared Room;
6. follow graph.

---

# 16. Статус «Открыт к общению»

Добавить optional social intent.

Варианты:

```text
💬 Можно написать
🎙 Можно позвать
🎮 Ищу компанию
```

Пользователь самостоятельно включает статус.

Показывать:

- Search;
- profile;
- mini-profile;
- member directory.

Статус должен иметь expiration:

```text
1 час
4 часа
Сегодня
Пока не отключу
```

---

# 17. DM requests

Для незнакомых пользователей использовать requests.

Flow:

```text
Написать
→ Request
→ recipient accepts/rejects
→ обычный DM
```

Карточка request:

```text
Astra хочет написать вам

2 общих сообщества
Biba и Yozhik — общие знакомые

«Привет, видел твой пост про Blender»

[Принять] [Отклонить]
```

Добавить:

- rate limit;
- block;
- report;
- privacy restrictions.

---

# 18. Follow graph

`Follow` отвечает за публичный контент.

Используется в:

- Feed;
- Posts;
- Notifications.

Communication graph строится отдельно из:

- accepted DM;
- групп;
- комнат;
- reciprocal interaction.

`Сейчас` использует communication graph.

Feed использует follow graph.

---

# 19. Mini-profile

По клику на пользователя:

```text
[avatar + frame]

Astra ●
@astra

💬 Можно написать
🌙 спокойный вечер
🎵 The Midnight — Crystalline
🎮 играет в Valorant

Общие группы
○ ○ ○ +3

Общие интересы
UI/UX · Blender

[Написать]
[Позвать]

🎙 3 в комнате · Зайти
```

Для незнакомого пользователя показывать:

- общие группы;
- общие интересы;
- общих знакомых.

---

# 20. Privacy / Presence Settings

Добавить отдельный раздел:

```text
Настройки
→ Приватность и активность
```

Параметры:

```text
Кто видит мой онлайн
Кто видит мою игровую активность
Кто видит музыку
Кто видит мои комнаты
Кто может приглашать меня
Кто может отправлять запросы на общение
Показывать меня в рекомендациях
Показывать мои интересы
```

Базовые scopes:

```text
Все допустимые пользователи
Контакты и общие группы
Только контакты
Никто
```

---

# 21. User Settings

Целевая структура:

```text
Настройки

Оформление
Интерфейс
Чаты
Уведомления
Приватность и активность
Голос и видео
Горячие клавиши
Безопасность
Устройства
Документы
```

Desktop:

```text
settings navigation | settings content
```

Использовать нормальную рабочую ширину content area.

Header сделать компактным.

---

# 22. Чаты

Целевая desktop структура:

```text
Global Nav | Chat List | Conversation
```

Members и Group Info открывать как right drawer.

## Group header

```text
[avatar] kk
         4 участника

# Общий   🎮 Game   +

                 Search
                 Members
                 Info
                 More

                 🎙 3 в комнате · Зайти
```

Создание раздела через компактный `+` рядом со списком разделов.

---

# 23. Group Info

Drawer / отдельный экран:

```text
Banner
Avatar
Name
Description

4 участника
3 online

🎙 3 сейчас в комнате
[Зайти]

Topics
Sections
Members

[Пригласить]
```

Для владельца:

```text
[Настройки группы]
```

---

# 24. Room activity в истории чата

Убрать поток повторяющихся system events вида:

```text
Комната открыта
Встреча завершена
Комната открыта
...
```

Текущую active Room показывать отдельным actionable state:

```text
Biba открыл комнату

🎙 3 человека
[Зайти]
```

Историю можно агрегировать:

```text
Сегодня в комнате общались 54 мин
```

или хранить только в activity/history.

---

# 25. Rooms

Состояния:

```text
Full
Screen Share
Empty
Mini
Compact
Minimal
```

## Compact

```text
🎙 kk · 4
Biba говорит

[mic] [expand] [leave]
```

## Minimal

```text
🎙 kk · 4 ●
```

Активный mic/camera/share всегда имеет persistent indicator.

---

# 26. Public Rooms

Публичность Room регулируется группой.

Варианты:

```text
Только приглашённые
Участники группы
Публичная
```

Public Room может отображаться:

- внутри public community;
- на topic page;
- в Events;
- позднее — в global discovery.

Карточка:

```text
🎙 Разбираем портфолио

DesignHub
12 слушают · 4 говорят

UI/UX

[Зайти]
```

Глобальный public-room discovery включать после готовности moderation.

---

# 27. Events

Event связывается с группой и Room.

До события:

```text
Game Night
Сегодня · 21:00

Biba и Yozhik идут
+6

[Напомнить]
```

После старта:

```text
Game Night начался

🎙 5 в комнате
[Зайти]
```

---

# 28. Notifications

Категории:

```text
Все
Упоминания
Реакции
Подписки
Группы
```

Приоритетные actionable notifications:

```text
kk
Biba и ещё 2 сейчас в комнате
[Зайти]
```

```text
Game Night начинается через 10 минут
[Открыть]
```

Likes и follows отображать компактнее.

---

# 29. Onboarding

## Invite onboarding

```text
Регистрация
→ Group invite preview
→ Вступить
→ чат / активная Room
```

## Organic onboarding

```text
Регистрация
→ имя + avatar
→ интересы
→ рекомендованные сообщества
→ вступить в 2–3
→ увидеть активных людей / комнаты
```

Выбор интересов можно пропустить.

---

# 30. Activation

Пользователь считается activated, если за первые 24 часа:

```text
получил ответ на сообщение
OR
провёл ≥2 минуты в Room с ≥1 другим человеком
```

Основные funnels:

```text
signup → first message
signup → first reply
signup → first group
signup → first room
invite → activated
community join → first interaction
```

---

# 31. Virality

Основные внешние share objects:

## Room Invite

```text
kk

🎙 Сейчас разговаривают 4 человека

Biba · nmggk · Yozhik · +1

[Зайти]
```

## Community Invite

```text
Pixel Hunters

12K участников
Biba и ещё 3 ваших знакомых здесь
🎙 18 сейчас общаются

[Вступить]
```

## Profile / Identity Share

Использовать текущую функцию `Поделиться образом`.

Форматы:

```text
1:1
9:16
OpenGraph
```

На share-card:

- customized profile;
- name;
- mood;
- music/activity;
- маленький Voople branding.

## Event Invite

```text
Game Night
Сегодня 21:00
Biba и ещё 5 идут

[Присоединиться]
```

---

# 32. Group Settings

Целевая структура:

```text
Основное
Участники
Роли и доступ
Разделы
Оформление
Эмодзи и звуки
Бусты
Ссылки
Журнал
```

## Основное

```text
Название
Описание
Visibility
Join policy
Category
Topics
Language
Region
```

## Оформление

```text
Avatar
Banner
Accent
Chat background/theme
Preview
```

## Ссылки

```text
Default invite
Vanity address
Invite management
```

---

# 33. Banner / Chat Background

`Banner` показывается:

- Group Info;
- public page;
- Search;
- invite preview;
- Home community card;
- settings preview.

`Chat background` используется внутри conversation area.

Обе настройки существуют независимо.

---

# 34. Boosts

Модель:

```text
Boost = +1 milestone progress +1 allocation point
```

Milestones:

```text
1
3
6
12
24
```

UI:

```text
9 Boosts

Использовано: 6
Свободно: 3

Активные perks
...

Доступные perks
...
```

Базовые функции группы доступны без Boost.

Boost perks:

- расширенные emoji;
- дополнительные sounds;
- advanced role styles;
- vanity URL;
- advanced appearance;
- HD Room;
- increased limits.

---

# 35. Analytics events

Добавить минимум:

## Home

```text
home_opened
presence_clicked
presence_room_joined
presence_message_started
continue_clicked
```

## Discovery

```text
search_opened
search_query
topic_opened
community_viewed
community_joined
person_recommended_viewed
person_profile_opened
dm_request_sent
```

## Rooms

```text
room_created
room_joined
room_left
room_invite_sent
room_minimized
room_compacted
room_expanded
screen_share_started
```

## Groups

```text
group_created
group_visibility_changed
group_join_policy_changed
group_topic_added
member_directory_opened
```

## Social

```text
interest_added
open_to_chat_enabled
dm_request_accepted
user_pinned
```

Не отправлять тексты сообщений в analytics.

---

# 36. Основные метрики

Главная продуктовая метрика:

## Weekly Connected Groups

Группа считается connected, если за неделю:

- участвовали ≥3 пользователей;
- активность была ≥2 разных дней;
- были взаимные сообщения или Room ≥2 участников.

Дополнительно:

```text
D1 / D7 / D30
signup → activation
community join → interaction
room joins / WAU
room duration
DM requests accepted
active people per group
connected group W1/W4 retention
invites → activated users
```

---

# 37. Порядок реализации

## P0 — core social

1. Group `visibility`.
2. Group `join_policy`.
3. Interests/topics.
4. Переработать `Сейчас`.
5. Переработать `Продолжить`.
6. Relationship score.
7. Presence privacy.
8. Group Info.
9. Убрать шум Room events из чатов.
10. Привести Room CTA к единому виду.

## P1 — discovery

11. Global Search redesign.
12. Communities section.
13. Public community page.
14. Community cards.
15. Member directory.
16. People recommendations.
17. Mutual context.
18. Topic pages.
19. Organic onboarding через interests.

## P2 — new social connections

20. `Открыт к общению`.
21. DM Requests.
22. privacy controls для requests.
23. social context в Mini Profile.
24. room/community invite previews.
25. actionable Room notifications.

## P3 — retention / virality

26. Event → Room integration.
27. Shareable profile identity.
28. Referral activation.
29. Community recommendation ranking.
30. Public Room внутри communities.

## P4 — polish

31. User Settings redesign.
32. Group Settings redesign.
33. Boost UI.
34. Store contextual previews.
35. responsive/mobile polish.
36. accessibility.
37. analytics dashboards.

---

# 38. Acceptance criteria

После реализации:

- `Сейчас` показывает актуальных людей и Rooms;
- пустой `Сейчас` занимает одну компактную строку;
- `Продолжить` возвращает в relevant conversation;
- один объект не дублируется одновременно в `Сейчас` и `Продолжить`;
- пользователь может найти public groups по interests;
- public group имеет полноценную preview page;
- public group после вступления появляется в `Чаты → Группы`;
- рекомендации людей объясняют общий контекст;
- незнакомые пользователи используют DM request;
- пользователь контролирует visibility presence;
- список участников показывает `Сейчас / В сети / Все / Роли`;
- активные Rooms видны на community surfaces;
- Room events не засоряют message timeline;
- community cards показывают social proof;
- onboarding работает как с invite, так и без знакомых;
- основные social funnels полностью трекаются;
- mobile имеет отдельную одноколоночную hierarchy.
