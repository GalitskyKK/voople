# RFC: Creator Studio и расширяемая система косметики

**Статус:** Proposed

**Область:** Creator Studio, cosmetics runtime, каталог, moderation и creator economy

**Тип изменения:** архитектурная спецификация; этот документ не разрешает реализацию или rollout

**Последнее обновление:** 2026-08-26

## 1. Резюме решения

Voople должен строить Creator Studio не как каталог однотипных шаблонов и не как
полностью свободный web-редактор. Каноническая модель — **constrained canvas**:

- шаблоны и пресеты дают быстрый старт;
- автор компонует allowlisted assets в слоты и слои;
- редактор поддерживает responsive anchors, masks, keyframes и управляемые
  particle/effect presets;
- клиент никогда не исполняет загруженный автором JavaScript, CSS, shader,
  HTML, SVG или произвольный animation runtime;
- публикация компилирует проект в ограниченный versioned render manifest,
  создаёт статический fallback, проверяет бюджеты и только затем отправляет
  точную неизменяемую версию на модерацию;
- покупка, владение, доступ и экипировка — разные серверные сущности;
- `ring` и `decoration` становятся вариантами единой поверхности
  `avatar_ornament`, а не параллельными продуктовыми концептами;
- новые cosmetic surfaces добавляются через Voople-owned surface registry и
  renderer adapter, без произвольных surface names от создателей;
- выплаты авторам строятся на versioned creator contract и append-only
  double-entry ledger, а не вычисляются задним числом из текущей цены товара.

Рекомендуемая последовательность — сначала системный manifest renderer и
совместимость существующих cosmetics, затем закрытый static-only pilot, затем
animated constrained canvas и только после юридической, moderation и payout
готовности — платный creator catalog.

## 2. Контекст и канонические ограничения

RFC следует четырём продуктовым источникам и их иерархии:

1. поведение — `VOOPLE_PROJECT_SPEC.md` и дополняющий его final social/UX plan;
2. функциональный skeleton — реальное приложение;
3. layout/IA/responsive — `2try_design` / Penultimate Set;
4. identity/cosmetics — `1try_design` / Latest Set.

Из этого следуют обязательные инварианты:

- **Calm interface. Expressive people.** Cosmetics могут быть яркими, но shell
  остаётся спокойным и предсказуемым;
- cosmetics не меняют размеры компонентов, layout, controls, hit targets,
  навигацию, Tab order или минимальный контраст текста;
- portable identity должна разрешаться одним и тем же способом в профиле,
  Mini Profile, Home/«Сейчас», чатах, участниках, Room, постах и уведомлениях;
- профиль сохраняет реальный двухколоночный skeleton. Profile frame относится
  только к identity surface и не окружает feed или viewport;
- banner, profile background, post header, community banner и chat background
  остаются разными surfaces с разными safe zones;
- любой animated cosmetic имеет static fallback и reduced-motion вариант;
- Store показывает предмет в реальном контексте, а не как абстрактный asset;
- web, desktop и mobile используют один разрешённый manifest, но собственные
  surface adapters и responsive composition;
- Creator Cosmetics Program находится в P4. Пункт Project Spec о заморозке
  сложной creator monetization до завершения core loop остаётся действующим.
  Этот RFC готовит архитектуру, но не меняет порядок продуктовых приоритетов.

### 2.1 Текущее состояние, которое нужно эволюционно сохранить

В приложении уже есть нормализованный `ProfileCustomizationView`, server-side
ownership checks, inventory, equip slots, подписочные entitlements, каталог,
object-storage validation и moderation intake. Существующие `avatar_ring_id` и
`avatar_decoration_id`, registry/CSS presets и CDN assets нельзя обходить
второй независимой системой.

Новая архитектура должна постепенно заменить registry-specific delivery на
manifest delivery, сохранив текущий server-authoritative resolver и исторические
appearance snapshots в постах. Equipped ID никогда не является доказательством
владения.

## 3. Цели и не-цели

### 3.1 Цели

- Дать авторам выразительную композицию без исполняемого пользовательского кода.
- Единообразно рендерить cosmetics на web, desktop и mobile.
- Защитить читаемость, доступность, приватность и core messaging/Room experience.
- Зафиксировать immutable publication, moderation и takedown на уровне версии.
- Отделить product, version, entitlement, equip и commercial agreement.
- Поддержать новые surfaces без копирования catalog/equip/render pipelines.
- Ввести измеримые download, CPU, GPU, memory и battery budgets.
- Сделать покупки, refunds, revenue share и payouts воспроизводимыми аудитом.

### 3.2 Не-цели

- Произвольные mini-apps, интерактивные виджеты или кликабельные cosmetics.
- Пользовательские JavaScript, WebAssembly, CSS, HTML, SVG, shaders или fonts.
- Изменение структуры профиля, поста, чата, Room или app shell.
- Продажа permissions, moderation advantage, boost reach или скрытого ranking.
- User-to-user resale, secondary marketplace, scarcity/NFT mechanics.
- Немедленное открытие self-service публикации или денежных выплат.
- Замена текущих Voops, Voople+ или Boost новой валютой или premium tier.

## 4. Выбор authoring model

