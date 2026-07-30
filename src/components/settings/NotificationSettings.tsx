"use client";

import { Bell } from "lucide-react";

import { useAppPreferences } from "@/components/settings/AppPreferencesProvider";

const NOTIFICATION_OPTIONS = [
  ["notifyMessages", "Новые сообщения"],
  ["notifyReplies", "Ответы и упоминания"],
  ["notifyReactions", "Реакции и подписки"],
  ["notificationSound", "Звук уведомлений"],
] as const;

export function NotificationSettings({
  showDesktopCallNotifications = false,
}: {
  showDesktopCallNotifications?: boolean;
}) {
  const { preferences, updatePreferences } = useAppPreferences();
  return (
    <section id="notifications" className="settings-section scroll-mt-28">
      <div className="settings-section__header">
        <Bell className="h-5 w-5" />
        <div>
          <h2>Уведомления</h2>
        </div>
      </div>
      <div className="settings-rows">
        {NOTIFICATION_OPTIONS.map(([key, label]) => (
          <label className="settings-row" key={key}>
            <p className="font-medium">{label}</p>
            <input
              type="checkbox"
              className="settings-switch"
              checked={preferences[key]}
              onChange={(event) =>
                updatePreferences({ [key]: event.target.checked })
              }
            />
          </label>
        ))}
        {showDesktopCallNotifications ? (
          <label className="settings-row">
            <p className="font-medium">Системные уведомления о звонках</p>
            <input
              type="checkbox"
              className="settings-switch"
              checked={preferences.notifyCalls}
              onChange={(event) =>
                updatePreferences({ notifyCalls: event.target.checked })
              }
            />
          </label>
        ) : null}
      </div>
    </section>
  );
}
