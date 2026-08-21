import type { ReactNode } from "react";

import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { DisplayNameWithPin } from "@/components/profile/DisplayNameWithPin";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { displayNamePresentation } from "@/lib/customization/display-name-style";
import { cn } from "@/lib/utils";
import type { ProfileCustomizationView } from "@/types/domain";
import { FeedAuthorChipBackdrop } from "./FeedAuthorChipBackdrop";
import { MiniProfilePopover } from "./MiniProfilePopover";

type PostAuthorVisualProps = {
  username: string;
  displayName: string;
  hasVooplePlus?: boolean;
  createdAt: string;
  postId?: string;
  customization?: ProfileCustomizationView;
  avatar: ReactNode;
  renderDestination: NavigationDestinationRenderer;
  badgeUrl?: string;
  trailing?: ReactNode;
};

export function PostAuthorVisual({
  username,
  displayName,
  hasVooplePlus,
  createdAt,
  postId,
  customization,
  avatar,
  renderDestination,
  badgeUrl,
  trailing,
}: PostAuthorVisualProps) {
  const useFeedChip = Boolean(customization?.flags.hasFeedCardStyle);
  const nickname = customization
    ? displayNamePresentation(customization.displayName)
    : undefined;
  const timeClass =
    "text-xs text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]";
  const time = postId
    ? renderDestination({
        href: `/post/${postId}`,
        label: "Открыть публикацию",
        active: false,
        className: `${timeClass} hover:text-[color-mix(in_srgb,var(--foreground)_70%,transparent)] hover:underline`,
        children: <RelativeTime iso={createdAt} />,
      })
    : <RelativeTime iso={createdAt} className={timeClass} />;

  if (useFeedChip && customization) {
    return (
      <header className="voople-post-card__author-chip flex items-center gap-2 px-3 py-2.5">
        <div className="voople-author-nameplate relative h-14 min-w-0 flex-1 overflow-hidden rounded-xl">
          <FeedAuthorChipBackdrop
            backgroundUrl={customization.assets.feedCardBackgroundUrl}
          />
          <MiniProfilePopover author={{ username, displayName, hasVooplePlus, customization }} renderDestination={renderDestination}>
          {renderDestination({
            href: `/${username}`,
            label: displayName,
            active: false,
            className: "absolute inset-0 z-10 flex min-w-0 items-center",
            children: (
              <>
                <span className="absolute left-10 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  {avatar}
                </span>
                <DisplayNameWithPin
                  hasVooplePlus={hasVooplePlus}
                  badgeUrl={badgeUrl}
                  pinInteractive={false}
                  size="sm"
                  className="ml-20 min-w-0 max-w-[calc(100%_-_6rem)]"
                  nameClassName={cn(
                    "text-sm font-semibold",
                    customization.flags.hasDisplayNameStyle
                      ? nickname?.className
                      : "text-[var(--foreground)]",
                  )}
                  style={
                    customization.flags.hasDisplayNameStyle
                      ? nickname?.style
                      : undefined
                  }
                >
                  {displayName}
                </DisplayNameWithPin>
              </>
            ),
          })}
          </MiniProfilePopover>
        </div>
        <div className="ml-auto shrink-0">{time}</div>
        {trailing}
      </header>
    );
  }

  return (
    <header className="voople-post-card__header flex items-start gap-3 px-4 pt-4">
      {avatar}
      <div className="min-w-0 flex-1">
        <MiniProfilePopover author={{ username, displayName, hasVooplePlus, customization }} renderDestination={renderDestination}>
        {renderDestination({
          href: `/${username}`,
          label: displayName,
          active: false,
          className:
            "block min-w-0 text-sm font-medium text-[var(--foreground)] hover:underline",
          children: (
            <DisplayNameWithPin
              hasVooplePlus={hasVooplePlus}
              badgeUrl={badgeUrl}
              size="sm"
              nameClassName={
                customization?.flags.hasDisplayNameStyle
                  ? nickname?.className
                  : undefined
              }
              style={
                customization?.flags.hasDisplayNameStyle
                  ? nickname?.style
                  : undefined
              }
            >
              {displayName}
            </DisplayNameWithPin>
          ),
        })}
        </MiniProfilePopover>
        {time}
      </div>
      {trailing}
    </header>
  );
}