| Модель | Выразительность | Безопасность и предсказуемость | Стоимость поддержки | Решение |
|---|---:|---:|---:|---|
| Только готовые шаблоны | Низкая: работы быстро становятся однотипными | Высокая | Низкая | Оставить как onboarding, не как основную модель |
| Constrained canvas | Высокая внутри явных surface rules | Высокая после compile/validation | Средняя | **Основная модель** |
| Полностью свободный редактор | Максимальная | Низкая: code execution, spoofing, perf и cross-platform drift | Очень высокая | Не поддерживать |

Полностью свободный редактор создаёт несовместимый с Voople trust boundary:
его невозможно безопасно совместить с portable identity в dense lists, Rooms,
360 px mobile, reduced motion и стабильным desktop renderer. Только шаблоны,
напротив, безопасны, но не создают устойчивую creator ecosystem. Constrained
canvas сохраняет авторскую композицию, а Voople контролирует примитивы,
координатные системы, ресурсы и деградацию.

## 5. Архитектурные границы

```text
Creator Studio UI
  -> Creator API / services
     -> draft store + quarantined source assets
     -> compiler / transcoder / analyzers
     -> moderation + rights workflow
     -> immutable signed manifest + CDN renditions

Catalog / checkout -> entitlement service -> equip service
                                           -> ResolvedCosmeticsView
                                                -> pure renderer
                                                   -> surface adapter
```

### 5.1 Frontend

Frontend отвечает за:

- canvas/timeline UI, локальные undo/redo и optimistic draft revision;
- preview через тот же renderer package, который используется продуктом;
- показ server validation, moderation и publish states;
- context preview matrix для portable/full/community surfaces;
- явный preview `default`, `reduced-motion`, `static fallback`, light/dark,
  mobile 360 px и low-quality mode;
- accessibility редактора: keyboard navigation, accessible layer tree,
  numeric property editing и понятные ошибки.

Frontend не решает ownership, publication, moderation, compatibility или
performance eligibility. Локально успешный preview не является разрешением на
публикацию.

### 5.2 Backend

Backend отвечает за:

- authorization creator/team roles на каждый read и mutation;
- draft concurrency, snapshots и immutable versions;
- asset ownership и завершение upload только после content verification;
- compile, transcode, static fallback generation и complexity analysis;
- moderation orchestration, catalog availability и emergency suspension;
- entitlements, equip resolution, refunds и subscription expiry;
- versioned creator agreements, revenue allocation и payout ledger;
- signed manifest metadata, feature flags, kill switches и audit log.

Рекомендуемое направление зависимостей остаётся каноническим:

```text
app/api or tRPC router -> server service -> server data -> storage/payment/moderation integration
```

Routers валидируют внешний контракт и остаются тонкими. Business state machines
живут в services; persistence и row mapping — в data; browser code не импортирует
`src/server`.

### 5.3 Storage и media pipeline

Storage делится на четыре зоны:

1. `quarantine/source` — private, creator-scoped, никогда не рендерится клиенту;
2. `build/intermediate` — временные transcode/analyzer outputs;
3. `published/content-addressed` — immutable renditions по digest;
4. `fallback/content-addressed` — static posters/contact sheets.

Клиент не передаёт итоговый URL. Сервер генерирует ключ, проверяет owner,
declared size, фактический object size, MIME, signature, dimensions, frame count,
duration, decode limits и отсутствие внешних references. Public delivery
содержит только Voople-generated content-addressed keys.

### 5.4 Renderer

Renderer — отдельный pure interpreter ограниченного intermediate representation.
Он:

- принимает signed manifest, surface descriptor, viewport, visual state,
  motion preference и quality tier;
- не имеет `eval`, dynamic import, custom network fetch, user event handlers,
  storage/cookie access или произвольного DOM;
- загружает только перечисленные content-hashed ресурсы с Voople CDN;
- рендерит с `pointer-events: none` внутри clip boundary surface adapter;
- не может поднять слой выше product controls или изменить их geometry;
- детерминированно выбирает responsive variant и fallback;
- при ошибке возвращает default/static identity, а не ломает parent surface.

Renderer не проверяет право владения. Он получает уже разрешённый
`ResolvedCosmeticsView` от server-side entitlement/equip resolver.

### 5.5 Moderation

Moderation boundary получает immutable submitted snapshot, compiled manifest,
исходные digests, generated contact sheet, animation capture и rights metadata.
Решение относится к точному `versionId + buildDigest`. Новая версия всегда
проходит новый review; одобрение нельзя перенести на изменившиеся bytes.

## 6. Surface registry

Voople владеет versioned `CosmeticSurfaceDescriptor` для каждой поверхности.
Creator выбирает только зарегистрированный `surfaceType`.

Descriptor определяет:

- каноническую coordinate system и aspect-ratio families;
- anchors, slots, layer zones и maximum z-order;
- protected content/control safe zones;
- allowed primitives, blend modes, masks, state inputs и effects;
- layer/keyframe/particle/resource limits;
- responsive breakpoints и crop/fit policy;
- motion, performance и static-fallback policy;
- preview fixtures и обязательные product surfaces;
- equip cardinality и incompatibility groups.

Начальный registry:

