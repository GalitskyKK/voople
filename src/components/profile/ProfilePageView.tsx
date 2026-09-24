"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { useElementScrolledPast } from "@/hooks/useElementScrolledPast";
import { reportProductEvent } from "@/lib/telemetry/client";

type ProfilePageViewProps = {
  card: ReactNode;
  context?: ReactNode;
  renderStickyHeader?: (visible: boolean) => ReactNode;
  telemetryKey?: string;
};

export function ProfilePageView({ card, context, renderStickyHeader, telemetryKey }: ProfilePageViewProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const stickyVisible = useElementScrolledPast(cardRef, { edgeTop: 48 });

  useEffect(() => {
    reportProductEvent("profile_opened", { surface: "profile" });
  }, [telemetryKey]);

  return <>
    {renderStickyHeader?.(stickyVisible)}
    <div className="voople-profile-page flex w-full min-w-0 flex-col gap-4 py-4 lg:min-h-0 lg:flex-1 lg:flex-row lg:gap-6 lg:py-6">
      <div ref={cardRef} className="voople-profile-page__card w-full shrink-0 lg:sticky lg:top-6 lg:self-start lg:w-[320px]">
        {card}
      </div>
      <aside data-voople-scroll="" className="voople-profile-page__context voople-scroll min-w-0 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
        {context}
      </aside>
    </div>
  </>;
}
