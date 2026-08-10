import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useMemo, useRef } from "react";

import { notificationHref, notificationText } from "@/components/notifications/notification-ui";
import type { AppPreferences } from "@/lib/app-preferences";
import type { ChatMessageNotificationView } from "@/types/chat";
import type { NotificationView } from "@/types/notifications";

import { createDesktopTrpcClient } from "../api/trpc";
import { getSupabase } from "../auth/supabase";
import type { DesktopConfig } from "../config";
import {
  listenForDesktopNotificationActions,
  notificationId,
  showDesktopNotification,
} from "./native";

type MessageInsertRow = { id: string; sender_id: string };

export function DesktopNotificationBridge({
  config,
  session,
  pathname,
  preferences,
  navigate,
  onUnreadCountChange,
}: {
  config: DesktopConfig;
  session: Session;
  pathname: string;
  preferences: AppPreferences;
  navigate: (href: string) => void;
  onUnreadCountChange: (count: number) => void;
}) {
  const focusedRef = useRef(true);
  const pathnameRef = useRef(pathname);
  const seenMessageIds = useRef(new Set<string>());
  const seenNotificationIds = useRef(new Set<string>());
  const client = useMemo(
    () => createDesktopTrpcClient(config, () => session.access_token),
    [config, session.access_token],
  );

  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    let active = true;
    void appWindow.isFocused()
      .then((focused) => { focusedRef.current = focused; })
      .catch(() => undefined);
    let disposeFocus: (() => void) | undefined;
    void appWindow.onFocusChanged(({ payload }) => { focusedRef.current = payload; })
      .then((dispose) => {
        if (active) disposeFocus = dispose;
        else dispose();
      })
      .catch(() => undefined);
    return () => {
      active = false;
      disposeFocus?.();
    };
  }, []);

  useEffect(() => {
    let active = true;
    let dispose: (() => Promise<void>) | undefined;
    void listenForDesktopNotificationActions(navigate).then((listener) => {
      if (active) dispose = listener;
      else void listener();
    }).catch(() => undefined);
    return () => {
      active = false;
      void dispose?.();
    };
  }, [navigate]);

  useEffect(() => {
    let active = true;
    const supabase = getSupabase(config);

    const shouldShow = (href: string) =>
      !focusedRef.current || document.visibilityState !== "visible" || pathnameRef.current !== href;

    const loadSocialNotifications = async (notifyNew: boolean) => {
      const items = (await client.query("notifications.list")) as NotificationView[];
      if (!active) return;
      onUnreadCountChange(items.filter((item) => !item.read).length);
      for (const item of [...items].reverse()) {
        if (seenNotificationIds.current.has(item.id)) continue;
        seenNotificationIds.current.add(item.id);
        if (!notifyNew || item.read || !shouldNotifySocial(item.type, preferences)) continue;
        const href = notificationHref(item);
        if (!shouldShow(href)) continue;
        await showDesktopNotification({
          id: notificationId(`social:${item.id}`),
          title: "Voople",
          body: notificationText(item.type, item.actor?.displayName ?? ""),
          href,
          group: "social",
          sound: preferences.notificationSound,
        });
      }
    };

    const showMessage = async (row: MessageInsertRow) => {
      if (
        !preferences.notifyMessages ||
        row.sender_id === session.user.id ||
        seenMessageIds.current.has(row.id)
      ) return;
      seenMessageIds.current.add(row.id);
      const context = (await client.query("chat.messageNotification", {
        messageId: row.id,
      })) as ChatMessageNotificationView | null;
      if (!active || !context) return;
      const href = `/messages/${context.chatId}`;
      if (!shouldShow(href)) return;
      await showDesktopNotification({
        id: notificationId(`message:${context.messageId}`),
        title: context.chatTitle,
        body: preferences.notificationPreview ? context.previewText : "Новое сообщение",
        href,
        group: `chat:${context.chatId}`,
        sound: preferences.notificationSound,
      });
    };

    seenMessageIds.current.clear();
    seenNotificationIds.current.clear();
    void loadSocialNotifications(false).catch(() => undefined);
    const channel = supabase
      .channel(`desktop:system-notifications:${session.user.id}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => void showMessage(payload.new as MessageInsertRow).catch(() => undefined),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${session.user.id}`,
        },
        () => void loadSocialNotifications(true).catch(() => undefined),
      )
      .subscribe();
    const pollId = window.setInterval(() => {
      void loadSocialNotifications(true).catch(() => undefined);
    }, 60_000);

    return () => {
      active = false;
      window.clearInterval(pollId);
      void supabase.removeChannel(channel);
    };
  }, [client, config, onUnreadCountChange, preferences, session.user.id]);

  return null;
}

function shouldNotifySocial(type: string, preferences: AppPreferences) {
  if (type === "reply" || type === "question") return preferences.notifyReplies;
  return preferences.notifyReactions;
}