| `surfaceType` | Область | Особые правила |
|---|---|---|
| `avatar_ornament` | Portable identity | Один equip slot; слои behind/ring/front, standard avatar geometry |
| `profile_frame` | Profile identity card | Не выходит за identity surface, не затрагивает feed |
| `profile_background` | Body identity surface | Safe zones для текста/actions, static на weak devices |
| `profile_banner` | Profile banner | Независим от background, несколько crop families |
| `post_header` | Author/header strip | Не меняет media, action bar, comments или spacing |
| `community_banner` | Info/public/invite/discovery | Не используется как постоянный header переписки |
| `chat_background` | Conversation content | Минимальный контраст, интенсивность и motion; controls вне слоя |

App shell themes, sounds, emojis и full animated avatars остаются отдельными
доменными категориями до отдельного threat/performance review. Наличие generic
renderer не означает автоматическое разрешение surface.

### 6.1 Добавление новой surface

Новая surface требует:

1. product/design approval и описание canonical use cases;
2. descriptor со safe zones, responsive и accessibility rules;
3. web/desktop/mobile adapters;
4. preview fixture matrix;
5. budgets и degradation policy;
6. moderation taxonomy и report subject support;
7. resolved view contract и equip policy;
8. automated conformance suite.

Такое расширение не требует новой creator DSL: manifest ссылается на новый
Voople-owned descriptor version.

## 7. Authoring model

### 7.1 Уровни свободы

Creator Studio предлагает три режима одной модели, а не три несовместимых
формата:

1. **Guided preset.** Автор выбирает layout/effect preset, assets, palette и
   небольшое число параметров.
2. **Canvas composition.** Автор управляет слоями, anchors, transforms, masks,
   timeline и state variants в пределах descriptor.
3. **Advanced constrained composition.** Дополнительные responsive variants,
   nested groups, более точные keyframes и несколько server-owned particle/
   effect emitters для verified creators и подходящих surfaces.

Любой guided preset раскрывается как обычная constrained composition. Автор не
оказывается заперт в шаблоне, а renderer получает один формат.

### 7.2 Слоты, слои и координаты

- Слой имеет stable UUID, primitive kind, resource reference, anchor,
  normalized offset, transform, opacity, clip/mask и allowlisted blend mode.
- Anchors задаются семантически (`avatar.center`, `avatar.edge.topRight`,
  `surface.safeTop`, `surface.center`), а не CSS selectors или viewport pixels.
- Offset хранится в normalized surface units с descriptor-defined min/max.
- Z-order разрешён только внутри layer zone. Автор не создаёт произвольный
  global z-index.
- Responsive variant наследует base composition и хранит только overrides.
  Arbitrary media queries запрещены.
- Text primitives в первой версии не принимают пользовательский текст: это
  исключает скрытую смену смысла после модерации и проблемы локализации.

### 7.3 Masks

Разрешены:

- descriptor geometry masks;
- circle, rounded rectangle, polygon с ограниченным числом points;
- проверенный raster alpha mask;
- один уровень compositing в portable surfaces и ограниченная глубина в full
  surfaces.

External mask URLs, raw SVG paths без compiler normalization и рекурсивные
mask/filter graphs запрещены.

### 7.4 Keyframes

Timeline поддерживает allowlisted properties:

- position offset;
- scale в ограниченном диапазоне;
- rotation;
- opacity;
- palette token/color interpolation;
- descriptor-approved mask reveal;
- параметры server-owned effect preset.

Длительность, loop mode, easing, number of tracks и keyframe count ограничены
descriptor. Layout properties, filters вне allowlist и events/callbacks
отсутствуют. Strobe analyzer блокирует небезопасную частоту/амплитуду вспышек.

### 7.5 Particles и effects

Автор выбирает Voople-owned preset (`sparkles`, `snow`, `petals`, `glow trail`
и т. п.) и меняет только открытые параметры: palette, density, velocity,
direction, lifetime и bounded spawn region. Shader/particle code, texture URL и
random seed creator не загружает. Compiler фиксирует seed policy, maximum live
particles и static representative frame.

### 7.6 Единый `avatar_ornament`

`ring` и `decoration` описывают одну продуктовую поверхность вокруг аватара.
Канонический manifest одного ornament может содержать:

```text
behind_avatar -> ring_band -> front_decoration -> subtle_effect
```

У surface один equip slot и один manifest, но внутри может быть несколько
слоёв. Это предотвращает конфликт двух catalog taxonomies и позволяет одному
автору проектировать цельную композицию.

Для текущих пользователей resolver временно создаёт system-authored virtual
compatibility composition из одновременно экипированных legacy ring и
decoration. Она сохраняет вид до следующей явной экипировки. Новые продукты и
новый API используют только `avatar_ornament`; legacy columns остаются read-only
compatibility inputs до отдельной миграции.

## 8. Versioned manifest и rendering contract

### 8.1 Publication units

- `CreatorProject` — долгоживущий проект автора.
- `Draft` — mutable working tree с optimistic `revision`.
- `SubmissionSnapshot` — immutable snapshot draft при submit.
- `CosmeticVersion` — immutable compiled artifact и review target.
- `CosmeticProduct` — catalog identity, которая может иметь несколько versions.
- `Release` — решение, какая approved version доступна в конкретном channel,
  territory и времени.

Изменение title, assets, animation или manifest после submit создаёт новый
snapshot/version. Published bytes никогда не перезаписываются по тому же URL.

