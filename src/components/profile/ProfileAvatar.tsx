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
    <div className="relative shrink-0 overflow-visible">
      {decorationUrl && (
        <img
          src={decorationUrl}
          alt=""
          aria-hidden
          className="pointer-events-none absolute -inset-2 z-20 h-[calc(100%+16px)] w-[calc(100%+16px)] object-contain"
        />
      )}
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-600 to-violet-400 font-semibold text-white",
          s.box,
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
            "absolute bottom-0 right-0 z-30 rounded-full border-[var(--background)] bg-emerald-500",
            onlineDotSize[size],
          )}
          aria-label="В сети"
        />
      )}
    </div>
  );
}
