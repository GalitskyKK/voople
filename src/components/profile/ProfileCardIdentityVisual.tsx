import type { ReactNode } from "react";

import { displayNamePresentation } from "@/lib/customization/display-name-style";
import { cn } from "@/lib/utils";
import type { ProfileCustomizationView } from "@/types/domain";
import { DisplayNameWithPin } from "./DisplayNameWithPin";

type ProfileCardIdentityVisualProps = {
  customization: ProfileCustomizationView;
  displayName: string;
  username: string;
  hasVooplePlus?: boolean;
  subscriptionExpiresAt?: string | null;
  badgeUrl?: string;
  avatar: ReactNode;
  badges?: ReactNode;
  compact?: boolean;
};

export function ProfileCardIdentityVisual({
  customization,
  displayName,
  username,
  hasVooplePlus = false,
  subscriptionExpiresAt,
  badgeUrl,
  avatar,
  badges,
  compact = false,
}: ProfileCardIdentityVisualProps) {
  const nickname = displayNamePresentation(customization.displayName);

  return (
    <div className={cn("relative z-10 px-4", compact ? "pb-4" : "pb-0")}>
      <div className="-mt-9 flex items-end justify-between gap-2 overflow-visible">
        {avatar}
        <span className="h-[72px] w-0 shrink-0" aria-hidden />
      </div>
      <DisplayNameWithPin
        as="div"
        hasVooplePlus={hasVooplePlus}
        subscriptionExpiresAt={subscriptionExpiresAt}
        badgeUrl={badgeUrl}
        size="md"
        className="mt-3"
        nameClassName={cn(
          "text-xl font-bold",
          customization.flags.hasDisplayNameStyle
            ? nickname.className
            : "text-[var(--foreground)]",
        )}
        style={
          customization.flags.hasDisplayNameStyle ? nickname.style : undefined
        }
      >
        {displayName}
      </DisplayNameWithPin>
      <div className="mt-0.5 flex min-w-0 items-center gap-2">
        <p className="shrink-0 text-sm text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]">
          @{username}
        </p>
        {compact ? null : badges}
      </div>
    </div>
  );
}