### 8.2 Минимальный manifest contract

```ts
type CosmeticManifestV1 = {
  schemaVersion: "1.0";
  rendererContract: { min: "1.0"; maxMajor: 1 };
  cosmeticVersionId: string;
  buildDigest: string;
  surface: {
    type: CosmeticSurfaceType;
    descriptorVersion: string;
  };
  resources: Array<{
    id: string;
    digest: string;
    rendition: "1x" | "2x" | "mobile" | "poster";
    mediaType: AllowedPublishedMediaType;
    width: number;
    height: number;
    bytes: number;
  }>;
  variants: Array<{
    id: string;
    when: { aspectFamily: string; motion: "full" | "reduced" | "none" };
    rootLayerIds: string[];
  }>;
  layers: CompiledLayer[];
  fallback: { resourceId: string; dominantColor?: string };
  declaredCost: {
    layers: number;
    keyframes: number;
    maxParticles: number;
    decodedBytes: number;
    complexityScore: number;
  };
  integrity: { keyId: string; signature: string };
};
```

Manifest не содержит creator-provided URLs, HTML, CSS, shader source, script,
event handlers, text payload или unbounded numeric values. Client types —
stable view models; raw database rows не выходят в components.

### 8.3 Compatibility

- `schemaVersion` меняется при форме manifest.
- `descriptorVersion` меняется при surface rules.
- `rendererContract` задаёт поддерживаемый major range.
- Published version хранит exact compiler/descriptor versions и content digests.
- Renderer с неизвестным major немедленно использует static fallback.
- Minor renderer improvements обязаны сохранять conformance fixtures.
- Изменение визуального результата, требующее новой модерации, создаёт новую
  `CosmeticVersion`, а не тихо меняет старую.

### 8.4 Static fallback и reduced motion

Compiler всегда создаёт poster из той же approved composition. Автор выбирает
предпочтительный кадр, но pipeline проверяет его отдельно и может выбрать
безопасный frame.

В режиме `prefers-reduced-motion`:

- continuous loops останавливаются;
- transforms заменяются poster или коротким opacity transition;
- particles становятся статическим representative layer или исчезают;
- информация и readable identity остаются эквивалентными;
- UI не показывает пользователю пустой ornament только из-за reduced motion.

Static fallback используется также при unsupported renderer, low-power mode,
background/occluded surface, resource timeout, integrity failure, memory
pressure и moderation suspension. При takedown используется нейтральный default,
а не cached poster запрещённой версии.

## 9. Performance budgets и деградация

Budgets применяются одновременно на compile time и runtime. Structural caps
нельзя повысить отдельному товару вручную; новый tier требует descriptor/version
review. Числа ниже — начальные release gates, которые Phase 1 должен подтвердить
на зафиксированных baseline devices.

| Класс surface | Published resources | Decoded memory | Runtime cap | Frame contribution p95 |
|---|---:|---:|---|---|
| Portable/dense (`avatar_ornament`, до 24 видимых) | ≤ 1 MiB на version, manifest ≤ 64 KiB | ≤ 32 MiB на весь viewport, instance state ≤ 128 KiB | ≤ 12 layers/item, ≤ 24 particles/item, 30 fps | desktop CPU ≤ 1.5 ms / GPU ≤ 2.5 ms; mobile CPU ≤ 2 ms / GPU ≤ 3 ms |
| Single full identity (`profile_*`) | ≤ 6 MiB на version | ≤ 48 MiB active surface | ≤ 24 layers, ≤ 96 particles, 60 fps desktop / 30 mobile | CPU ≤ 2 ms / GPU ≤ 4 ms |
| Persistent content (`post_header`, `chat_background`) | ≤ 2 MiB на version | ≤ 24 MiB active viewport | ≤ 12 layers, ≤ 32 particles, 30 fps | CPU ≤ 1 ms / GPU ≤ 2 ms |

Дополнительные обязательные limits:

- dimensions, frame count, duration, loops, keyframes per track, mask depth и
  blend operations задаются descriptor и проверяются compiler;
- dense lists анимируют только ограниченное число ближайших visible items;
- offscreen/occluded surfaces pause, background window использует static;
- mobile low-power/data-saver и thermal pressure немедленно снижают quality;
- Room media, typing, scroll и input имеют приоритет над cosmetics;
- 30-минутный mobile battery test не должен добавлять более 5% относительного
  расхода к тому же сценарию с cosmetics disabled;
- repeated manifest/resources deduplicate по digest и используют bounded LRU;
- renderer ловит allocation/decode failure и не повторяет бесконечный retry.

Порядок runtime degradation:

1. уменьшить particle density и animation rate;
2. остановить secondary layers;
3. перейти к reduced/static variant;
4. показать default surface.

Деградация не меняет geometry, controls или доступность продукта.

## 10. Media allowlist и compile pipeline

### 10.1 Source allowlist для первого rollout

- static raster: PNG, WebP, AVIF;
- animated raster: APNG и animated WebP;
- короткий WebM/MP4 только для descriptor, явно разрешающего video source;
- raster alpha masks в разрешённых dimensions.

Все source media декодируются в sandboxed worker с time/memory limits и
перекодируются в Voople-owned renditions. MIME header недостаточен: проверяются
magic bytes и полный decode. Metadata, ICC/EXIF, embedded thumbnails и лишние
tracks удаляются.

