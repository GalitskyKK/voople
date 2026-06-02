import Image from "next/image";

import { cn } from "@/lib/utils";

type ProfileAvatarProps = {
  displayName: string;
  size?: "sm" | "md" | "lg";
  ring?: boolean;
  decorationUrl?: string | null;
  animatedAvatarUrl?: string | null;
};

const sizes = {
  sm: { box: "h-8 w-8 text-xs", img: 32 },
  md: { box: "h-[72px] w-[72px] text-lg", img: 72 },
  lg: { box: "h-20 w-20 text-xl", img: 80 },
};

export function ProfileAvatar({
  displayName,
  size = "md",
  ring = false,
  decorationUrl,
  animatedAvatarUrl,
}: ProfileAvatarProps) {
  const initial = displayName.charAt(0).toUpperCase();
  const s = sizes[size];

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
          ring && "ring-2 ring-[var(--theme-accent)] ring-offset-2 ring-offset-[var(--theme-primary)]",
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
    </div>
  );
}
