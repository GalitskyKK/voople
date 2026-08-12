"use client";

import { Lock, MessageCircleMore } from "lucide-react";

import { useAppPreferences } from "@/components/settings/AppPreferencesProvider";
import { VooplePlusFeatureSurface } from "@/components/subscription/VooplePlusFeatureSurface";
import type { ChatWallpaper } from "@/lib/app-preferences";
import { cn } from "@/lib/utils";

const WALLPAPERS: Array<{ id: ChatWallpaper; label: string; paid?: boolean }> = [
  { id: "plain", label: "Без фона" },
  { id: "doodles", label: "Контуры" },
  { id: "grid", label: "Сетка" },
  { id: "aurora", label: "Аврора", paid: true },
];

export function ChatAppearanceSettings({
  hasSubscription,
  subscriptionAction,
}: {
  hasSubscription: boolean;
  subscriptionAction?: React.ReactNode;
}) {
  const { preferences, updatePreferences } = useAppPreferences();

  return (
    <section id="messages" className="settings-section">
      <div className="settings-section__header">
        <MessageCircleMore className="h-5 w-5" />
        <div>
          <h2>Фон сообщений</h2>
          <p>Превью показывает настоящий фон и пузырьки диалога. «Аврора» доступна с Вупл+.</p>
        </div>
      </div>
      <div className="settings-chat-wallpapers">
        {WALLPAPERS.filter((wallpaper) => !wallpaper.paid).map((wallpaper) => {
          const locked = Boolean(wallpaper.paid && !hasSubscription);
          const active = preferences.chatWallpaper === wallpaper.id;

          return (
            <button
              key={wallpaper.id}
              type="button"
              disabled={locked}
              aria-pressed={active}
              aria-label={`${wallpaper.label}${locked ? ", доступно с Вупл+" : ""}`}
              onClick={() => updatePreferences({ chatWallpaper: wallpaper.id })}
              className={cn(
                "settings-chat-wallpaper",
                active && "settings-chat-wallpaper--active",
              )}
            >
              <span className="settings-chat-wallpaper__preview" data-chat-wallpaper={wallpaper.id}>
                <span className="settings-chat-wallpaper__bubble settings-chat-wallpaper__bubble--theirs">Ты где?</span>
                <span className="settings-chat-wallpaper__bubble settings-chat-wallpaper__bubble--mine">Уже здесь</span>
              </span>
              <span className="settings-chat-wallpaper__label">
                {wallpaper.label}
                {locked ? <Lock className="h-3.5 w-3.5" aria-hidden /> : null}
              </span>
            </button>
          );
        })}
      </div>
      <VooplePlusFeatureSurface
        title="Фоны Вупл+"
        description="Дополнительные фоны остаются читаемыми в светлой и тёмной теме."
        locked={!hasSubscription}
        action={subscriptionAction}
      >
        <div className="settings-chat-wallpapers settings-chat-wallpapers--premium">
          {WALLPAPERS.filter((wallpaper) => wallpaper.paid).map((wallpaper) => {
            const locked = !hasSubscription;
            const active = preferences.chatWallpaper === wallpaper.id;
            return (
              <button
                key={wallpaper.id}
                type="button"
                disabled={locked}
                aria-pressed={active}
                aria-label={`${wallpaper.label}${locked ? ", доступно с Вупл+" : ""}`}
                onClick={() => updatePreferences({ chatWallpaper: wallpaper.id })}
                className={cn("settings-chat-wallpaper", active && "settings-chat-wallpaper--active")}
              >
                <span className="settings-chat-wallpaper__preview" data-chat-wallpaper={wallpaper.id}>
                  <span className="settings-chat-wallpaper__bubble settings-chat-wallpaper__bubble--theirs">Ты где?</span>
                  <span className="settings-chat-wallpaper__bubble settings-chat-wallpaper__bubble--mine">Уже здесь</span>
                </span>
                <span className="settings-chat-wallpaper__label">{wallpaper.label}{locked ? <Lock className="h-3.5 w-3.5" aria-hidden /> : null}</span>
              </button>
            );
          })}
        </div>
      </VooplePlusFeatureSurface>
    </section>
  );
}