Не допускаются raw SVG, GIF delivery, PSD/project files, Lottie import, HTML,
CSS, fonts, audio, external URLs и remote embeds. Поддержка нового source format
требует отдельного parser threat review; даже тогда клиент получает только
compiled IR/renditions.

### 10.2 Pipeline

```text
presigned upload request
-> owner/purpose-scoped quarantine key
-> HEAD + signature + bounded full decode
-> malware/decompression/content checks
-> normalize/transcode/strip metadata
-> compile authoring graph to canonical IR
-> validate surface and complexity budgets
-> generate renditions + poster + contact sheet + animation capture
-> automated safety/IP signals
-> immutable submission
-> human/automated moderation decision
-> sign manifest and promote hashes to published CDN
```

Failure at any step leaves source private and cannot produce a catalog/equip
reference.

## 11. Data model и API contracts

Ниже — logical entities, не готовая миграция.

| Entity | Назначение и ключевые инварианты |
|---|---|
| `creator_accounts` | user/team owner, eligibility, region, age/KYC/tax state; recognition badges не дают creator permissions |
| `creator_projects` | owner, target surface, title, lifecycle; не является catalog product |
| `creator_drafts` | mutable document, monotonic revision, autosave metadata |
| `creator_assets` | private source digest, owner, media facts, scan state, rights declaration |
| `cosmetic_versions` | immutable snapshot/build/manifest/fallback digests, descriptor/compiler versions |
| `moderation_cases` | exact version, signals, decisions, reason codes, reviewer/audit references |
| `cosmetic_products` | stable catalog identity, creator, category, visibility and current release pointer |
| `cosmetic_releases` | product + exact approved version + territory/channel/time availability |
| `entitlements` | principal, product, source, grant/expiry/revoke/refund state; ownership proof |
| `equip_bindings` | principal + canonical slot -> exact version, server validated |
| `creator_contract_versions` | immutable commercial terms accepted by creator |
| `sale_allocations` | idempotent snapshot of sale/refund and applicable contract |
| `payout_ledger_entries` | append-only double-entry amounts and holds by currency/account |
| `rights_claims` | claimant, target version/product, evidence, notice/appeal/takedown state |

`principal` поддерживает минимум user и group, но surface descriptor ограничивает,
кто может экипировать предмет. Group cosmetics требуют server-side role/permission
check; entitlement владельца группы не выводится из UI membership.

### 11.1 Draft и publication state machines

```text
Draft: active -> submitted -> forked/archived

Version:
compiled -> submitted -> needs_changes | approved | rejected
approved -> scheduled -> published
published -> suspended | takedown | archived
suspended -> published | takedown
```

Submitted snapshot нельзя редактировать. `needs_changes` создаёт новый draft fork.
Withdraw прекращает review, но не удаляет audit trail. Reviewer actions,
emergency suspension и appeal обязаны иметь reason и actor.

### 11.2 Service contract groups

Имена иллюстративны; transport может быть tRPC/API, но границы обязательны:

- `creatorStudio.project.*` — create/list/read/archive;
- `creatorStudio.draft.read/update` — `expectedRevision` обязателен;
- `creatorStudio.asset.createUpload/finalize` — purpose, size, digest и owner;
- `creatorStudio.build.validate/compile` — idempotency key и snapshot digest;
- `creatorStudio.submission.submit/withdraw/status`;
- `moderation.creatorVersion.decide/suspend/restore` — admin-only + audit;
- `catalog.creatorProduct.publish/schedule/unpublish`;
- `cosmetics.resolveForSurface` — authorized stable view model;
- `cosmetics.equip/clear` — product/version/slot validation и reconciliation;
- `creatorEconomy.dashboard/ledger/payouts` — creator-scoped reads;
- payment/refund webhooks — signature verification и idempotency.

Все external inputs валидируются Zod/equivalent. List endpoints используют
bounded pagination. Mutations имеют idempotency там, где возможен retry или
денежный эффект.

### 11.3 Resolved view

Product UI получает минимальный contract:

```ts
type ResolvedCosmetic = {
  surfaceType: CosmeticSurfaceType;
  slot: string;
  productId: string;
  versionId: string;
  manifestUrl: string;
  manifestDigest: string;
  fallbackUrl: string;
  availability: "active" | "static_only" | "defaulted";
};
```

Manifest URLs разрешаются server-side/CDN policy; UI не получает private source,
rights/KYC/payment details или raw entitlement rows.

## 12. Entitlement и equip model

### 12.1 Разделение понятий

- **Product** — что пользователь видит и приобретает.
- **Version** — какие immutable bytes/render rules были одобрены.
- **Entitlement** — почему principal сейчас имеет право использовать product.
- **Equip binding** — где и какая exact approved version применяется.
- **Release availability** — можно ли эту version выдавать сейчас.

Equip mutation проверяет все пять условий. UI preview может показывать locked
product, но сохранить его нельзя.

### 12.2 Источники entitlement

`purchase`, `gift`, `earned`, `seasonal_reward`, `creator_grant`, `promotion`,
`subscription`, `admin_restore`. Источник влияет на expiry/refund semantics, но
не создаёт отдельный renderer path.

