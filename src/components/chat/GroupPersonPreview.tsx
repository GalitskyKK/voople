"use client";

import type { ReactNode } from "react";

import { MiniProfilePopover } from "@/components/feed/MiniProfilePopover";
import { navigateInternally } from "@/lib/platform/internal-navigation";

export function GroupPersonPreview({ id, username, displayName, children, onOpenProfile, previewOnClick = false, focusPreview = true, className }: {
  id?: string;
  username: string;
  displayName: string;
  children: ReactNode;
  onOpenProfile?: (username: string) => void;
  previewOnClick?: boolean;
  focusPreview?: boolean;
  className?: string;
}) {
  return (
    <MiniProfilePopover
      author={{ id, username, displayName }}
      previewOnClick={previewOnClick}
      focusPreview={focusPreview}
      className={className}
      renderDestination={({ href, label, className, children: destination }) => (
        <a href={href} aria-label={label} className={className} onClick={(event) => {
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          if (onOpenProfile) { event.preventDefault(); onOpenProfile(username); }
          else if (navigateInternally(href)) event.preventDefault();
        }}>{destination}</a>
      )}
    >
      {children}
    </MiniProfilePopover>
  );
}
