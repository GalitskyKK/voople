# Voople Final Product / Social / UX — implementation audit

Этот документ проверяет дополнительный план **поверх** `VOOPLE_PROJECT_SPEC`, а
не вместо него. Статус относится к фактическому рабочему дереву после релиза
`desktop-v0.1.23` и незакоммиченным доработкам. `Готово` означает наличие общего
контракта, серверных правил, web/desktop UI и проверок. Каркас или отдельный
экран отмечается как `частично`.

Новые возможности, которые не входят в текущий стабилизационный релиз,
закреплены в `docs/next-feature-release-backlog.md` как обязательный scope
следующего feature-релиза.

## Матрица по всем 38 разделам

| № | Требование дополнительного плана | Статус | Фактический остаток |
|---:|---|---|---|
| 1 | Два core loop: близкий круг и новые люди | Частично | Home/чаты/комнаты и Explore есть, но discovery и переход к устойчивой связи не собраны в измеряемый end-to-end loop. |
| 2 | `private / unlisted / public` и `open / request / invite_only` | Частично | Общие контракты, API, web/desktop UI и заявки модераторам реализованы; migration 52 применена и зарегистрирована. Остался полный visual/E2E gate. |
| 3 | Нормализованные интересы/темы пользователя и группы | Частично | Канонические сущности, лимиты 10/5, category/language/region, общий web/desktop UI и показ в профиле реализованы; migration 53 применена и зарегистрирована, discovery-ranking ещё не завершён. |
| 4 | Новая композиция Home | Частично | Общий Home view используется web/desktop; наполнение и ranking не закрывают весь контракт. |
| 5 | Полноценный блок «Сейчас» | Частично | Active room/online/listening, лимит 5, компактный empty, pins до 3, direction-aware sticky compaction и точные rule-based веса реализованы в общем web/desktop View; migrations 53–55 применены и зарегистрированы. Gaming presence, invite action и полный candidate pool общих групп ещё не закрыты. |
| 6 | «Продолжить» с ranking и дедупликацией | Частично | Unread/recency/reciprocal ranking, лимит 4 и дедуп active Room реализованы; chat drafts, mentions/replies и persisted recently-opened ещё отсутствуют. |
| 7 | Relationship graph и time decay | Частично | Общий серверный score учитывает accepted DM, общие группы/интересы, reciprocal messages, mutual contacts и pins, а message signal затухает со временем. Shared-room history, materialized edges и использование во всех recommendation surfaces ещё не готовы. |
| 8 | Search/Discovery по умолчанию | Частично | Топ людей/постов/public groups выводится; темы по интересам, персонализация и полноценный wide discovery отсутствуют. |
| 9 | Поиск внутри `Чаты` | Готово | Общий web/desktop поиск ограничен своими личными чатами, своими группами и контактами; чужие public groups не подмешиваются, а empty state отдельно ведёт в глобальный Discovery. |
| 10 | Страницы тем | Нет | Topic page/follow/recommendation contract отсутствует. |
| 11 | Ranking и quality сообществ | Нет | Нет заявленного score, quality gates, negative feedback и exploration/exploitation слоя. |
| 12 | Community card и social proof | Частично | Базовая карточка группы есть; причины рекомендации, mutuals, online/live rooms и topics не унифицированы. |
| 13 | Полная public/unlisted group page | Частично | Public/unlisted route и все join policies поддержаны кодом, migration 52 применена; preview комнаты/событий/тем и полный social proof ещё не завершены. |
| 14 | Member directory: Сейчас/Онлайн/Все/Роли | Частично | Общий web/desktop drawer получил четыре фильтра, live room/online state и role counts; расширенные role actions/status и visual E2E ещё не закрыты. |
| 15 | Explainable people recommendations | Нет | Нет отдельного recommendation contract и explainable reasons. |
| 16 | Временный `open to chat` статус | Нет | Поле, expiry, приватность и действия отсутствуют. |
| 17 | DM requests, block/report/privacy/rate limit | Нет | Обычные direct chats есть; отдельного request inbox и полного privacy flow нет. |
| 18 | Разделение follow graph и communication graph | Частично | Подписки и чаты разделены сущностями, но продуктовый граф связи/ranking из плана не реализован. |
| 19 | Полный mini-profile social context | Частично | Общий popover и identity есть; shared communities, roles, relationship reason, pins и контекстные действия неполны. |
| 20 | Privacy/presence settings | Частично | Введены все базовые scopes, единая web/desktop форма и server-filtered online presence без глобальной раздачи user ID; music и interests фильтруются в профиле, migration 54 применена. Остался enforcement gaming/rooms/invites/requests. |
| 21 | Новая иерархия Settings | Частично | Общая навигация, privacy/interests и stateless subscription UI унифицированы; voice/video и devices ещё требуют выделенных секций и visual gate. |
| 22 | Chats layout, drawers и group header | Частично | Общие message bubble/attachment/input/header/info view добавлены; upload/preview controllers и несколько desktop chat sheets остаются отдельными. |
| 23 | Полный Group Info с live room CTA | Частично | Общий drawer показывает banner/avatar/description, online/room counts, live CTA, topics, sections, members, invite и settings в web/desktop. Не закрыты social proof и visual/E2E matrix. |
| 24 | Агрегация room events без шума | Частично | Group start/end events схлопываются в одну дневную строку с суммарной длительностью, а активная Room остаётся отдельным CTA. Нужны backfill старых неструктурированных событий и visual E2E. |
| 25 | Все состояния комнаты | Частично | Full/empty/share/mini/compact/minimal представлены, но visual parity, transitions и soak/E2E не закрыты. |
| 26 | Privacy публичной комнаты и поверхности показа | Нет | Есть access open/locked внутри чата, но отдельной room visibility/discovery модели нет. |
| 27 | Events → room | Частично | Events и room существуют; единый event-room lifecycle/CTA/notifications не завершён. |
| 28 | Категории уведомлений и действия | Частично | Базовые уведомления есть; полный category model, live room CTA и preference matrix не готовы. |
| 29 | Invite и organic onboarding | Частично | Invite/onboarding surfaces есть; сбор интересов и organic discovery onboarding отсутствуют. |
| 30 | Activation: reply или ≥2 минуты в комнате | Частично | Activation facts и SQL views есть, migration 49 применена; правило комнаты пока не гарантирует порог 2 минуты. |
| 31 | External share objects | Частично | Профиль/пост/группа частично шарятся; единые previews и attribution/invite conversion не закрыты. |
| 32 | Полная структура group settings | Частично | Rename/banner/tag/invite/roles/sections/emoji/sounds/boosts, visibility v2, join policy, заявки и topics/language/region используют общий web/desktop UI; migrations 53/54 применены, полный visual gate ещё не закрыт. |
| 33 | Banner отдельно от chat background | Частично | Поля разделены и базовый banner больше не boost-lock; полноценный background editor/store preview на всех surfaces не завершён. |
| 34 | Boost allocation | Частично | Capacity, allocation, active/suspended/grace и migration 51 реализованы; product copy, expiry rehearsal и полный UI gate не закрыты. |
| 35 | Расширенная аналитика | Частично | Privacy-safe typed pipeline и storage есть; event catalog не содержит все новые search/recommendation/DM/community события, потому что соответствующие flows отсутствуют. |
| 36 | Connected groups metrics | Частично | Retention/activation/daily views есть; требуемый набор connected-group/relationship metrics неполон. |
| 37 | Порядок P0→P4 | Частично | Visibility/join policy, interests/privacy, Home ranking, pins, Group Info и quiet Room timeline реализованы, migrations 52–55 зарегистрированы; до позднего polish остаются gaming/candidate pool, shared-room history и DM requests. |
| 38 | Acceptance criteria | Не принято | Ни один общий acceptance gate нельзя честно считать закрытым без оставшихся контрактов, desktop parity, visual matrix и authenticated E2E/soak. |

## Итог

- Полностью готовых разделов дополнительного плана: **1 из 38**.
- Частично реализовано: **30 из 38**.
- Не реализовано или отсутствует канонический контракт: **6 из 38**.
- Итоговый acceptance-раздел: **не пройден (1 из 38)**.
- Это означает не «ничего не сделано», а то, что фундамент и несколько
  вертикалей уже есть, но продукт по дополнительному плану ещё не достиг
  acceptance-ready состояния.

## Архитектурный вывод

Переходить на отдельную копию FSD не требуется. Нужна доменная модульность с
одним portable presentation-слоем: stateless Views получают view-models и
callbacks; web и desktop оставляют только data/navigation/native adapters.
Presentation migration завершена: `desktopPortableUi` пуст, а architecture gate
не позволяет вернуть исключения. Оставшиеся platform-файлы являются transport/
navigation/native adapters; visual acceptance конкретных boards проверяется
отдельно и не считается выполненным только из-за общей архитектуры.