Subscription-only item может оставаться в inventory после expiry, но resolver
немедленно возвращает fallback/default и equip становится `inactive`, пока право
не восстановлено. Refund/revocation также сервер-authoritative.

### 12.3 Version pinning

Equip binding закрепляет exact approved version. Новые equips используют current
release. Existing users не получают визуально новую creator version без её
review и явной product policy. Security fix может emergency-default version;
тихая замена bytes под старым digest запрещена.

Historical content snapshots продолжают хранить exact resolved appearance или
безопасный snapshot. Takedown policy может заменить запрещённый historical
render на neutral placeholder без переписывания исходного post record.

## 13. Moderation, права и takedown

### 13.1 До submit

Автор подтверждает:

- владение или лицензию на каждый asset;
- право коммерческого распространения и создания производных renditions;
- отсутствие запрещённых trademarks/likeness либо наличие разрешения;
- возрастную и территориальную допустимость;
- согласие с exact `creatorContractVersionId`.

Rights declarations versioned и связаны с asset digest. Замена asset требует
новой декларации.

### 13.2 Review package

Модератор видит:

- full/reduced/static render;
- все responsive variants и обязательные context fixtures;
- contact sheet и capture полного animation loop;
- analyzer warnings: flashing, contrast interference, nudity/violence/hate,
  brand/IP similarity, hidden frames, text-like imagery;
- source provenance, creator history и предыдущие decisions;
- exact budgets и manifest digest.

Automated approval допустим только для системных/строго preset-only low-risk
работ после отдельного policy approval. Creator animation и paid release на
старте требуют human review.

### 13.3 Reports и takedown

`cosmetic_version` и `cosmetic_product` становятся moderation subject types
только вместе с subject authorization, admin preview loader, action executor и
immutable audit entry. Client не задаёт owner, priority или decision.

Takedown flow:

1. принять report/rights notice и сохранить evidence reference;
2. при срочном риске suspend exact version через kill switch;
3. delist release и прекратить новые purchases/equips;
4. resolver переводит активные equips на static/default по policy;
5. заморозить связанные unsettled payouts при юридическом основании;
6. уведомить creator и owners, дать appeal там, где это допустимо;
7. restore создаёт audit event; изменённый контент идёт новой version;
8. source/published bytes хранятся по retention/legal hold, а не удаляются
   немедленно без следа.

Editorial/curator pin хранится отдельно от recommendation score. Пользователь и
creator должны видеть, что placement редакционный; он не скрыто повышает ranking.

## 14. Creator economy, revenue share и payouts

### 14.1 Versioned commercial contract

До monetization creator принимает immutable contract version, содержащую:

- eligible territories, age/KYC/tax requirements;
- reward mode: Voople+, Voops, фиксированная промо-награда или доля выручки;
- `shareBps` и basis (`gross`, `net_of_tax`, `net_of_tax_and_provider_fee`);
- treatment discounts, bundles, gifts, coupons и regional pricing;
- refund/chargeback window, reserve/hold и minimum payout;
- payout currency, schedule и termination/takedown rules.

Каждая sale allocation сохраняет contract version и price/tax/fee snapshot.
Изменение будущих условий не пересчитывает прошлые продажи.

### 14.2 Ledger

Cash obligations и Voops не смешиваются в одном balance. Для каждой валюты/
reward unit используются отдельные balanced accounts. Ledger append-only:
коррекция создаёт reversing entries.

Минимальные события:

- sale authorized/captured;
- platform gross receipt;
- tax liability;
- payment provider fee;
- creator payable;
- platform revenue;
- refund/chargeback reversal;
- reserve hold/release;
- payout initiated/settled/failed;
- withholding/tax adjustment.

Webhook и allocation используют stable idempotency key. Creator dashboard
показывает pending, available, held, paid и reversed суммы, basis расчёта,
применённую contract version и export. Никакой payout не создаётся из client
analytics event.

### 14.3 Fraud controls

- KYC/tax verification до cash payout и по региональным thresholds;
- creator и buyer risk scoring, velocity limits, self-purchase/collusion checks;
- reserve для новых/high-risk creators;
- device/payment abuse signals без публикации private details;
- manual review для payout changes;
- immutable admin audit и separation of duties для moderation/payout override;
- recognition, staff или developer badges не дают финансовых прав.

## 15. Threat model

