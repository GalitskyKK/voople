import Image from "next/image";

import { DEFAULT_RING, resolveRingStyle } from "@/lib/customization/rings";
import { cn } from "@/lib/utils";

export type ProfileAvatarProps = {
  displayName: string;
  size?: "sm" | "md" | "lg";
  /** Включает дефолтное кольцо (акцент темы). Игнорируется, если задан `ringId`. */
  ring?: boolean;
  /** Конкретное кольцо из магазина (`avatar_ring_id`); приоритетнее `ring`. */
  ringId?: string | null;
  decorationUrl?: string | null;
  animatedAvatarUrl?: string | null;
  isOnline?: boolean;
};

const sizes = {
  sm: { box: "h-8 w-8 text-xs", img: 32 },
  md: { box: "h-[72px] w-[72px] text-lg", img: 72 },
  lg: { box: "h-20 w-20 text-xl", img: 80 },
};

// The source decorations use a 288px canvas around a 240px avatar. Keeping a
// size per avatar context avoids Tailwind's image `max-width:100%` clamp while
// not turning a 32px feed avatar into a 100px ornament.
const decorationMinSize = { sm: 52, md: 100, lg: 112 } as const;

const onlineDotSize = {
  sm: "h-2.5 w-2.5 border",
  md: "h-3 w-3 border-2",
  lg: "h-3.5 w-3.5 border-2",
} as const;

export function ProfileAvatar({
  displayName,
  size = "md",
  ring = false,
  ringId,
  decorationUrl,
  animatedAvatarUrl,
  isOnline = false,
}: ProfileAvatarProps) {
  const initial = displayName.charAt(0).toUpperCase();
  const s = sizes[size];
  const ringStyle = ringId ? resolveRingStyle(ringId) : ring ? DEFAULT_RING : null;

  return (
    <div className={cn("relative shrink-0 overflow-visible", s.box)}>
      {decorationUrl && (
        <Image
          src={decorationUrl}
          alt=""
          aria-hidden
          width={288}
          height={288}
          unoptimized
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 object-contain object-center"
          style={{
            width: `max(140%, ${decorationMinSize[size]}px)`,
            height: `max(140%, ${decorationMinSize[size]}px)`,
            maxWidth: "none",
          }}
        />
      )}
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-600 to-violet-400 font-semibold text-[var(--foreground)]",
          "h-full w-full",
          ringStyle?.className,
        )}
      >
        {animatedAvatarUrl ? (
          <Image
            src={animatedAvatarUrl}
            alt=""
            width={s.img}
            height={s.img}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : (
          initial
        )}
      </div>
      {isOnline && (
        <span
          className={cn(
            "profile-avatar__presence absolute bottom-0 right-0 z-30 rounded-full border-[var(--background)] bg-emerald-500",
            onlineDotSize[size],
          )}
          aria-label="В сети"
        />
      )}
    </div>
  );
}
