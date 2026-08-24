# Карта общих компонентов Voople

Переносимый интерфейс принадлежит корневому `src`. Next routes и Tauri shell
передают данные и навигационные adapters, но не создают вторую DOM/CSS-версию
доменного компонента.

## Понятная модель слоёв

1. `MainShell` и `DesktopShell` — platform boundary: auth/session,
   route/window state, safe areas, updater/tray/hotkeys. Общие геометрия и
   навигация берутся из `AppShellFrame`/`AppNavigationVisual`; feature-state в
   shell не складывается.
2. Web/desktop feature adapters подключают tRPC/Supabase/Tauri, преобразуют
   ответы в общий view-model и передают callbacks. Adapter не владеет второй
   системой CSS или альтернативной карточкой/формой.
3. Общие hooks/controllers в `src/hooks` хранят переносимое состояние сценария:
   draft, selection, optimistic update, reconnect и state machine. Различающийся
   transport передаётся им как dependency/callback.
4. Stateless `*View/*Frame` в `src/components/<domain>` получают view-model,
   явное состояние (`loading/empty/error/offline/...`) и callbacks. Здесь живут
   единственные DOM, responsive-правила, focus и анимации.
5. `components/ui` и design tokens — нижний общий слой без знания web/desktop.

Поток однонаправленный:
`platform shell → feature adapter/controller → shared View → UI primitives`.
View не импортирует desktop, Next router, Supabase или server modules.

| Домен | Канонический слой | Web boundary | Desktop boundary | Допустимое отличие desktop |
|---|---|---|---|---|
| Shell и навигация | `components/layout/AppShellFrame`, `AppNavigationVisual`, `lib/layout/route-layout` | `MainShell`, Next `Link` | `DesktopShell`, state-router renderer | Window chrome, tray, hotkeys |
| Главная и лента | `components/home`, `components/feed/*Visual`, `CreatePostDialogView`, `PostDetailViewVisual`, `PostCommentsView`, `components/media/*View` | Server page и web controllers загружают initial/live data | Feed/post/create/comment adapters передают те же view-models и upload callbacks | Нет Server Components; Tauri navigation renderer и upload transport |
| Профиль | `ProfileCardView`, `ProfileBadgesView`, `ProfilePageView`, `ProfileFlipCard`, `ProfileShareController`, `ProfileEditSheet` + `profile/editor/*`, `feed/MiniProfilePopover` | `ProfileCard` и `ProfileShareCardButton` подключают web queries/metadata; `useProfileEditorController` владеет transport редактора | `DesktopProfileAdapter` и `DesktopProfileShareAdapter` передают те же view-models/callbacks и открывают тот же `ProfileEditSheet`; `desktop/src/profile` содержит только data hook | Realtime можно отключить; transport публикации и desktop navigation остаются адаптерами. Панели редактора stateless, сохранение/optimistic rollback/session boundary находятся только в controller |
| Чаты | `MessagesLayoutView`, `ChatThreadFrameView`, `ChatMessageBubble`, `ChatMessageAttachment`, `ChatComposerFormView`, `ChatComposerPreviewView`, `ChatComposerInputView`, `ChatWindowHeaderVisual`, `GroupInfoDrawerView`, `GroupManagementSheetView`; local attention/draft hooks владеют state recovery | `ChatWindow`/Messages route подключают web upload, tRPC и Next navigation | `DesktopMessagesAdapter`, `DesktopChatThreadAdapter`, `DesktopChatComposerAdapter`, `DesktopGroupManagementAdapter` передают desktop callbacks в те же Views | Native notifications, transport realtime и способ загрузки файла; DOM thread/composer/settings общий |
| Голос и комнаты | `ChatRoomControl` → `useChatRoomControl` (lifecycle/controller) → `ChatRoomControlView`; `VoiceRoomSheet` координирует stateless `VoiceRoomHeader/Content/Footer` через cohesive identity/connection/stage/controls/access/session models | Web media devices и обязательный browser/OS picker | Тот же controller и Room View; Tauri adapter только перечисляет окна/экраны и публикует выбранный native source | Windows libwebrtc desktop capture; WASAPI include-process-tree для окна и exclude-Voople system loopback для экрана; global hotkeys |
| Магазин, подарки и Plus | `components/shop`, `ShopGiftDialog`, `components/subscription` | Server payment/API composition | tRPC/API adapter | Открытие checkout во внешнем браузере |
| Discovery | `ExploreView`, `ExploreSearchResults`, `NotificationsView`, `EventsPage` | Optional/protected tRPC adapters | Shared view + desktop navigation renderer | Только способ навигации |
| Настройки и приватность | `components/settings`, `components/social/UserPrivacySettingsPanel`, `UserInterestsSettingsPanel` | tRPC/Supabase adapters передают данные и auth-действия | Те же Views получают данные из desktop tRPC/auth adapters | Tray, startup, updater, hotkeys; DOM форм интересов и приватности общий |
| Безопасные ссылки | `components/ui/RichText`, `SafeExternalLink` | `window.open` после interstitial | Registered Tauri external-link opener | Только системный browser command |
| Release notes | `components/release/ReleaseNotesView` + `lib/release/release-notes-format` | Может читать опубликованный catalog | Тонкий dialog-controller объединяет bundled changelog, CDN и updater history | Установка, restart и acknowledgement в Rust; presentation, safe links и long-content layout общие |
| System surfaces | `components/brand/BrandedLoadingView`, `components/system/NotFoundView` | Next `loading.tsx`/`not-found.tsx` только композируют Views | Session/route fallbacks передают те же Views и desktop back callback | Только platform routing; знак, copy, responsive и reduced-motion общие |