| Угроза | Пример | Основные меры |
|---|---|---|
| Code execution / XSS | script в SVG/Lottie, CSS URL, shader payload | Нет raw active formats; compile в allowlisted IR; CSP/CDN isolation; no eval/network |
| Parser/decompression attack | forged MIME, huge dimensions/frame count | Magic bytes, bounded full decode, sandbox worker, transcode, hard limits |
| Resource exhaustion | тысячи particles/keyframes, decode bombs | Descriptor caps, complexity score, compile rejection, runtime budgets/fallback |
| UI spoofing/obstruction | fake button, overlay над Leave/Send, unreadable text | Safe zones, clipped pointerless layers, fixed z-order, contrast/interference tests |
| Motion harm | strobe, rapid zoom, endless dense motion | Flash analyzer, property/rate limits, reduced/static modes, user disable control |
| Tracking/exfiltration | per-view remote URL or unique request | Content-addressed Voople CDN only, no creator URLs/code, cacheable shared resources |
| Moderation bypass | benign poster, harmful hidden frame | Full-loop capture/contact sheet, all variants/states reviewed, immutable digest |
| Version swap / TOCTOU | заменить asset после approval | Immutable hashes, signed manifests, exact version review and equip pinning |
| Entitlement spoof | client equips чужой paid item | Server ownership/subscription/release checks on every mutation/read |
| Cross-renderer differential | web безопасен, desktop показывает иначе | One IR/conformance corpus, renderer contract versions, fallback on unsupported major |
| CDN/supply-chain tampering | modified resource or manifest | Digest verification, signature/key rotation, immutable paths, emergency kill switch |
| IP/likeness abuse | украденный art/brand/face | Rights declaration, provenance, fingerprint/signals, notice/appeal/takedown |
| Payment/payout fraud | self-buy, refund cycling, duplicate webhook | Idempotency, holds, risk checks, double-entry ledger, audit and KYC |
| Privilege escalation | team member publishes/payouts | Server roles, least privilege, re-auth for sensitive actions, audit |
| Privacy leakage | private draft/source accessible publicly | Separate private buckets, owner-scoped keys, short-lived URLs, no source in manifest |

## 16. Reliability, observability и privacy

### 16.1 Runtime telemetry

Собирать агрегировано:

- manifest load/cache/fallback/integrity failure;
- renderer/descriptor version compatibility;
- compile rejection reason;
- frame time buckets, dropped animation frames, memory-pressure degradation;
- battery/thermal quality transitions без содержимого private draft;
- equip success/failure/reconciliation;
- moderation SLA, appeal outcome и takedown propagation;
- checkout/refund/payout state transitions из authoritative server events.

Не отправлять source asset bytes, private draft names, creator tax/KYC details,
user messages или полный manifest в product analytics. Version/product IDs
должны быть pseudonymous там, где детализация не нужна.

### 16.2 Resilience

- Manifest/CDN timeout показывает static/default без layout shift.
- Offline использует только ранее verified cache; equip mutation показывает
  pending/error и не имитирует server success.
- Cache invalidation идёт по availability metadata/kill switch, а assets — по
  immutable digest.
- Release canary разделяется по renderer version/platform/surface.
- Kill switches существуют для program, surface, product, version, effect preset
  и animation globally.
- Renderer crash boundary не должен ронять profile/chat/Room parent tree.

## 17. Rollout

### Phase 0 — Gates и прототип

- зафиксировать baseline devices и performance harness;
- утвердить legal/rights/age/territory model;
- проверить core-loop/monetization decision gate из Product Spec;
- прототипировать descriptor + IR без production delivery;
- threat review parser/compiler/renderer.

**Выход:** утверждённые budgets, format allowlist, moderation owner и решение,
что creator monetization не отвлекает от P0–P3.

### Phase 1 — System-authored manifest runtime

- только Voople-authored cosmetics;
- `avatar_ornament` compatibility manifests для legacy ring/decoration;
- signed immutable manifests, static fallback, reduced motion;
- one renderer contract на web/desktop/mobile;
- conformance/performance/kill-switch telemetry;
- старый resolver остаётся rollback path.

**Выход:** визуальная parity существующих cosmetics, бюджеты на baseline devices,
zero layout/control regressions, проверенный rollback.

### Phase 2 — Invite-only static Creator Studio

- guided preset + constrained static layers/anchors/masks;
- private drafts, asset quarantine, compile и review;
- только free grants/private preview, без платного catalog;
- small verified creator cohort и manual moderation.

**Выход:** end-to-end rights/moderation/takedown, acceptable review SLA,
отсутствие security/privacy regressions.

### Phase 3 — Animated constrained canvas beta

- keyframes, responsive variants и allowlisted effects/particles;
- static/reduced/low-power matrix;
- staged portable then full-profile surfaces;
- runtime performance enforcement и creator diagnostics.

**Выход:** performance/battery acceptance, web/desktop/mobile parity, стабильные
fallback rates и moderation coverage всех frames/variants.

### Phase 4 — Curated paid releases

- versioned creator contracts;
- KYC/tax/age/territory checks;
- checkout allocation, refunds, holds, ledger и creator dashboard;
- curated Store placement, gifts и transparent editorial labels;
- capped payout pilot with reconciliation.

**Выход:** финансовый audit/reconciliation, payout recovery procedures,
anti-fraud и support/takedown readiness.

### Phase 5 — Controlled expansion

- новые surface descriptors по registry process;
- larger creator cohorts и risk-based review, но не hidden auto-approval;
- ranking only after quality/abuse metrics;
- self-service publishing только после capacity/SLA доказательств.

Каждая phase защищена feature flags и не отмечается complete по наличию route,
schema или visual shell. Runtime implementation позже должна отдельно обновить
product delivery matrix с web/desktop/responsive/state/test evidence.

## 18. Acceptance criteria

### 18.1 Authoring и UX

- Из одинакового starter preset можно создать визуально различимые работы через
  composition, layers, masks, anchors, palette, timing и effects.
- Canvas, numeric editor, layer tree и timeline доступны с keyboard.
- Preview покрывает все обязательные surface fixtures, 360 px mobile, light/dark,
  reduced/static и permission/unsupported states.
