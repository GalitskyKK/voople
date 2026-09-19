import type { Metadata } from "next";
import type { ReactNode } from "react";

import Image from "next/image";
import Link from "next/link";

import {
  ArrowUpRight,
  Download,
} from "lucide-react";

import { Onest } from "next/font/google";

import { LandingAccountActions } from "@/components/landing/LandingAccountActions";
import { VoopleMark } from "@/components/brand/VoopleMark";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { DESKTOP_RELEASE } from "@/lib/constants/desktop-release";
import { SITE_DESCRIPTION } from "@/lib/seo/site";

const onest = Onest({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Voople",
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
};

export default function HomePage() {
  return (
    <div
      className={`
        ${onest.className}
        min-h-dvh
        overflow-x-hidden
        bg-[#0d080b]
        text-[#f3ece8]
        selection:bg-[#78b8ff]
        selection:text-[#0d080b]
      `}
    >
      <LandingMotion />

      <Header />

      <main>
        <Hero />
        <NowSection />
        <ContinuitySection />
        <FinalSection />
      </main>

      <div className="border-t border-[#49313b]/45">
        <SiteFooter />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* HEADER                                                                     */
/* -------------------------------------------------------------------------- */

function Header() {
  return (
    <header className="relative z-50 px-3 pt-3 md:px-5 md:pt-4">
      <div
        className="
          mx-auto
          flex h-[58px]
          max-w-[1660px]
          items-center
          justify-between
          rounded-[18px]
          border border-[#533642]/55
          bg-[#151014]/90
          px-4
          shadow-[0_12px_50px_rgba(0,0,0,.20)]
          backdrop-blur-xl
          md:px-5
        "
      >
        <Link
          href="/"
          aria-label="Voople"
          className="flex items-center gap-2.5"
        >
          <Logo className="size-[26px]" />

          <span
            className="
              text-[13px]
              font-semibold
              tracking-[-0.015em]
            "
          >
            VOOPLE
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/download/desktop"
            prefetch={false}
            className="
              hidden h-9
              items-center
              rounded-[10px]
              px-3
              text-[12px]
              text-[#a99ea4]
              transition
              hover:bg-[#21161c]
              hover:text-[#f3ece8]
              sm:flex
            "
          >
            Windows
          </Link>

          <LandingAccountActions />
        </nav>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* HERO                                                                       */
/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden px-3 md:px-5">
      <AmbientBackground />

      <div
        className="
          relative z-10
          mx-auto
          max-w-[1660px]
          px-1
          pb-16
          pt-20
          md:px-5
          md:pb-24
          md:pt-28
          xl:pt-32
        "
      >
        <div
          className="
            grid
            items-end
            gap-12
            xl:grid-cols-[.72fr_1.28fr]
            xl:gap-16
          "
        >
          <div className="pb-1 xl:pb-14">
            <div
              className="
                mb-7
                flex items-center
                gap-3
                text-[10px]
                font-medium
                uppercase
                tracking-[0.16em]
              "
            >
              <span className="text-[#e3a358]">
                SPLIT
              </span>

              <span className="text-[#61414c]">
                /
              </span>

              <span className="text-[#78b8ff]">
                SWITCH
              </span>

              <span className="text-[#61414c]">
                /
              </span>

              <span
                data-voop
                className="
                  text-[#d5cdd1]
                  animate-[voop-word_5.4s_ease-in-out_infinite]
                "
              >
                ВУП
              </span>
            </div>

            <h1
              className="
                max-w-[670px]
                text-[clamp(72px,10.5vw,172px)]
                font-extrabold
                leading-[.78]
                tracking-[-0.075em]
              "
            >
              VOOPLE
            </h1>

            <div className="mt-9 max-w-[430px]">
              <p
                className="
                  text-[15px]
                  font-medium
                  leading-6
                  text-[#e7dee1]
                "
              >
                Мессенджер для компаний друзей.
              </p>

              <p
                className="
                  mt-2
                  text-[13px]
                  leading-5
                  text-[#8f8289]
                "
              >
                Один чат группы. Несколько разговоров в войсе.
              </p>
            </div>

            <div className="mt-9 flex flex-wrap gap-2.5">
              <PrimaryLink href="/feed">
                Открыть
                <ArrowUpRight className="size-4" />
              </PrimaryLink>

              <SecondaryLink
                href="/download/desktop"
                prefetch={false}
              >
                <Download className="size-4" />
                Windows
              </SecondaryLink>
            </div>

            {!DESKTOP_RELEASE.signed ? (
              <p
                className="
                  mt-4
                  max-w-[360px]
                  text-[10px]
                  leading-4
                  text-[#685c62]
                "
              >
                Windows-сборка пока без цифровой подписи.
              </p>
            ) : null}
          </div>

          <HeroProduct />
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* HERO PRODUCT                                                               */
/* -------------------------------------------------------------------------- */

function HeroProduct() {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="
          absolute
          inset-[8%_-8%_-10%_5%]
          rounded-full
          bg-[#512a3a]/20
          blur-[110px]
        "
      />

      <div
        aria-hidden="true"
        className="
          absolute
          -right-[8%]
          top-[12%]
          size-[320px]
          rounded-full
          bg-[#4774aa]/10
          blur-[120px]
        "
      />

      <div
        className="
          relative
          rounded-[28px]
          border border-[#5b3946]/65
          bg-[#181015]
          p-[5px]
          shadow-[0_32px_110px_rgba(0,0,0,.42)]
        "
      >
        <div
          className="
            overflow-hidden
            rounded-[23px]
            bg-[#0e0a0c]
          "
        >
          <Image
            src="/landing/now.png"
            alt="Voople — Сейчас"
            width={1600}
            height={900}
            priority
            className="
              block h-auto w-full
              object-cover
            "
            sizes="(max-width: 1280px) 94vw, 62vw"
          />
        </div>
      </div>

      <LiveStatus />
    </div>
  );
}

function LiveStatus() {
  return (
    <div
      className="
        absolute
        -bottom-5
        left-5
        right-5
        hidden
        items-center
        justify-between
        rounded-[16px]
        border border-[#543642]/70
        bg-[#181015]/95
        px-4
        py-3
        shadow-[0_16px_50px_rgba(0,0,0,.38)]
        backdrop-blur-xl
        md:flex
      "
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center">
          <StatusAvatar
            label="A"
            className="bg-[#68545f]"
          />
          <StatusAvatar
            label="K"
            className="-ml-2 bg-[#82624f]"
          />
          <StatusAvatar
            label="B"
            className="-ml-2 bg-[#5f6277]"
          />
        </div>

        <div>
          <div className="text-[11px] font-medium text-[#e9e0e4]">
            Лобби
          </div>

          <div className="mt-0.5 text-[10px] text-[#83767c]">
            3 в войсе
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <SpeakingMark />

        <span className="text-[10px] text-[#e3a358]">
          kk говорит
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* NOW                                                                        */
/* -------------------------------------------------------------------------- */

function NowSection() {
  return (
    <section
      className="
        relative
        border-y border-[#49313b]/45
        bg-[#100b0e]
        px-3
        py-20
        md:px-5
        md:py-28
      "
    >
      <div className="mx-auto max-w-[1660px]">
        <SectionHeader>
          Сейчас
        </SectionHeader>

        <ProductFrame
          src="/landing/now.png"
          alt="Voople — Сейчас"
        />
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* CHAT + ROOM                                                                */
/* -------------------------------------------------------------------------- */

function ContinuitySection() {
  return (
    <section
      className="
        relative
        overflow-hidden
        px-3
        py-24
        md:px-5
        md:py-36
      "
    >
      <AmbientBackground />

      <div className="relative z-10 mx-auto max-w-[1660px]">
        <SectionHeader>
          Чат остаётся там же
        </SectionHeader>

        <div
          className="
            relative
            min-h-[580px]
            md:min-h-[760px]
            xl:min-h-[900px]
          "
        >
          <div
            className="
              relative z-10
              w-full
              xl:w-[72%]
            "
          >
            <ProductFrame
              src="/landing/chat.png"
              alt="Voople — Чат"
            />
          </div>

          <div
            className="
              relative
              z-20
              mt-5
              ml-auto
              w-full
              md:-mt-16
              md:w-[72%]
              xl:absolute
              xl:right-0
              xl:top-[26%]
              xl:mt-0
              xl:w-[58%]
            "
          >
            <ProductFrame
              src="/landing/room.png"
              alt="Voople — Комната"
            />
          </div>

          <MiniRoom />
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* MINI ROOM                                                                  */
/* -------------------------------------------------------------------------- */

function MiniRoom() {
  return (
    <div
      className="
        absolute
        bottom-[2%]
        left-[4%]
        z-30
        hidden
        w-[270px]
        rounded-[20px]
        border border-[#553642]/70
        bg-[#181015]/95
        p-4
        shadow-[0_24px_80px_rgba(0,0,0,.42)]
        backdrop-blur-xl
        xl:block
      "
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[12px] font-semibold">
            DRG
          </div>

          <div className="mt-0.5 text-[10px] text-[#83767c]">
            3 в войсе
          </div>
        </div>

        <div className="flex">
          <StatusAvatar
            label="N"
            className="bg-[#556476]"
          />
          <StatusAvatar
            label="A"
            className="-ml-2 bg-[#705b62]"
          />
          <StatusAvatar
            label="B"
            className="-ml-2 bg-[#765e4f]"
          />
        </div>
      </div>

      <div
        className="
          mt-4
          flex items-center
          justify-between
          border-t border-[#49313b]/45
          pt-3
        "
      >
        <div className="flex items-center gap-2">
          <SpeakingMark />

          <span className="text-[10px] text-[#e3a358]">
            nmgqk
          </span>
        </div>

        <span className="text-[10px] text-[#78b8ff]">
          экран
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* FINAL                                                                      */
/* -------------------------------------------------------------------------- */

function FinalSection() {
  return (
    <section
      className="
        relative
        grid min-h-[680px]
        place-items-center
        overflow-hidden
        border-t border-[#49313b]/45
        px-4 py-24
      "
    >
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          left-1/2
          top-1/2
          size-[800px]
          -translate-x-1/2
          -translate-y-1/2
          rounded-full
          bg-[#5b2b40]/15
          blur-[160px]
        "
      />

      <div className="relative z-10 text-center">
        <Logo className="mx-auto size-12" />

        <div
          className="
            mt-7
            text-[clamp(62px,10vw,142px)]
            font-extrabold
            leading-[.8]
            tracking-[-0.07em]
          "
        >
          VOOPLE
        </div>

        <div
          data-voop
          className="
            mt-7
            text-[11px]
            font-medium
            tracking-[0.34em]
            text-[#e3a358]
            animate-[voop-tail_5.6s_ease-in-out_infinite]
          "
        >
          вуууууууп
        </div>

        <div className="mt-10 flex justify-center gap-2.5">
          <PrimaryLink href="/feed">
            Открыть
            <ArrowUpRight className="size-4" />
          </PrimaryLink>

          <SecondaryLink
            href="/download/desktop"
            prefetch={false}
          >
            <Download className="size-4" />
            Windows
          </SecondaryLink>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* SHARED                                                                     */
/* -------------------------------------------------------------------------- */

function SectionHeader({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className="
        mb-6
        flex items-end
        justify-between
        gap-6
      "
    >
      <h2
        className="
          text-[clamp(28px,3vw,46px)]
          font-semibold
          tracking-[-0.045em]
        "
      >
        {children}
      </h2>

      <span
        data-voop
        className="
          hidden
          text-[10px]
          tracking-[0.18em]
          text-[#725f67]
          sm:block
        "
      >
        вуп
      </span>
    </div>
  );
}

function ProductFrame({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  return (
    <figure
      className="
        overflow-hidden
        rounded-[26px]
        border border-[#553642]/65
        bg-[#181015]
        p-[5px]
        shadow-[0_32px_100px_rgba(0,0,0,.36)]
      "
    >
      <div
        className="
          overflow-hidden
          rounded-[21px]
          bg-[#0e0a0c]
        "
      >
        <Image
          src={src}
          alt={alt}
          width={1600}
          height={900}
          className="block h-auto w-full"
          sizes="(max-width: 768px) 96vw, 90vw"
        />
      </div>
    </figure>
  );
}

function PrimaryLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="
        flex h-11
        items-center
        gap-2
        rounded-[12px]
        border border-[#78b8ff]/60
        bg-[#18243a]
        px-5
        text-[12px]
        font-medium
        text-[#c4deff]
        shadow-[0_12px_32px_rgba(66,114,171,.14)]
        transition
        hover:border-[#78b8ff]
        hover:bg-[#1e2e49]
      "
    >
      {children}
    </Link>
  );
}

function SecondaryLink({
  href,
  children,
  prefetch,
}: {
  href: string;
  children: ReactNode;
  prefetch?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className="
        flex h-11
        items-center
        gap-2
        rounded-[12px]
        border border-[#523641]/80
        bg-[#191116]
        px-5
        text-[12px]
        font-medium
        text-[#b7aeb3]
        transition
        hover:border-[#74505f]
        hover:bg-[#21161c]
        hover:text-[#f3ece8]
      "
    >
      {children}
    </Link>
  );
}

function StatusAvatar({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={`
        relative
        grid size-8
        place-items-center
        rounded-full
        border-2 border-[#181015]
        text-[9px]
        font-semibold
        text-[#f3ece8]
        ${className}
      `}
    >
      {label}

      <span
        className="
          absolute
          -bottom-[1px]
          -right-[1px]
          size-2.5
          rounded-full
          border-2 border-[#181015]
          bg-[#6fc7b8]
        "
      />
    </span>
  );
}

function SpeakingMark() {
  const heights = [6, 12, 18, 9, 15];

  return (
    <span
      className="
        flex h-5
        items-center
        gap-[3px]
      "
      aria-hidden="true"
    >
      {heights.map((height, index) => (
        <span
          key={index}
          data-motion
          className="
            w-[2px]
            rounded-full
            bg-[#e3a358]
          "
          style={{
            height,
            animation: `voice-pulse ${
              0.78 + index * 0.08
            }s ease-in-out infinite alternate`,
            animationDelay: `${index * -0.1}s`,
          }}
        />
      ))}
    </span>
  );
}

function AmbientBackground() {
  return (
    <>
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -left-[12%]
          top-[8%]
          size-[680px]
          rounded-full
          bg-[#612d43]/15
          blur-[150px]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -right-[10%]
          bottom-[2%]
          size-[520px]
          rounded-full
          bg-[#416b9b]/[0.06]
          blur-[160px]
        "
      />
    </>
  );
}

function Logo({
  className,
}: {
  className: string;
}) {
  return (
    <span
      className={`
        grid
        shrink-0
        place-items-center
        overflow-hidden
        ${className}
        [&_svg]:!block
        [&_svg]:!h-full
        [&_svg]:!w-full
        [&_svg]:!max-h-full
        [&_svg]:!max-w-full
      `}
    >
      <VoopleMark />
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* MOTION                                                                     */
/* -------------------------------------------------------------------------- */

function LandingMotion() {
  return (
    <style>{`
      @keyframes voice-pulse {
        from {
          transform: scaleY(.35);
          opacity: .45;
        }

        to {
          transform: scaleY(1);
          opacity: 1;
        }
      }

      @keyframes voop-word {
        0%, 18%, 100% {
          letter-spacing: .16em;
          opacity: .65;
        }

        46% {
          letter-spacing: .31em;
          opacity: 1;
        }

        68% {
          letter-spacing: .11em;
          opacity: .78;
        }
      }

      @keyframes voop-tail {
        0%, 100% {
          letter-spacing: .34em;
          opacity: .55;
        }

        48% {
          letter-spacing: .62em;
          opacity: 1;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        [data-motion],
        [data-voop] {
          animation: none !important;
        }
      }
    `}</style>
  );
}