import { MessageCircle, Music, Sparkles } from "lucide-react";

import { MoodSlider } from "@/components/profile/MoodSlider";
import type { StatusPostPayload } from "@/types/domain";
import { cn } from "@/lib/utils";

type StatusPostBodyProps = {
  status: StatusPostPayload;
  className?: string;
};

/** Published status snapshot (read-only in feed). */
export function StatusPostBody({ status, className }: StatusPostBodyProps) {
  const hasMood = status.moodValue != null && status.moodValue > 0;
  const hasThought = Boolean(status.thought?.trim());
  const hasTrack = Boolean(status.trackTitle?.trim() || status.trackArtist?.trim());

  return (
    <div
      className={cn(
        "voople-status-post space-y-3 rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-4",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-white/40">
        <Sparkles className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
        <span>Состояние</span>
      </div>
      {hasMood && (
        <div className="voople-status-post__mood rounded-lg bg-white/5 px-3 py-2">
          <MoodSlider value={status.moodValue} readOnly />
        </div>
      )}
      {hasThought && (
        <blockquote className="voople-status-post__thought flex gap-3 border-l-2 border-[var(--theme-accent)] pl-3">
          <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-white/50" />
          <p className="text-sm italic leading-relaxed text-white/85">{status.thought}</p>
        </blockquote>
      )}
      {hasTrack && (
        <div className="voople-status-post__track flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--theme-accent)]/20 text-[var(--theme-accent)]">
            <Music className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{status.trackTitle}</p>
            {status.trackArtist && (
              <p className="truncate text-xs text-white/50">{status.trackArtist}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