## Правило изменения

1. Изменить канонический view/hook/view-model.
2. Если требуется платформа, расширить маленький adapter, не копировать UI.
3. Кратко обновить строку выше, если появилось реальное различие.
4. Проверить web и desktop при 390/1024/1440 px в обеих темах.

В `desktop/src` допустимы shell, auth, API bridge, updater, notifications,
hotkeys и Windows media integration. Карточки, формы, профиль, сообщения,
комнаты и дизайн-токены должны импортироваться из корневого `src`.

## Переход завершён: второй UI запрещён

`desktopPortableUi` в `.architecture-baseline.json` пуст. Architecture gate
запрещает добавлять переносимые `.tsx` в desktop-домены. Новая возможность
сначала получает общий контракт/View; adapter добавляется только при реальном
различии transport, navigation или native capability.

Общие `HomeOverviewView`, Search, Notifications, Shop, полноэкранные настройки
группы и карточка профиля уже следуют этой схеме. `DesktopProfileCard` и
`DesktopProfileAvatar` и `DesktopProfileActions` удалены: положение edit-action,
баннер, identity, пины, подписка и переход в сообщения теперь меняются только в
корневом `src`. Desktop уже не содержит отдельных avatar, message bubble,
attachment и весь composer presentation: контекстное меню, сторона action-кнопки,
реакции, preview вложений, reply/edit, emoji/voice controls и responsive-поведение
меняются только в корневом `src`. Отдельные `DesktopEvents` и `DesktopPostMedia`
удалены; group/subchat/
section-access и shop-файлы перенесены из UI-доменов в transport/native adapters,
которые подключают канонические Views. Карточка публикации теперь собирается
единым `PostCardView`, а desktop оставляет только action/transport adapter вне
UI-домена. Feed и hashtag composition также вынесены в adapters и подключают
общие layout/header/card Views. Chat thread/messages, group management, create
post, media upload, comments, post detail и Explore также вынесены в adapters и
подключают корневые Views; portable desktop baseline полностью обнулён.

Настройки интересов, групповых тем и матрица приватности также следуют этому
правилу: все поля, состояния, лимиты и responsive-разметка находятся в
`src/components/social`; desktop-файлы только вызывают тот же tRPC-контракт.
Online presence больше не публикуется в общий клиентский канал: web и desktop
получают одинаковый серверно отфильтрованный набор видимых пользователей.
