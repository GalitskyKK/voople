import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Download, MessageCircleMore, MonitorUp, Music2 } from "lucide-react";

import { LandingProfilePreview } from "@/components/landing/LandingProfilePreview";
import { LandingAccountActions } from "@/components/landing/LandingAccountActions";
import { LandingProductStory } from "@/components/landing/LandingProductStory";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { DESKTOP_RELEASE } from "@/lib/constants/desktop-release";
import { SITE_DESCRIPTION } from "@/lib/seo/site";

export const metadata: Metadata = {
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

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
            <p className="text-sm font-semibold uppercase tracking-[.18em] text-[var(--theme-accent)]">Место, куда можно позвать своих</p>
            <h1 className="mt-5 max-w-[760px] text-balance text-[clamp(3rem,7vw,5.8rem)] font-bold leading-[.93] tracking-[-0.065em]">
              Созвонились на пять минут. <span className="bg-[linear-gradient(100deg,var(--theme-accent),#f0abfc)] bg-clip-text text-transparent">Сидим третий час.</span>
            </h1>
            <p className="mt-7 max-w-xl text-pretty text-lg leading-8 text-[var(--app-muted)] sm:text-xl">
              Напиши «ты где?», открой комнату, покажи экран и скинь тот самый трек. Профиль, переписка и созвон остаются рядом — без пяти приложений и ссылки на встречу.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/register" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--theme-accent)] px-6 font-semibold text-white shadow-[0_12px_34px_color-mix(in_srgb,var(--theme-accent)_30%,transparent)] transition hover:-translate-y-0.5 hover:brightness-110">
                Забрать свой @username <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/download/desktop" prefetch={false} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--theme-accent)_42%,var(--app-border))] bg-[color-mix(in_srgb,var(--theme-accent)_10%,var(--app-surface))] px-6 font-semibold text-[var(--foreground)] transition hover:-translate-y-0.5 hover:border-[var(--theme-accent)] hover:bg-[color-mix(in_srgb,var(--theme-accent)_16%,var(--app-surface))]">
                <Download className="h-4 w-4" />
                Скачать для Windows
              </Link>
              <Link href="/feed" className="inline-flex h-12 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-6 font-medium transition hover:border-[var(--app-border-strong)] hover:bg-[var(--app-surface-soft)]">Сначала посмотреть</Link>
            </div>
            <p className="mt-4 text-sm text-[var(--app-muted)]">Бесплатно · карту не просим · Windows 10/11 x64</p>
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

        <section className="landing-friend-voice mx-auto max-w-6xl px-4 pb-24 sm:px-6" aria-labelledby="friend-voice-title">
          <p id="friend-voice-title" className="mb-5 text-xs font-semibold uppercase tracking-[.18em] text-[var(--app-muted)]">Обычно всё начинается так</p>
          <div className="landing-friend-voice__line"><MessageCircleMore /><strong>«ты где?»</strong><span>Открой чат — человек уже рядом.</span></div>
          <div className="landing-friend-voice__line"><MonitorUp /><strong>«щас экран покажу»</strong><span>Комната откроется поверх разговора, а не вместо него.</span></div>
          <div className="landing-friend-voice__line"><Music2 /><strong>«скинь тот трек»</strong><span>Он останется в сообщении и в профиле, где его найдут свои.</span></div>
        </section>

        <LandingProductStory />
      </main>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><SiteFooter /></div>
    </div>
  );
}
