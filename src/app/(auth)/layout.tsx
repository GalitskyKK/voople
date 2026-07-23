import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { COPY } from "@/lib/constants/copy";
import { CirclePlay, Music2, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Вход и регистрация",
  description: "Войдите в Voople или создайте аккаунт.",
  robots: { index: true, follow: true },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <main
        id="main-content"
        className="relative mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_440px] lg:py-12"
      >
        <div className="hidden lg:block">
          <Link href="/" className="text-2xl font-bold tracking-[-0.04em]">{COPY.appName}</Link>
          <h1 className="mt-12 max-w-xl text-5xl font-bold leading-[1.02] tracking-[-0.055em]">Ваш профиль начинается с того, что вы чувствуете сейчас.</h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-[var(--app-muted)]">Делитесь мудом, музыкой и живыми моментами — без необходимости придумывать большой пост.</p>
          <div className="mt-9 grid max-w-lg gap-3">
            {[
              [Sparkles, "Настроение остаётся главным элементом профиля"],
              [CirclePlay, "Кружки записываются и пересматриваются перед публикацией"],
              [Music2, "Трек добавляет контекст без лишних слов"],
            ].map(([Icon, text]) => {
              const FeatureIcon = Icon as typeof Sparkles;
              return <div key={text as string} className="flex items-center gap-3 text-sm"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--theme-accent)_14%,transparent)] text-[var(--theme-accent)]"><FeatureIcon className="h-4 w-4" /></span>{text as string}</div>;
            })}
          </div>
        </div>
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-7 text-center lg:hidden">
            <Link href="/" className="text-[1.75rem] font-semibold tracking-[-0.03em]">{COPY.appName}</Link>
            <p className="mt-2 text-sm text-[var(--app-muted)]">Покажите свой сегодняшний муд</p>
          </div>
          {children}
        </div>
      </main>
      <div className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
        <SiteFooter compact />
      </div>
    </div>
  );
}
