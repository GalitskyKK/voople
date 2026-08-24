"use client";

import { ArrowLeft, Home } from "lucide-react";
import { useEffect } from "react";

import { VoopleMark } from "@/components/brand/VoopleMark";
import { AppInternalLink } from "@/components/ui/AppInternalLink";
import { reportProductEvent } from "@/lib/telemetry/client";

export function NotFoundView({
  title = "Здесь ничего нет",
  description = "Возможно, ссылка устарела или страница была перемещена.",
  homeHref = "/feed",
  onBack,
  surface = "route",
}: {
  title?: string;
  description?: string;
  homeHref?: string;
  onBack?: () => void;
  surface?: "route" | "profile" | "post" | "desktop";
}) {
  useEffect(() => {
    reportProductEvent("not_found_viewed", { surface });
  }, [surface]);

  return (
    <section className="voople-not-found" aria-labelledby="not-found-title">
      <div className="voople-not-found__art" aria-hidden="true">
        <span className="voople-not-found__code">404</span>
        <VoopleMark className="voople-not-found__mark" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--theme-accent)]">Потерялись по дороге</p>
      <h1 id="not-found-title" className="mt-2 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">{title}</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--app-muted)]">{description}</p>
      <div className="mt-6 flex flex-col-reverse justify-center gap-2 sm:flex-row">
        {onBack ? (
          <button type="button" className="voople-not-found__secondary" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Назад
          </button>
        ) : null}
        <AppInternalLink href={homeHref} className="voople-not-found__primary">
          <Home className="h-4 w-4" aria-hidden="true" /> На Главную
        </AppInternalLink>
      </div>
    </section>
  );
}
