# Voople — аудит, фиксы, фичи, кастомизация

Согласованный объём: **(1) безопасность, (2) баги/качество, (3) анонимные вопросы, (4) движок анимированных эффектов + доки.**
Анонимные вопросы: только для залогиненных, аноним для владельца. Эффекты: и движок, и спецификация в доках.

Стиль: каждый правленый файл — в его текущем стиле; новые файлы — стиль основного репозитория (с `;`). Semicolon-churn в 6 рабочих файлах не трогаю и не расширяю.

---

## Этап 1. Безопасность

1. **Rate-limit на abuse-мутации** (`src/lib/ratelimit.ts` + роутеры через `assertRateLimit`):
   - `applyPromo` (перебор промокодов) — отдельный жёсткий лимит (напр. 10/час).
   - `chat.send`, `post.createComment`, `post.repost`/`quoteRepost`, `profile.toggleFollow`, `profileCanvas.saveStroke` — анти-спам лимиты.
2. **Аплоады — размер**: presigned PUT не ограничивает размер. Добавить server-side `HeadObject` после загрузки и сверку с заявленным `sizeBytes`/`UPLOAD_LIMITS` перед сохранением ключа (`src/server/services/upload.service.ts`, `src/lib/object-storage/client.ts`). Также согласовать рассинхрон лимитов `upload.createPresigned` (15MB) vs `UPLOAD_LIMITS.track` (30MB).
3. **Chat upload — magic-bytes**: проверять сигнатуру файла, а не только `file.type` (`src/app/api/upload/chat/route.ts`).
4. **YooKassa webhook**: добавить базовый rate-limit + (если задан) allowlist IP/проверку источника перед обращением к API (`src/app/api/webhooks/yookassa/route.ts`). Логику повторной сверки платежа оставить.
5. **Unbounded input**: `strokeInputSchema.points` — добавить `.max(N)` (`profile-canvas.ts`). Пройтись по другим `z.array(...)` без верхней границы.
6. Документировать осознанный fail-open rate-limit (комментарий уже есть) — без изменений логики.

## Этап 2. Баги и качество кастомизации

1. **avatarRingId не рендерится** (реальный баг: все кольца одинаковые). Ввести реестр стилей колец `ring id → CSS-класс/градиент`, прокинуть `avatarRingId` в `ProfileAvatarWithPresence`/`ProfileAvatar`, отрисовать конкретное кольцо. Добавить keyframes колец в `globals.css`.
2. **ProfileEffect.onError навсегда прячет элемент** через inline `display:none` и не восстанавливается при смене src. Переписать на `useState(hidden)` + `key={effectUrl}`.
3. **Мёртвый no-op код в ProfileEffect**: `animationPlayState` на `<img>` ничего не делает для APNG/animated-WebP. Удалить листенер либо заменить на реальный pause только для CSS/canvas-эффектов (см. Этап 4).
4. **prefers-reduced-motion для эффектов**: для анимированных эффектов добавить статичный fallback / отключение (как у `AppThemeBackground`).
5. **z-index**: убрать бессмысленный внутренний `z-[15]`, явно описать порядок слоёв карточки (banner < effect < content < avatar) и привести к спецификации.
6. **Мёртвые stub-пикеры**: `EffectPicker/BannerPicker/NameplatePicker/RingPicker/LivePreview` возвращают `null` и нигде не используются — удалить (вся логика в `CustomizationEditor`).
7. **Мелочи**: дубль `SHOP_CATALOG_BY_ID.get(item.id)` (вычислить один раз), магические цвета градиента имени вынести в константы, `AppThemeBackground` использовать `theme` из контекста вместо повторного `getAppTheme`.

## Этап 3. Анонимные вопросы (Q&A)

Паттерн — клон вертикали `profileCanvas` (адресация по `profileUserId` + скрытый `askerId`, как actor-hiding в нотификациях).

1. **Миграция** `drizzle/18-anonymous-questions.sql`: таблица `profile_questions` (`id`, `profile_user_id` FK, `asker_id` FK users — хранится, владельцу не отдаётся, `question_text`, `answer_text` nullable, `answered_at` nullable, `is_hidden`, `created_at`; индексы по `(profile_user_id, created_at)` и `(profile_user_id, answered_at)`). RLS как у соседних таблиц. Расширить enum `notif_type` значением `question`.
2. **Service** `src/server/services/questions.service.ts` + data-слой по образцу canvas/comments. На `ask` — нотификация владельцу со скрытым актором.
3. **Router** `src/server/trpc/routers/questions.ts`, регистрация в `root.ts`:
   - `ask` — protected, rate-limited, аноним для владельца.
   - `listAnswered` — public — отвеченные/публичные вопросы профиля.
   - `listInbox` — protected, owner-only — неотвеченные.
   - `answer` / `hide` / `delete` — protected, owner-only (проверка `profileUserId === ctx.user.id`).
4. **UI**: блок «Задать анонимный вопрос» на странице профиля + лента отвеченных; инбокс владельца (на `/me` или в профиле своём). Нотификация-тип `question` в `notification-ui.ts`.
5. **Анти-абьюз**: rate-limit + лимит длины текста; (заготовка под модерацию).

## Этап 4. Движок анимированных эффектов + спецификация

1. **Дискриминатор типа**: расширить модель эффекта `kind: "image" | "css"` (каталог + resolve + types). Для `css` — id указывает на пресет, не на файл.
2. **Реестр CSS-эффектов** `src/lib/customization/effects-registry.ts`: id → описание (тип частиц, плотность, скорость, цвета, длительность). Старт: `snow`, `confetti`, `sparkles`, `embers`/`fireflies`.
3. **Рендерер** `src/components/profile/effects/`: компонент, ветвящийся по `kind`. Для CSS — генерируемые DOM-частицы + keyframes в `globals.css`; жизненный цикл: pause на `visibilitychange`, gate по `prefers-reduced-motion`, старт/стоп по `IntersectionObserver`, ограничение числа частиц. Опционально canvas-вариант для тяжёлых эффектов с `cancelAnimationFrame` на unmount.
4. `ProfileCardEffectLayer` → ветвление image vs css. Превью в магазине (`ShopCatalogPreview`) — поддержать css-эффекты.
5. **Документация** `docs/customization.md` + `public/customization/README.md`: актуализировать под фактический код и дописать **полную спецификацию анимированных эффектов** — точные размеры canvas (mobile/desktop), форматы, вес, длительности/тайминги, safe-area, alpha coverage, обязательный reduced-motion fallback, чеклист приёмки; отдельно — как объявлять CSS-пресет (без рисования файла).

## Этап 5. Актуализация документации

- Свести доки к фактическому коду там, где разошлось (кольца, слои эффекта, пути).
- Обновить `docs/architecture.md`/`docs/customization.md`/`docs/security.md` по итогам этапов 1–4.
- Краткие рекомендации «как сделать как в Discord» (слои, токены, что делать кодом vs ассетом).

---

## Порядок и проверка
1. Безопасность → 2. Баги/качество → 3. Анонимные вопросы → 4. Эффекты → 5. Доки.
После каждого этапа: `npm run lint` и `npm run build` (typecheck). Миграцию БД готовлю как SQL-файл; применение (`db:apply`) — за вами, т.к. требует доступа к Supabase.

## Идеи на будущее (не в этом заходе)
- Реакции/лайки на ответы Q&A; шаринг ответа как пост (есть `status.publishToFeed`).
- Сезонные наборы эффектов; пользовательская загрузка эффектов с модерацией.
- Контраст имени (WCAG AA) автопроверкой в редакторе.
