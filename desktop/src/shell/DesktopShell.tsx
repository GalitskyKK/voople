import type { Session } from "@supabase/supabase-js";
import { invoke } from "@tauri-apps/api/core";
import { Plus } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";

import {
  AppBottomNavigationVisual,
  AppSidebarVisual,
  type NavigationDestinationRenderer,
} from "@/components/layout/AppNavigationVisual";
import { AppShellFrame } from "@/components/layout/AppShellFrame";
import { AppPageContent } from "@/components/layout/AppPageContent";
import { AccountChipVisual } from "@/components/layout/AccountChipVisual";
import { FeedHeaderVisual } from "@/components/layout/FeedHeaderVisual";
import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import { COPY, type FeedTabId } from "@/lib/constants/copy";
import { resolveRingStyle } from "@/lib/customization/rings";
import { getAppRouteLayout } from "@/lib/layout/route-layout";
import { registerInternalNavigationAdapter } from "@/lib/platform/internal-navigation";
import { useAppPreferences } from "@/components/settings/AppPreferencesProvider";
import { useVoiceSession } from "@/components/chat/voice/VoiceSessionProvider";
import { useSidebarPreference } from "@/hooks/useSidebarPreference";

import { syncDesktopUser } from "../api/sync-user";
import { createDesktopTrpcClient } from "../api/trpc";
import { getSupabase } from "../auth/supabase";
import type { DesktopConfig } from "../config";
import { useDesktopHotkeys } from "../hooks/useDesktopHotkeys";
import { useNativeVoiceHeartbeat } from "../hooks/useNativeVoiceHeartbeat";
import { DesktopNotificationBridge } from "../notifications/DesktopNotificationBridge";
const DesktopFeedAdapter = lazy(() =>
  import("../adapters/DesktopFeedAdapter").then((module) => ({
    default: module.DesktopFeedAdapter,
  })),
);
const DesktopExplore = lazy(() =>
  import("../explore/DesktopExplore").then((module) => ({
    default: module.DesktopExplore,
  })),
);
const DesktopHashtagFeedAdapter = lazy(() =>
  import("../adapters/DesktopHashtagFeedAdapter").then((module) => ({
    default: module.DesktopHashtagFeedAdapter,
  })),
);
const DesktopNotifications = lazy(() =>
  import("../notifications/DesktopNotifications").then((module) => ({
    default: module.DesktopNotifications,
  })),
);
const DesktopProfile = lazy(() =>
  import("../profile/DesktopProfile").then((module) => ({
    default: module.DesktopProfile,
  })),
);
const DesktopPostDetail = lazy(() =>
  import("../post/DesktopPostDetail").then((module) => ({
    default: module.DesktopPostDetail,
  })),
);
const DesktopMessages = lazy(() =>
  import("../chat/DesktopMessages").then((module) => ({
    default: module.DesktopMessages,
  })),
);
const DesktopGroupSettingsPage = lazy(() =>
  import("../chat/DesktopGroupInviteSheet").then((module) => ({
    default: module.DesktopGroupSettingsPage,
  })),
);
const EventsPage = lazy(() =>
  import("@/components/events/EventsPage").then((module) => ({
    default: module.EventsPage,
  })),
);
const DesktopSettings = lazy(() =>
  import("../settings/DesktopSettings").then((module) => ({
    default: module.DesktopSettings,
  })),
);
const DesktopShopAdapter = lazy(() =>
  import("../adapters/DesktopShopAdapter").then((module) => ({
    default: module.DesktopShopAdapter,
  })),
);
const DesktopHelp = lazy(() =>
  import("../help/DesktopHelp").then((module) => ({
    default: module.DesktopHelp,
  })),
);
const DesktopCreatePostModal = lazy(() =>
  import("../composer/DesktopCreatePostModal").then((module) => ({
    default: module.DesktopCreatePostModal,
  })),
);

const RESERVED_PROFILE_SLUGS = new Set([
  "events",
  "explore",
  "feed",
  "help",
  "login",
  "me",
  "messages",
  "notifications",
  "post",
  "settings",
  "shop",
]);

function profileUsernameFromPath(pathname: string) {
  const match = pathname.match(/^\/([a-z0-9_]+)$/i);
  if (!match || RESERVED_PROFILE_SLUGS.has(match[1].toLowerCase())) return null;
  return match[1];
}

function postIdFromPath(pathname: string) {
  return pathname.match(
    /^\/post\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i,
  )?.[1] ?? null;
}

function chatIdFromPath(pathname: string) {
  return pathname.match(
    /^\/messages\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i,
  )?.[1] ?? null;
}

function groupSettingsChatIdFromPath(pathname: string) {
  return pathname.match(
    /^\/messages\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/settings$/i,
  )?.[1] ?? null;
}