- Cosmetics не меняют layout, hit targets, controls, readable content или
  profile skeleton.

### 18.2 Security и media

- Ни один creator artifact не содержит или не вызывает arbitrary code, CSS,
  shader, external URL или custom network request.
- Forged MIME, oversized/decompression bomb, external reference и modified
  post-review bytes отвергаются автоматическими tests.
- Renderer fail-closed показывает static/default и изолирует ошибку от product UI.
- Every protected read/mutation проверяет creator/team/principal authorization.

### 18.3 Rendering и performance

- Exact manifest даёт эквивалентную композицию на supported web/desktop/mobile
  adapters в пределах documented crop/antialias tolerances.
- Unsupported major, timeout, integrity failure, low power и memory pressure
  имеют deterministic fallback.
- Все release budgets из раздела 9 проходят на зафиксированных baseline devices;
  scrolling, composer input и Room media не деградируют ниже product SLO.
- Reduced motion устраняет continuous/unsafe motion без потери identity.

### 18.4 Lifecycle и moderation

- Submitted/published version immutable и связана с exact digests, descriptor,
  compiler, moderation decision и creator contract.
- Draft conflicts не теряют изменения: `expectedRevision` возвращает явный
  conflict и поддерживает fork/reload.
- Moderation видит все states/variants/frames; decision и takedown аудитируемы.
- Emergency suspension прекращает новую delivery/equip в заданный SLO и
  переводит уже экипированные instances на разрешённый fallback/default.
- Rights notice, appeal, restore и retention/legal hold документированы и
  протестированы.

### 18.5 Entitlements и economy

- Preview, ownership, active entitlement, equip и release availability не
  смешаны и проверяются сервером.
- Legacy ring + decoration визуально сохраняются compatibility resolver до
  явной смены на `avatar_ornament`.
- Refund, expiry, revoke и takedown корректно reconcile equip без удаления
  исторического inventory/audit state.
- Каждая sale/refund/payout idempotent и балансируется double-entry ledger;
  creator statement воспроизводится из immutable entries и contract snapshot.
- KYC/tax/age/territory failure блокирует payout/release согласно policy, но не
  раскрывает private details клиентам.

### 18.6 Operations

- Существуют dashboards и alerts по compile, moderation SLA, fallback rate,
  performance, integrity, refunds и payout reconciliation.
- Program/surface/version/effect kill switches проверены учением, а rollback не
  требует перезаписи immutable assets.
- Web и desktop имеют parity; mobile hierarchy проверена отдельно, а не как
  уменьшенный desktop.

## 19. Trade-offs и принятые ограничения

- **Один ornament slot вместо ring + decoration slots.** Проще каталог,
  renderer и preview; сложные сочетания переносятся внутрь одного manifest.
  Цена — legacy compatibility composition и меньшая mix-and-match свобода между
  товарами разных авторов.
- **Exact version pinning.** Защищает от незаметной подмены купленного вида и
  moderation TOCTOU; цена — более сложный upgrade UX и хранение нескольких
  immutable versions.
- **Server-owned effect presets.** Даёт particles/effects без shader/code risk;
  цена — новые художественные техники требуют обновления платформы.
- **Transcode everything.** Унифицирует decoders и удаляет metadata; цена —
  compute/storage cost и возможные небольшие отличия от source preview.
- **Static-first rollout.** Медленнее раскрывает ценность анимации, но сначала
  проверяет rights, moderation, versioning и delivery без максимального perf risk.
- **Registry-owned surfaces.** Не позволяет creator изобретать новые product
  placements, зато сохраняет IA, accessibility и масштабируемый renderer.

## 20. Открытые вопросы

До Phase 1 необходимо решить:

1. Какие exact baseline desktop/mobile devices и OS/browser versions становятся
   release gate для budgets?
2. Должен ли `avatar_ornament` навсегда иметь cardinality 1 или позднее появится
   Voople-owned secondary micro-slot без cross-creator visual conflicts?
3. Какие video source formats реально можно безопасно и одинаково transcode с
   alpha для web, Windows desktop и mobile?
4. Нужен ли creator-controlled preferred poster или только автоматически
   выбранный безопасный fallback с возможностью выбора из approved frames?
5. Какие страны, минимальный возраст, KYC provider, tax forms, payout currency и
   minimum payout доступны в первом paid pilot?
6. Каков revenue-share basis и кто несёт provider fees, VAT/sales tax,
   chargebacks, bundle discounts и gift refunds?
7. Как owners получают approved new versions: ручной upgrade, opt-in auto-update
   или policy per product?
8. Какой IP/fingerprint provider и appeal SLA достаточны до self-service scale?
9. Какие surfaces входят в первый creator pilot: только `avatar_ornament` или
   также `profile_frame`?
10. Какие данные creator analytics допустимы без deanonymization покупателей и
    social graph leakage?

## 21. Итоговая рекомендация

Начать не с marketplace UI, а с безопасного системного rendering foundation:
surface registry, constrained IR, immutable manifests, fallback/reduced motion,
budgets и compatibility layer для существующей кастомизации. Creator Studio
должен быть клиентом этой платформы, а не особым renderer path. Платную
публикацию открывать только после доказанных moderation/takedown и
ledger/payout controls и после продуктового gate core loop.
