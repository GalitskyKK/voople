# Карта общих компонентов Voople

Переносимый интерфейс принадлежит корневому `src`. Next routes и Tauri shell
передают данные и навигационные adapters, но не создают вторую DOM/CSS-версию
доменного компонента.

| Домен | Канонический слой | Web boundary | Desktop boundary | Допустимое отличие desktop |
|---|---|---|---|---|
| Shell и навигация | `components/layout/AppShellFrame`, `AppNavigationVisual`, `lib/layout/route-layout` | `MainShell`, Next `Link` | `DesktopShell`, state-router renderer | Window chrome, tray, hotkeys |
| Главная и лента | `components/home`, `components/feed/*Visual` | Server page загружает initial data | `DesktopFeedAdapter` загружает те же view-models | Нет Server Components; Tauri navigation renderer |
| Профиль | `ProfileCardView`, `ProfileBadgesView`, `ProfilePageView`, `ProfileFlipCard`, `ProfileShareController`, `feed/MiniProfilePopover` | `ProfileCard` и `ProfileShareCardButton` подключают web queries/metadata | `DesktopProfile` и `DesktopProfileShareAdapter` передают те же view-models и callbacks | Realtime можно отключить; transport публикации и desktop navigation остаются адаптерами |
| Чаты | `MessagesLayoutView`, `ChatMessageBubble`, `ChatMessageAttachment`, `ChatComposerInputView`, `ChatWindowHeaderVisual`, `GroupInfoDrawerView`, `GroupManagementSheetView`; `useChatSendMutation` и local attention/draft hooks владеют state recovery | `GroupInfoDrawer` и Messages route подключают tRPC/Next navigation | Desktop auth/realtime/upload adapters передают данные в те же Views и общий local draft contract; `/messages/:id/settings` использует тот же full-page View | Native notifications, transport realtime и способ загрузки файла |
| Голос и комнаты | `components/chat/voice`, `VoiceSessionProvider`, `VoiceSessionDock`, `ScreenShareSourcePicker` | Web media devices и обязательный browser/OS picker | Тот же Room UI; Tauri adapter перечисляет окна/экраны и публикует выбранный native source | Windows libwebrtc desktop capture; WASAPI include-process-tree для окна и exclude-Voople system loopback для экрана; global hotkeys |
| Магазин, подарки и Plus | `components/shop`, `ShopGiftDialog`, `components/subscription` | Server payment/API composition | tRPC/API adapter | Открытие checkout во внешнем браузере |
| Discovery | `ExploreView`, `ExploreSearchResults`, `NotificationsView`, `EventsPage` | Optional/protected tRPC adapters | Shared view + desktop navigation renderer | Только способ навигации |
| Настройки и приватность | `components/settings`, `components/social/UserPrivacySettingsPanel`, `UserInterestsSettingsPanel` | tRPC/Supabase adapters передают данные и auth-действия | Те же Views получают данные из desktop tRPC/auth adapters | Tray, startup, updater, hotkeys; DOM форм интересов и приватности общий |
| Безопасные ссылки | `components/ui/RichText`, `SafeExternalLink` | `window.open` после interstitial | Registered Tauri external-link opener | Только системный browser command |
| Release notes | Общий parser и safe link renderer | Может читать опубликованный catalog | Bundled changelog + updater history | Установка, restart и acknowledgement в Rust |

## Правило изменения

1. Изменить канонический view/hook/view-model.
2. Если требуется платформа, расширить маленький adapter, не копировать UI.
3. Кратко обновить строку выше, если появилось реальное различие.
4. Проверить web и desktop при 390/1024/1440 px в обеих темах.

В `desktop/src` допустимы shell, auth, API bridge, updater, notifications,
hotkeys и Windows media integration. Карточки, формы, профиль, сообщения,
комнаты и дизайн-токены должны импортироваться из корневого `src`.

## Контролируемый переход без второго UI

`.architecture-baseline.json` содержит старые desktop-файлы, существовавшие до
этого правила. Это не список разрешённых дублей: проверка запрещает добавлять
новые переносимые `.tsx` в desktop-домены. При работе над экраном старый файл
должен превращаться в data/native adapter, а DOM, состояние представления и
responsive-правила — переноситься в корневой `src/components`.

Общие `HomeOverviewView`, Search, Notifications, Shop, полноэкранные настройки
группы и карточка профиля уже следуют этой схеме. `DesktopProfileCard` и
`DesktopProfileAvatar` и `DesktopProfileActions` удалены: положение edit-action,
баннер, identity, пины, подписка и переход в сообщения теперь меняются только в
корневом `src`. Desktop уже не содержит отдельных avatar, message bubble,
attachment и composer input: контекстное меню, сторона action-кнопки, реакции,
вложения, emoji/voice controls и responsive-поведение меняются только в корневом
`src`. Отдельные `DesktopEvents` и `DesktopPostMedia` удалены; group/subchat/
section-access и shop-файлы перенесены из UI-доменов в transport/native adapters,
которые подключают канонические Views. Карточка публикации теперь собирается
единым `PostCardView`, а desktop оставляет только action/transport adapter вне
UI-домена. Feed и hashtag composition также вынесены в adapters и подключают
общие layout/header/card Views. Следующие кандидаты: внешний `DesktopChatThread`/upload-controller;
общий share-controller профиля уже вынесен.

Настройки интересов, групповых тем и матрица приватности также следуют этому
правилу: все поля, состояния, лимиты и responsive-разметка находятся в
`src/components/social`; desktop-файлы только вызывают тот же tRPC-контракт.
Online presence больше не публикуется в общий клиентский канал: web и desktop
получают одинаковый серверно отфильтрованный набор видимых пользователей.
