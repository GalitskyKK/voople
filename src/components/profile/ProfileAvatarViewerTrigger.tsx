"use client";

import { useState, type ReactNode } from "react";

import { MediaLightbox } from "@/components/media/MediaLightbox";

export function ProfileAvatarViewerTrigger({
  url,
  displayName,
  children,
}: {
  url?: string | null;
  displayName: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (!url) return children;

  return (
    <>
      <button
        type="button"
        className="rounded-full text-left outline-none focus-visible:ring-2 focus-visible:ring-(--theme-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
        aria-label={`Открыть аватар ${displayName}`}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      <MediaLightbox
        url={open ? url : null}
        alt={`Аватар ${displayName}`}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
