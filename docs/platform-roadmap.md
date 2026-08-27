# Platform roadmap: Windows, Linux, macOS, Android и iOS

Статус документа: архитектурный план. Он не меняет заявленный support matrix до
прохождения acceptance gates каждой платформы.

## 1. Архитектурное решение

Voople остаётся одним продуктом с несколькими тонкими platform shells:

```text
Next.js web shell ────────┐
Tauri desktop shells ─────┼── shared views/hooks/types/API contracts
Mobile shell/adapters ────┘                 │
                                  Next.js API + LiveKit + storage
```

Next.js не нужно встраивать в desktop или mobile ради переиспользования. App
Router, Server Components и server runtime принадлежат web/backend. Переносимый
React UI, view-models, domain orchestration и API contracts уже должны жить в
`src/components`, `src/hooks`, `src/lib` и `src/types`. Tauri/Vite и будущий
mobile shell отвечают только за bootstrap, navigation, native lifecycle и I/O.

Платформа не получает второй `Chat`, `Profile`, `Feed` или `Room`. Если общий UI
не умеет представить capability, сначала расширяется общий явный контракт, а
затем добавляется platform adapter.

## 2. Capability boundary

До переноса экранов вводится типизированный registry возможностей:

| Capability | Общий контракт | Platform adapter |
| --- | --- | --- |
| Screen share | source, quality tier, lifecycle, honest audio state | browser API, Windows worker, Linux portal/PipeWire, macOS ScreenCaptureKit, Android MediaProjection, iOS ReplayKit |
| Media/audio | device list, permission, route change, mute/reconnect | WebRTC/Web Audio или native bridge |
| Notifications | normalized permission/action/deep link | Web Push, Windows/macOS/Linux notification, APNs/FCM |
| Secure storage | session/key handle без утечки значения | browser storage policy, OS keychain/keystore |
| App lifecycle | foreground/background/suspend/resume | browser visibility, Tauri events, mobile lifecycle |
| Updates | version state и release notes | web deploy, signed desktop updater, App Store/Play Store |
| Navigation/deep links | canonical Voople URL | web router или platform resolver |
| Presence/integrations | normalized privacy-safe activity | platform-specific opt-in adapter |

Общий UI получает `supported`, `permission`, `state`, `reason` и операции, а не
проверяет `isWindows`/`isMobile` по всему дереву. Unsupported capability должен
иметь понятный UI state, а не скрытый сломанный control.

## 3. Общие надёжностные правила

- Native realtime/capture pipeline изолируется от основного UI-процесса, если
  падение vendor/native stack способно завершить приложение. Windows
  screen-share worker остаётся эталоном этой границы.
- `start/stop/switch` являются session-bound и идемпотентными; stale completion
  старой session не меняет новую.
- Каждый listener, track, timer, worker и foreground service имеет владельца и
  детерминированный teardown.
- Server room/session state авторитетен; optimistic UI всегда имеет rollback и
  reconciliation.
- Permission denial, OS revocation, sleep/wake, device change, offline и
  reconnect входят в acceptance tests.
- Системные privacy indicators и permission pickers не маскируются и не
  подменяются. Собственный picker допустим только поверх разрешённых OS APIs.

## 4. Порядок платформ

### Этап 0 — shared-platform foundation

Сначала без нового публичного support:

1. зафиксировать capability interfaces и runtime registry;
2. убрать остающиеся прямые platform checks из portable domain components;
3. выделить shared contract tests и platform adapter conformance suite;
4. подготовить CI matrix и signing environments;
5. определить telemetry: startup, crash-free session, permission outcome,
   capture start/stop latency, reconnect и media quality без private content.

### Этап 1 — Linux desktop spike, затем beta

Цель: основной социальный продукт, voice и корректный экран на Wayland/X11.

- Tauri shell использует те же shared Views и API, что Windows.
- Screen capture идёт через XDG Desktop Portal; полученный PipeWire stream
  обрабатывается отдельным adapter/worker boundary.
- Проверяются Ubuntu LTS и Fedora, Wayland и X11, несколько portal backends,
  suspend/resume и смена audio device.
- Первый формат beta: AppImage и `.deb`; Flatpak добавляется после проверки
  portal permissions и updater/distribution model.
- Native application-audio нельзя обещать до spike: portal/desktop support
  различается. Video-only fallback должен быть честным и стабильным.

Gate beta: install/update/uninstall, auth/deep links, chat/profile/feed,
notifications, voice, camera, screen start/stop/reconnect и crash-free soak.

### Этап 2 — macOS desktop spike, затем beta

- Universal Tauri app (`arm64` + `x86_64`), signing, notarization и hardened
  runtime готовятся до публичной сборки.
- Захват реализуется через ScreenCaptureKit с системным content picker и явным
  Screen Recording permission. Native pipeline живёт в helper/worker boundary.
- Self-audio исключается разрешённым platform API; 30/60 fps и resolution tiers
  валидируются на sender и receiver, а не только по объявленным constraints.
