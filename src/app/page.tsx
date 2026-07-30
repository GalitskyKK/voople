import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CirclePlay, Download, Music2, Palette, Sparkles } from "lucide-react";

import { LandingProfilePreview } from "@/components/landing/LandingProfilePreview";
import { LandingAccountActions } from "@/components/landing/LandingAccountActions";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { DESKTOP_RELEASE } from "@/lib/constants/desktop-release";
import { SITE_DESCRIPTION } from "@/lib/seo/site";

export const metadata: Metadata = {
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

const FEATURES = [
  {
    icon: Sparkles,
    title: "Муд вместо пустого статуса",
    text: "Оставьте короткое настроение в профиле или превратите его в публикацию с контекстом.",
  },
  {
    icon: CirclePlay,
    title: "Живые кружки",
    text: "Запишите момент до 60 секунд, пересмотрите и поделитесь им без тяжёлого видеоредактора.",
  },
  {
    icon: Music2,
    title: "Музыка говорит за вас",
    text: "Прикрепляйте трек к настроению — друзья сразу понимают ваш сегодняшний вайб.",
  },
  {
    icon: Palette,
    title: "Профиль, который узнают",
    text: "Баннеры, рамки, украшения и стиль имени собираются в одну цельную карточку.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-dvh overflow-hidden bg-[var(--background)]">
      <header className="relative z-20 mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-xl font-bold tracking-[-0.04em]">Voople</Link>
        <nav className="flex items-center gap-2" aria-label="Основная навигация">
          <Link href="/explore" className="hidden rounded-xl px-3 py-2 text-sm text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)] sm:block">Посмотреть</Link>
          <LandingAccountActions />
        </nav>
      </header>

      <main id="main-content">
        <section className="relative mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
          <div className="pointer-events-none absolute left-1/2 top-0 -z-0 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--theme-accent)_24%,transparent),transparent_68%)] blur-2xl" />
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--theme-accent)_32%,var(--app-border))] bg-[color-mix(in_srgb,var(--theme-accent)_10%,transparent)] px-3 py-1.5 text-sm text-[color-mix(in_srgb,var(--theme-accent)_75%,white)]">
              <span className="h-2 w-2 rounded-full bg-[var(--theme-accent)] shadow-[0_0_12px_var(--theme-accent)]" />
              Соцсеть начинается с вашего состояния
            </span>
            <h1 className="mt-6 max-w-[760px] text-balance text-[clamp(3rem,7vw,5.8rem)] font-bold leading-[.93] tracking-[-0.065em]">
              Покажи, какой у тебя сегодня <span className="bg-[linear-gradient(100deg,var(--theme-accent),#f0abfc)] bg-clip-text text-transparent">муд.</span>
            </h1>
            <p className="mt-7 max-w-xl text-pretty text-lg leading-8 text-[var(--app-muted)] sm:text-xl">
              Мысли, музыка, фото и кружки складываются в живой профиль. Друзья реагируют не только на публикацию — они чувствуют ваш текущий момент.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/register" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--theme-accent)] px-6 font-semibold text-white shadow-[0_12px_34px_color-mix(in_srgb,var(--theme-accent)_30%,transparent)] transition hover:-translate-y-0.5 hover:brightness-110">
                Создать свой профиль <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/download/desktop" prefetch={false} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--theme-accent)_42%,var(--app-border))] bg-[color-mix(in_srgb,var(--theme-accent)_10%,var(--app-surface))] px-6 font-semibold text-[var(--foreground)] transition hover:-translate-y-0.5 hover:border-[var(--theme-accent)] hover:bg-[color-mix(in_srgb,var(--theme-accent)_16%,var(--app-surface))]">
                <Download className="h-4 w-4" />
                Скачать для Windows
              </Link>
              <Link href="/feed" className="inline-flex h-12 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-6 font-medium transition hover:border-[var(--app-border-strong)] hover:bg-[var(--app-surface-soft)]">Открыть ленту</Link>
            </div>
            <p className="mt-4 text-sm text-[var(--app-muted)]">Бесплатный профиль · Windows 10/11 x64 · без привязки карты</p>
            {!DESKTOP_RELEASE.signed ? (
              <p className="mt-2 max-w-xl text-xs leading-5 text-[var(--app-muted)]">
                Тестовая сборка без цифровой подписи: Windows может показать
                предупреждение SmartScreen. Для запуска выберите «Подробнее» →
                «Выполнить в любом случае».
              </p>
            ) : null}
          </div>

          <div className="relative z-10"><LandingProfilePreview /></div>
        </section>

        <section className="border-y border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface)_72%,transparent)] px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl"><p className="text-sm font-semibold uppercase tracking-[.18em] text-[var(--theme-accent)]">Один момент — много способов выразить</p><h2 className="mt-3 text-3xl font-bold tracking-[-.035em] sm:text-4xl">Не ещё одна лента одинаковых постов</h2></div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <article key={title} className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--theme-accent)_14%,transparent)] text-[var(--theme-accent)]"><Icon className="h-5 w-5" /></div>
                  <h3 className="mt-5 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><SiteFooter /></div>
    </div>
  );
}
