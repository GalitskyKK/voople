"use client";

import { useState } from "react";
import type { RoomCover } from "@/lib/chat/room-cover";

/** Vector identity artwork, shared by web/Tauri without asset-origin assumptions. */
export function RoomCoverVisual({ cover }: { cover: RoomCover }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (cover.imageUrl && cover.imageUrl !== failedUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- portable room identity shared with Tauri
    return <img src={cover.imageUrl} alt="" loading="lazy" decoding="async" className="voople-room-cover__image" onError={() => setFailedUrl(cover.imageUrl)} />;
  }
  return <svg viewBox="0 0 200 200" className="voople-room-cover__art" data-preset={cover.preset} aria-hidden="true">
    <rect width="200" height="200" fill="var(--cover-ground)" />
    {cover.preset === "orbit" ? <g fill="none" stroke="var(--cover-ink)" strokeWidth="1.5">
      <circle cx="100" cy="100" r="25" fill="var(--cover-solid)" stroke="none" />
      <ellipse cx="100" cy="100" rx="77" ry="29" transform="rotate(-38 100 100)" />
      <ellipse cx="100" cy="100" rx="77" ry="29" transform="rotate(38 100 100)" />
      <circle cx="158" cy="61" r="7" fill="var(--cover-ink)" stroke="none" />
    </g> : cover.preset === "arcade" ? <g fill="var(--cover-ink)">
      <rect x="29" y="29" width="64" height="64" rx="16" /><rect x="107" y="107" width="64" height="64" rx="16" />
      <circle cx="139" cy="61" r="32" fill="var(--cover-solid)" /><circle cx="61" cy="139" r="32" fill="var(--cover-solid)" />
      <path d="M49 61h24m-12-12v24M127 139h24m-12-12v24" stroke="var(--cover-ground)" strokeWidth="4" strokeLinecap="round" />
    </g> : cover.preset === "wave" ? <g fill="none" stroke="var(--cover-ink)" strokeWidth="9" strokeLinecap="round">
      <path d="M-10 58c50-65 70 65 120 0s70 65 110 0M-10 100c50-65 70 65 120 0s70 65 110 0M-10 142c50-65 70 65 120 0s70 65 110 0" />
    </g> : <g>
      <circle cx="100" cy="85" r="48" fill="var(--cover-solid)" />
      <path d="M0 127Q55 80 105 129T210 122V200H0Z" fill="var(--cover-ink)" />
      <path d="M0 163Q55 115 105 164T210 157" fill="none" stroke="var(--cover-ground)" strokeWidth="2" />
    </g>}
  </svg>;
}
