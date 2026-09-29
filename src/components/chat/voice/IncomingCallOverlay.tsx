"use client";

import { Phone, PhoneOff } from "lucide-react";
import { useEffect } from "react";

import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import { useAppPreferences } from "@/components/settings/AppPreferencesProvider";
import { resolveRingStyle } from "@/lib/customization/rings";
import { startProductSoundLoop } from "@/lib/sound/sound-playback";
import type { IncomingCallView } from "@/types/chat";

function useRingtone(key: string | null, enabled: boolean, pack: string) {
  useEffect(() => {
    if (!key || !enabled) return;
    const session = startProductSoundLoop("call.incoming");
    return () => session.stop();
  }, [enabled, key, pack]);
}

export function IncomingCallOverlay({
  call,
  declinePending,
  onAnswer,
  onDecline,
  allowCustomSound = true,
}: {
  call: IncomingCallView | null;
  declinePending: boolean;
  onAnswer: () => void;
  onDecline: () => void;
  allowCustomSound?: boolean;
}) {
  const { preferences } = useAppPreferences();
  useRingtone(call ? `${call.chatId}:${call.startedAt}` : null,
    Boolean(call && preferences.notificationSound && allowCustomSound), preferences.soundPack);
  if (!call) return null;

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/55 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="incoming-call-title"
        className="w-full max-w-sm rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 text-center shadow-2xl"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--theme-accent)">
          Входящий звонок
        </p>
        <div className="mx-auto mt-5 w-fit">
          <ProfileAvatarVisual
            displayName={call.caller.displayName}
            size="lg"
            isOnline
            ringClassName={resolveRingStyle(call.caller.avatarRingId)?.className}
            avatarImage={
              call.caller.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- shared Tauri/web call UI
                <img src={call.caller.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : undefined
            }
            decorationImage={
              call.caller.avatarDecorationUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- shared Tauri/web call UI
                <img
                  src={call.caller.avatarDecorationUrl}
                  alt=""
                  className="h-full w-full max-w-none object-contain"
                />
              ) : undefined
            }
          />
        </div>
        <h2 id="incoming-call-title" className="mt-4 text-xl font-semibold">
          {call.caller.displayName}
        </h2>
        <p className="mt-1 text-sm text-[var(--app-muted)]">
          @{call.caller.username}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={declinePending}
            onClick={onDecline}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 font-medium text-white transition hover:bg-red-400 disabled:opacity-50"
          >
            <PhoneOff className="h-5 w-5" />
            Отклонить
          </button>
          <button
            type="button"
            disabled={declinePending}
            onClick={onAnswer}
            className="voople-material-control inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 font-medium transition hover:border-[var(--material-ice)] disabled:opacity-50"
          >
            <Phone className="h-5 w-5" />
            Ответить
          </button>
        </div>
      </section>
    </div>
  );
}
