"use client";

import { CalendarDays, Gift, Sparkles } from "lucide-react";

import { TeamPinQuiz } from "@/components/settings/TeamPinQuiz";
import { SectionHeaderGlow } from "@/components/layout/SectionHeaderGlow";

export function EventsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 py-4 lg:py-6">
      <header className="relative overflow-hidden rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 sm:p-7">
        <SectionHeaderGlow />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--app-accent-soft)] px-2.5 py-1 text-xs font-semibold text-(--theme-accent)">
            <Sparkles className="h-3.5 w-3.5" /> Сейчас в Voople
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">На чьей ты волне?</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--app-muted)] sm:text-base">
            Пять живых ситуаций определят твою команду. Результат останется в профиле как постоянный пин — его нельзя получить обычной покупкой.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-2.5 py-2"><Gift className="h-3.5 w-3.5 text-(--theme-accent)" /> Награда: командный пин</span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-2.5 py-2"><CalendarDays className="h-3.5 w-3.5 text-(--theme-accent)" /> Первый сезон</span>
          </div>
        </div>
      </header>

      <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 sm:p-5">
        <TeamPinQuiz />
      </section>

      <section>
        <article className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">Следующий формат</span>
          <h2 className="mt-2 font-semibold">Эстафета моментов</h2>
          <p className="mt-1 text-sm leading-5 text-[var(--app-muted)]">Один общий вайб переходит от человека к человеку и меняется с каждым новым моментом.</p>
          <span className="mt-4 inline-flex text-xs font-medium text-[var(--app-muted)]">Скоро</span>
        </article>
      </section>
    </div>
  );
}
