import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Download, MessageCircleMore, MonitorUp, Music2 } from "lucide-react";

import { LandingAccountActions } from "@/components/landing/LandingAccountActions";
import { LandingProductStory } from "@/components/landing/LandingProductStory";
import { LandingProfilePreview } from "@/components/landing/LandingProfilePreview";
import { VoopleMark } from "@/components/brand/VoopleMark";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { DESKTOP_RELEASE } from "@/lib/constants/desktop-release";
import { SITE_DESCRIPTION } from "@/lib/seo/site";

export const metadata: Metadata = {
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

const FRIEND_VOICE = [
  {
    title: "«ты где?»",
    text: "Открой чат — человек уже рядом.",
    icon: MessageCircleMore,
  },
  {
    title: "«щас экран покажу»",
    text: "Комната откроется поверх разговора, а не вместо него.",
    icon: MonitorUp,
  },
  {
    title: "«скинь тот трек»",
    text: "Он останется в сообщении и в профиле, где его найдут свои.",
    icon: Music2,
  },
] as const;

export default function HomePage() {
  return (
    <div className="voople-landing min-h-dvh">
      <header className="landing-header">
        <div className="landing-header__inner">
          <Link href="/" className="landing-wordmark" aria-label="Voople — главная">
            <VoopleMark />
            Voople
          </Link>
          <nav className="landing-header__nav" aria-label="Основная навигация">
            <Link href="/explore" className="landing-header__link">Посмотреть</Link>
            <LandingAccountActions />
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section className="landing-hero" aria-labelledby="landing-hero-title">
          <div className="landing-hero__ambient" aria-hidden="true" />
          <div className="landing-hero__copy">
            <p className="landing-eyebrow">Voople — пространство для своих</p>
            <h1 id="landing-hero-title" className="landing-hero__title">
              <span>Позвал своих.</span>
              <span>Все уже рядом.</span>
            </h1>
            <p className="landing-hero__lede">
              Открой комнату прямо из чата, покажи экран и скинь тот самый трек.
              Переписка, созвон и ваши профили остаются рядом — без пяти приложений
              и ссылки на встречу.
            </p>
            <div className="landing-hero__actions">
              <Link href="/register" className="landing-button landing-button--primary">
                Забрать свой @username <ArrowRight aria-hidden="true" />
              </Link>
              <Link
                href="/download/desktop"
                prefetch={false}
                className="landing-button landing-button--secondary"
              >
                <Download aria-hidden="true" />
                Скачать для Windows
              </Link>
              <Link href="/feed" className="landing-button landing-button--quiet">
                Сначала посмотреть
              </Link>
            </div>
            <div className="landing-hero__meta" aria-label="Условия использования">
              <span>Бесплатно</span>
              <span>Карту не просим</span>
              <span>Windows 10/11 x64</span>
            </div>
            {!DESKTOP_RELEASE.signed ? (
              <p className="landing-hero__release-note">
                Тестовая сборка без цифровой подписи: Windows может показать предупреждение
                SmartScreen. Для запуска выберите «Подробнее» → «Выполнить в любом случае».
              </p>
            ) : null}
          </div>

          <div className="landing-hero__preview">
            <LandingProfilePreview />
            <p className="landing-hero__proof"><span>Сейчас</span> Профиль говорит за тебя ещё до первого сообщения.</p>
          </div>
        </section>

        <section className="landing-friend-voice" aria-labelledby="friend-voice-title">
          <div className="landing-section-heading">
            <p className="landing-eyebrow">Голос друга, а не бренда</p>
            <h2 id="friend-voice-title">Обычно всё начинается так.</h2>
          </div>
          <div className="landing-friend-voice__list">
            {FRIEND_VOICE.map(({ title, text, icon: Icon }, index) => (
              <article key={title} className="landing-friend-voice__line">
                <span className="landing-friend-voice__number">0{index + 1}</span>
                <Icon aria-hidden="true" />
                <strong>{title}</strong>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <LandingProductStory />
      </main>

      <div className="landing-footer"><SiteFooter /></div>
    </div>
  );
}
