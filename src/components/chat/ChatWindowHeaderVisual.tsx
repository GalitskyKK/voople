import type { ReactNode } from "react";

import { AppPanelHeader } from "@/components/layout/AppPanelHeader";

export function ChatWindowHeaderVisual({
  children,
  className,
  bannerUrl,
}: {
  children: ReactNode;
  className?: string;
  bannerUrl?: string | null;
}) {
  return (
    <AppPanelHeader
      className={`voople-chat-window__header bg-cover bg-center ${className ?? ""}`}
      style={bannerUrl ? {
        backgroundImage: `linear-gradient(90deg, color-mix(in srgb, var(--app-surface) 92%, transparent), color-mix(in srgb, var(--app-surface) 72%, transparent)), url("${bannerUrl}")`,
      } : undefined}
    >
      {children}
    </AppPanelHeader>
  );
}