- Тестируются Retina scaling, несколько дисплеев, Spaces/fullscreen, sleep/wake,
  смена output route и revoke permission во время share.

Gate beta включает Windows-эквивалентные screen/audio lifecycle tests, подпись,
notarization, updater rollback и Intel/Apple Silicon evidence.

### Этап 3 — mobile feasibility spike

Tauri поддерживает мобильные targets и native plugins на Kotlin/Swift, поэтому
это первый кандидат, но не заранее принятое решение. За ограниченный spike нужно
проверить на реальных устройствах:

- стабильность LiveKit voice/camera при background/foreground и route changes;
- push notification/deep-link cold start;
- secure session storage;
- keyboard, safe areas, accessibility и производительность shared Views;
- store packaging/review constraints;
- screen broadcast lifecycle и системные ограничения;
- размер бинарника, crash reporting и обновляемость native plugins.

Если WebView/Tauri mobile не проходит эти критерии, используется тонкий native
или React Native shell. Переиспользуются API schemas, view-models и domain logic;
неудачный spike не оправдывает копирование server logic или divergent product
behaviour.

### Этап 4 — Android companion, затем media features

Первая версия: auth, Home/Search, chats/groups, profile, notifications и voice.
Camera/screen share добавляются отдельным gate:

- screen capture через MediaProjection после системного consent;
- foreground service с постоянным OS notification на время capture;
- корректный teardown при revoke, lock, app task removal и process death;
- Bluetooth/wired/speaker route changes и audio focus tests;
- Play signing, internal testing, privacy/data-safety declarations.

### Этап 5 — iOS companion, затем media features

Первая версия совпадает по продуктовой модели с Android. Для media:

- ReplayKit/broadcast extension исследуется отдельным spike;
- CallKit/PushKit/background modes используются только по назначению и в рамках
  App Store правил;
- screen broadcast, audio session interruption, incoming call, AirPods/route
  changes и termination extension тестируются на устройствах;
- APNs, universal links, keychain и TestFlight/store signing изолированы в
  protected environments.

## 5. CI, signing и release topology

| Target | CI | Official distribution |
| --- | --- | --- |
| Web | Linux runner | текущий web deploy |
| Windows | Windows runner | signed NSIS/updater |
| Linux | Ubuntu runner + distro smoke | AppImage/DEB, затем Flatpak |
| macOS | macOS Intel/Apple Silicon matrix | signed/notarized DMG/updater |
| Android | Linux/macOS build + device tests | Play internal track → production |
| iOS | macOS + physical-device/TestFlight gate | App Store Connect |

Каждая платформа выпускается независимым подписанным artifact pipeline. Signing
secrets доступны только protected environment exact-step scope. Release
provenance содержит commit, dependency lock hashes, capability flags, tests,
SBOM и checksums. Отказ одной новой платформы не блокирует security hotfix для
уже поддерживаемой.

## 6. Definition of Done платформы

Платформа не считается поддерживаемой по факту успешной компиляции. Нужны:

1. shared product contract без platform UI forks;
2. install/update/uninstall и signed artifact;
3. auth/session/deep-link/notification lifecycle;
4. loading, empty, error, offline, reconnect и permission-denied states;
5. chat/group/profile/feed parity и responsive/accessibility evidence;
6. voice/camera/screen conformance там, где capability заявлена;
7. sleep/wake, device/route change, crash recovery и soak tests;
8. privacy disclosures, store/package metadata и support/rollback runbook;
9. telemetry и feature kill switch без чувствительных данных;
10. запись в `docs/product-delivery-matrix.md` с реальными test/RC evidence.

## 7. Ближайшее действие

До закрытия текущих P0/P1 реализуется только Этап 0 и короткие platform spikes в
изолированных `spike/*` ветках. Следующий безопасный срез — RFC capability
registry и Linux/macOS capture feasibility без обещания публичного релиза.

## 8. Platform references

- [Tauri: supported desktop/mobile platforms](https://v2.tauri.app/start/)
- [Tauri: platform-specific capabilities](https://v2.tauri.app/security/capabilities/)
- [Tauri: mobile plugin development](https://v2.tauri.app/develop/plugins/develop-mobile/)
- [Tauri: prerequisites, including the macOS requirement for iOS](https://v2.tauri.app/start/prerequisites/)
- [Tauri: platform distribution and signing](https://v2.tauri.app/distribute/)
- [XDG Desktop Portal ScreenCast](https://flatpak.github.io/xdg-desktop-portal/docs/doc-org.freedesktop.portal.ScreenCast.html)
- [XDG Desktop Portal and PipeWire](https://flatpak.github.io/xdg-desktop-portal/docs/pipewire.html)
- [Apple ScreenCaptureKit](https://developer.apple.com/documentation/ScreenCaptureKit)
- [Apple ReplayKit](https://developer.apple.com/documentation/ReplayKit)
- [Android MediaProjectionManager](https://developer.android.com/reference/android/media/projection/MediaProjectionManager)
- [Android foreground service types](https://developer.android.com/develop/background-work/services/fgs/service-types)
