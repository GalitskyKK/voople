# Карта общих компонентов Voople

Переносимый интерфейс принадлежит корневому `src`. Next routes и Tauri shell
передают данные и навигационные adapters, но не создают вторую DOM/CSS-версию
доменного компонента.

| Домен | Канонический слой | Web boundary | Desktop boundary | Допустимое отличие desktop |
|---|---|---|---|---|
| Shell и навигация | `components/layout/AppShellFrame`, `AppNavigationVisual`, `lib/layout/route-layout` | `MainShell`, Next `Link` | `DesktopShell`, state-router renderer | Window chrome, tray, hotkeys |
| Главная и лента | `components/home`, `components/feed/*Visual` | Server page загружает initial data | tRPC adapter загружает те же view-models | Нет Server Components; Tauri navigation renderer |
| Профиль | `ProfileCardView`, `ProfileBadgesView`, `ProfilePageView`, `ProfileFlipCard`, `feed/MiniProfilePopover` | `ProfileCard` подключает web queries и Next metadata | `DesktopProfile` передаёт те же view-models и только navigation/native adapters | Realtime можно отключить; системный share и desktop navigation |
| Чаты | `MessagesLayoutView`, `ChatWindowHeaderVisual`, `GroupInfoDrawer`, `GroupManagementSheetView` | Messages route; settings route; Supabase realtime hook | Desktop auth/realtime adapter; `/messages/:id/settings` использует тот же full-page View | Native notifications и transport realtime |
| Голос и комнаты | `components/chat/voice`, `VoiceSessionProvider`, `VoiceSessionDock` | Web media devices и browser picker | Тот же UI + Tauri process-audio bridge | WASAPI process loopback, global hotkeys |
| Магазин, подарки и Plus | `components/shop`, `ShopGiftDialog`, `components/subscription` | Server payment/API composition | tRPC/API adapter | Открытие checkout во внешнем браузере |
| Discovery | `ExploreView`, `ExploreSearchResults`, `NotificationsView`, `EventsPage` | Optional/protected tRPC adapters | Shared view + desktop navigation renderer | Только способ навигации |
| Настройки | `components/settings` | Browser permissions/storage | Те же секции + native settings panels | Tray, startup, updater, hotkeys |
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
корневом `src`. Следующие кандидаты на удаление из baseline: `DesktopPostCard`,
`DesktopChatThread`/composer и share-controller профиля.