function hashtagFromPath(pathname: string) {
  const encodedTag = pathname.match(/^\/hashtag\/([^/]+)$/)?.[1];
  if (!encodedTag) return null;
  try {
    return decodeURIComponent(encodedTag).trim().replace(/^#/, "").toLowerCase() || null;
  } catch {
    return null;
  }
}

export function DesktopShell({
  config,
  session,
}: {
  config: DesktopConfig;
  session: Session;
}) {
  const [pathname, setPathname] = useState("/feed");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [feedVersion, setFeedVersion] = useState(0);
  const [feedTab, setFeedTab] = useState<FeedTabId>("overview");
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [viewerSummary, setViewerSummary] = useState<{
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    avatarDecorationUrl?: string | null;
    avatarRingId?: string | null;
  } | null>(null);
  const { preferences } = useAppPreferences();
  const { collapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed } = useSidebarPreference();
  const voiceSession = useVoiceSession();
  useNativeVoiceHeartbeat({
    config,
    accessToken: session.access_token,
    voiceSession,
  });

  useEffect(() => {
    let active = true;
    void syncDesktopUser(config, session).catch((error: unknown) => {
      if (active) {
        setSyncError(
          error instanceof Error
            ? error.message
            : "Ошибка синхронизации профиля",
        );
      }
    });
    return () => {
      active = false;
    };
  }, [config, session]);

  useEffect(() => {
    let active = true;
    const client = createDesktopTrpcClient(config, () => session.access_token);
    void client.query("user.me").then((value) => {
      if (!active || !value || typeof value !== "object") return;
      const summary = value as Record<string, unknown>;
      if (typeof summary.username !== "string" || typeof summary.displayName !== "string") return;
      setViewerSummary({
        username: summary.username,
        displayName: summary.displayName,
        avatarUrl: typeof summary.avatarUrl === "string" ? summary.avatarUrl : null,
        avatarDecorationUrl:
          typeof summary.avatarDecorationUrl === "string" ? summary.avatarDecorationUrl : null,
        avatarRingId: typeof summary.avatarRingId === "string" ? summary.avatarRingId : null,
      });
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [config, session.access_token]);

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    void invoke("set_window_behavior", {
      closeToTray: preferences.closeToTray,
      minimizeToTray: preferences.minimizeToTray,
    }).catch(() => undefined);
  }, [preferences.closeToTray, preferences.minimizeToTray]);

  const navigate = useCallback(
    (href: string) => {
      if (href === "/login") {
        void getSupabase(config).auth.signOut();
        return;
      }
      setPathname(href);
    },
    [config],
  );

  useEffect(
    () => registerInternalNavigationAdapter(navigate),
    [navigate],
  );
  const revealMainWindow = useCallback(() => {
    if ("__TAURI_INTERNALS__" in window) {
      void invoke<void>("show_main_window").catch(() => undefined);
    }
  }, []);

  const hotkeyActions = useMemo(
    () => ({
      newPost: () => {
        revealMainWindow();
        setComposerOpen(true);
      },
      search: () => {
        revealMainWindow();
        navigate("/explore");
      },
      messages: () => {
        revealMainWindow();
        navigate("/messages");
      },
      settings: () => {
        revealMainWindow();
        navigate("/settings");
      },
      toggleMicrophone: voiceSession.toggleMicrophone,
      toggleVoiceSound: voiceSession.toggleOutput,
      openVoicePanel: () => {
        revealMainWindow();
        voiceSession.openPanel();
      },
      leaveVoiceRoom: voiceSession.leaveRoom,
    }),
    [navigate, revealMainWindow, voiceSession],
  );
  useDesktopHotkeys(preferences.hotkeys, hotkeyActions, pathname === "/settings");

  const renderDestination = useCallback<NavigationDestinationRenderer>(
    ({ href, label, className, active, children, onNavigate }) => (
      <button
        type="button"
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className={className}
        onClick={() => {
          onNavigate?.();
          navigate(href);
        }}
      >
        {children}
      </button>
    ),
    [navigate],
  );

  const notificationBadge =
    unreadNotifications > 0 ? (
      <span
        className="desktop-nav-badge"
        aria-label={`Новых уведомлений: ${unreadNotifications}`}
      >
        {unreadNotifications > 99 ? "99+" : unreadNotifications}
      </span>
    ) : null;
  const profileUsername = profileUsernameFromPath(pathname);
  const postId = postIdFromPath(pathname);
  const chatId = chatIdFromPath(pathname);
  const groupSettingsChatId = groupSettingsChatIdFromPath(pathname);
  const hashtag = hashtagFromPath(pathname);
  const isProfileRoute = pathname === "/me" || profileUsername !== null;
  const isMessagesRoute = pathname === "/messages" || chatId !== null || groupSettingsChatId !== null;
  const routeLayout = getAppRouteLayout(pathname);

  return (
    <AppShellFrame
      routeKind={routeLayout.routeKind}
      fixedViewport
      sidebar={
        <AppSidebarVisual
          pathname={pathname}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
          notificationBadge={notificationBadge}
          renderDestination={renderDestination}
          accountNavigation={
            viewerSummary ? (
              <button
                type="button"
                className="block w-full"
                aria-label="Открыть свой профиль"
                onClick={() => navigate("/me")}
              >
                <AccountChipVisual
                  displayName={viewerSummary.displayName}
                  username={viewerSummary.username}
                  compact={sidebarCollapsed}
                  avatar={
                    <ProfileAvatarVisual
                      displayName={viewerSummary.displayName}
                      size="sm"
                      ringClassName={resolveRingStyle(viewerSummary.avatarRingId)?.className}
                      avatarImage={viewerSummary.avatarUrl ? <img src={viewerSummary.avatarUrl} alt="" className="h-full w-full object-cover" /> : undefined}
                      decorationImage={viewerSummary.avatarDecorationUrl ? <img src={viewerSummary.avatarDecorationUrl} alt="" className="h-full w-full object-contain" /> : undefined}
                    />
                  }
                />
              </button>
            ) : undefined
          }
        />
      }
      mainClassName={routeLayout.contentClassName}
    >
      <DesktopNotificationBridge
        config={config}
        session={session}
        pathname={pathname}
        preferences={preferences}
        navigate={navigate}
        onUnreadCountChange={setUnreadNotifications}
      />
      {pathname === "/feed" ? <FeedHeaderVisual activeTab={feedTab} onTabChange={setFeedTab} /> : null}
      <div className="desktop-shell-scroll voople-scroll">
        {syncError && (
          <p className="form-error desktop-shell-error" role="alert">
            {syncError}
          </p>
        )}
        <Suspense fallback={<DesktopRouteFallback />}>
          {pathname === "/feed" ? (
            <DesktopFeedAdapter
              key={feedVersion}
              config={config}
              session={session}
              renderDestination={renderDestination}
              navigate={navigate}
              tab={feedTab}
            />
          ) : pathname === "/explore" ? (
            <DesktopExplore
              config={config}
              session={session}
              renderDestination={renderDestination}
            />
          ) : hashtag ? (
            <DesktopHashtagFeedAdapter
              config={config}
              session={session}
              tag={hashtag}
              renderDestination={renderDestination}
            />
          ) : pathname === "/notifications" ? (
            <DesktopNotifications
              config={config}
              session={session}
              onUnreadCountChange={setUnreadNotifications}
              renderDestination={renderDestination}
            />
          ) : pathname === "/events" ? (
            <AppPageContent><EventsPage /></AppPageContent>
          ) : pathname === "/settings" ? (
            <DesktopSettings config={config} session={session} navigate={navigate} />
          ) : pathname === "/shop" ? (
            <DesktopShopAdapter config={config} />
          ) : pathname === "/help" ? (
            <DesktopHelp navigate={navigate} />
          ) : groupSettingsChatId ? (
            <DesktopGroupSettingsPage
              chatId={groupSettingsChatId}
              config={config}
              session={session}
              navigate={navigate}
            />
          ) : isMessagesRoute ? (
            <DesktopMessages
              config={config}
              session={session}
              activeChatId={chatId}
              navigate={navigate}
            />
          ) : postId ? (
            <DesktopPostDetail
              config={config}
              session={session}
              postId={postId}
              renderDestination={renderDestination}
            />
          ) : isProfileRoute ? (
            <DesktopProfile
              config={config}
              session={session}
              username={profileUsername}
              navigate={navigate}
              renderDestination={renderDestination}
            />
          ) : (
            <section className="desktop-placeholder">
              <p className="eyebrow">РАЗДЕЛ В РАЗРАБОТКЕ</p>
              <h1>{routeLabel(pathname)}</h1>
              <p>
                Этот экран будет подключён к общей реализации веб-приложения без
                отдельной копии верстки.
              </p>
            </section>
          )}
        </Suspense>
      </div>

      {(pathname === "/feed" || pathname === "/me") && (
        <button
          type="button"
          className="desktop-create-fab"
          aria-label={COPY.newPost}
          aria-haspopup="dialog"
          onClick={() => setComposerOpen(true)}
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} />
          <span>Написать пост</span>
        </button>
      )}

      {!chatId && !groupSettingsChatId ? (
        <AppBottomNavigationVisual
          pathname={pathname}
          notificationBadge={notificationBadge}
          renderDestination={renderDestination}
        />
      ) : null}

      {composerOpen && (
        <Suspense fallback={null}>
          <DesktopCreatePostModal
            config={config}
            session={session}
            onClose={() => setComposerOpen(false)}
            onCreated={() => setFeedVersion((version) => version + 1)}
          />
        </Suspense>
      )}
    </AppShellFrame>
  );
}

function DesktopRouteFallback() {
  return (
    <AppPageContent className="py-4 lg:py-6" aria-label="Загрузка раздела">
      <div className="feed-skeleton h-40 rounded-2xl" />
    </AppPageContent>
  );
}

function routeLabel(pathname: string) {
  const labels: Record<string, string> = {
    "/explore": COPY.search,
    "/messages": COPY.messages,
    "/events": "События",
    "/me": COPY.profile,
    "/shop": COPY.shop,
    "/help": "Помощь",
    "/settings": "Настройки",
  };
  return labels[pathname] ?? COPY.appName;
}
