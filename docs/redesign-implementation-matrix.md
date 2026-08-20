# Матрица редизайна Voople

Порядок источников: `VOOPLE_PROJECT_SPEC` → рабочая функциональность →
`2try_design` (layout/IA) → `1try_design` (identity/cosmetics). Матрица не
подменяет спецификацию: она показывает, где требование реализовано в коде и
что нужно проверять при следующем изменении.

| Срез | Поведение / источник | Каноническая реализация | Responsive и состояния |
|---|---|---|---|
| Shell | Spec §3; Penultimate | `AppShellFrame`, `AppNavigationVisual`, `MainShell` | 216/72 px sidebar, mobile safe-area nav, внутренний scroll |
| Home | Spec §4; Penultimate + Latest identity | `components/home`, `/feed` | compact «Сейчас», feed + right rail, loading/error/offline |
| Messaging | Spec §5; Penultimate + real app | `MessagesLayoutView`, `ChatWindow`, `GroupInfoDrawer` | list → conversation → right drawer; без постоянных members/banner |
| Rooms | Spec §6; Penultimate + real media | `VoiceRoomSheet`, `VoiceRoomStage`, `VoiceSessionDock` | full, screen-focus, one/empty, mini, compact 52 px, minimal indicator |
| Profile | Spec §7; real skeleton + Latest cosmetics | `ProfilePageView`, `ProfileCard*`, `MiniProfilePopover` | реальная двухколоночная карточка сохранена; Mini Profile переносит identity |
| Community | Spec §8–9; Penultimate + Latest banner preview | `/messages/[chatId]/settings`, `GroupManagementSheetView`, `GroupBoostPanel` | девять разделов, mobile horizontal local nav, desktop vertical nav |
| Store | Spec §10; Penultimate + Latest product preview | `ShopPageView`, `ShopCatalogPreview`, `ShopGiftDialog` | contextual preview; gift recipient/message/payment/chat card |
| Discovery | Spec §11; Penultimate | `ExploreView`, `NotificationsView`, `EventsPage` | search tabs; 5 notification categories; события сохраняют рабочий skeleton |
| Content safety | Release plan | `RichText`, `SafeExternalLink`, `link-safety` service | emoji nodes, URL interstitial, Web Risk unknown/safe/unsafe |
| Release notes | Release plan | `lib/release`, desktop updater views | bundled current entry + trusted catalog fallback |

## Обязательная визуальная проверка

- 360/390/1024/1440 px, light и dark;
- keyboard/focus и screen-reader names;
- loading/empty/error/offline/reconnecting;
- web и desktop wrappers;
- никакой banner группы над обычной перепиской и никакой постоянной четвёртой
  колонки участников.
