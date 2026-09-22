import {
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  AudioLines,
  Crown,
  Download,
  GitFork,
  Link2,
  MonitorUp,
  Paintbrush,
  ShieldCheck,
  UserRoundPlus,
  UsersRound,
  Volume2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { VoopleMark } from "@/components/brand/VoopleMark";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { DESKTOP_RELEASE } from "@/lib/constants/desktop-release";
import { LandingAccountActions } from "./LandingAccountActions";
import styles from "./LandingPage.module.css";

export function LandingPage() {
  return (
    <div className={styles.page} data-route-kind="landing">
      <LandingHeader />
      <main id="main-content">
        <Hero />
        <Groups />
        <Rooms />
        <RoomActions />
        <Invites />
        <GuestEntry />
        <GroupPlus />
        <ClosingCall />
      </main>
      <SiteFooter className={styles.footer} />
    </div>
  );
}

function LandingHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.brand} aria-label="Voople — главная">
          <span className={styles.brandMark}><VoopleMark /></span>
          <span>VOOPLE</span>
        </Link>
        <nav className={styles.headerNav} aria-label="Навигация по лендингу">
          <a href="#groups">Группы</a>
          <a href="#rooms">Комнаты</a>
          <a href="#guest">Гостевой вход</a>
          <a href="#group-plus">Group+</a>
        </nav>
        <div className={styles.accountActions}><LandingAccountActions /></div>
      </div>
    </header>
  );
}
function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="landing-title">
      <div className={styles.heroLead}>
        <div>
          <h1 id="landing-title">VOOPLE</h1>
          <p>Группы друзей, общий чат и несколько голосовых комнат в одном приложении.</p>
        </div>
        <LandingActions />
      </div>
      <AppShot src="/landing/now.png" alt="Раздел Войс группы в Voople" priority />
      <div className={styles.heroIndex} aria-label="Основные части Voople">
        <span><UsersRound aria-hidden="true" /> постоянная группа</span>
        <span><AudioLines aria-hidden="true" /> Lobby и Rooms</span>
        <span><MonitorUp aria-hidden="true" /> screen share</span>
        <span><Link2 aria-hidden="true" /> гостевая ссылка</span>
      </div>
    </section>
  );
}

function Groups() {
  return (
    <ProductSection id="groups" title="Группы" copy="Состав, чат, файлы и история принадлежат группе. Голосовые комнаты меняются отдельно.">
      <AppShot src="/landing/chat.png" alt="Общий чат постоянной группы" position="left" />
      <dl className={styles.groupFacts}>
        <div><dt>VOICEKK</dt><dd>7 участников</dd></div>
        <div><dt>В голосе</dt><dd>Лобби · 3, DRG · 2</dd></div>
        <div><dt>Чат</dt><dd>Общий и разделы группы</dd></div>
      </dl>
    </ProductSection>
  );
}

function Rooms() {
  return (
    <ProductSection id="rooms" title="Комнаты" copy="Лобби — общий разговор. Остальные Room видны рядом; нажатие переключает текущую сессию.">
      <div className={styles.roomsComposition}>
        <AppShot src="/landing/now.png" alt="Лобби и активные комнаты группы" position="right" />
        <div className={styles.roomLedger} aria-label="Состояние комнат">
          <RoomLine name="Лобби" people="3" detail="kk говорит" current />
          <RoomLine name="DRG" people="2" detail="nmggk показывает экран" screen />
          <RoomLine name="Valorant" people="3" detail="18 минут" />
          <RoomLine name="Кино" people="0" detail="пусто" />
        </div>
      </div>
    </ProductSection>
  );
}

function RoomLine({ name, people, detail, current = false, screen = false }: { name: string; people: string; detail: string; current?: boolean; screen?: boolean }) {
  return (
    <div className={styles.roomLine} data-current={current || undefined}>
      <span className={styles.roomSignal}>{screen ? <MonitorUp aria-hidden="true" /> : <AudioLines aria-hidden="true" />}</span>
      <strong>{name}</strong>
      <small>{detail}</small>
      <b><UsersRound aria-hidden="true" /> {people}</b>
    </div>
  );
}

function RoomActions() {
  return (
    <section className={styles.mechanics} aria-labelledby="mechanics-title">
      <header className={styles.sectionHeading}>
        <h2 id="mechanics-title">Split / Switch / Voop</h2>
        <p>Три действия внутри голосового слоя.</p>
      </header>
      <div className={styles.mechanicRows}>
        <MechanicRow icon={<GitFork />} title="Split" copy="Отделиться из текущей Room во временную комнату.">
          <span className={styles.miniRoom} data-active="true">Лобби <i>вы здесь</i></span>
          <ArrowRight aria-hidden="true" />
          <span className={styles.miniRoom}>Split <i>временная</i></span>
        </MechanicRow>
        <MechanicRow icon={<ArrowRightLeft />} title="Switch" copy="Перейти в другую Room нажатием на её карточку.">
          <span className={styles.miniRoom}>Лобби <i>3</i></span>
          <ArrowRight aria-hidden="true" />
          <span className={styles.miniRoom} data-active="true">DRG <i>2 · экран</i></span>
        </MechanicRow>
        <MechanicRow icon={<UserRoundPlus />} title="Voop" copy="Позвать конкретного человека отойти вместе.">
          <span className={styles.personToken}><span>А</span> Аня</span>
          <ArrowRight aria-hidden="true" />
          <span className={styles.inviteToken}>Принять приглашение</span>
        </MechanicRow>
      </div>
    </section>
  );
}

function MechanicRow({ icon, title, copy, children }: { icon: ReactNode; title: string; copy: string; children: ReactNode }) {
  return (
    <article className={styles.mechanicRow}>
      <span className={styles.mechanicIcon} aria-hidden="true">{icon}</span>
      <div className={styles.mechanicCopy}><h3>{title}</h3><p>{copy}</p></div>
      <div className={styles.mechanicDemo}>{children}</div>
    </article>
  );
}

function Invites() {
  return (
    <ProductSection id="invites" title="Приглашение" copy="Одна точка входа для человека, знакомой группы или гостевой ссылки.">
      <div className={styles.invitePanel}>
        <InviteTarget icon={<UserRoundPlus />} title="Человек" detail="участник или знакомый" />
        <InviteTarget icon={<UsersRound />} title="Группа" detail="знакомая компания" />
        <InviteTarget icon={<Link2 />} title="Ссылка" detail="доступ к одной Room" />
      </div>
    </ProductSection>
  );
}

function InviteTarget({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return <div className={styles.inviteTarget}>{icon}<span><strong>{title}</strong><small>{detail}</small></span><ArrowRight aria-hidden="true" /></div>;
}

function GuestEntry() {
  return (
    <ProductSection id="guest" title="Гостевой вход" copy="Ссылка → имя → Room. Регистрация не требуется до входа.">
      <div className={styles.guestFlow} aria-label="Этапы гостевого входа">
        <div><span>1</span><strong>voople.app/r/••••••••</strong><small>Ссылка на DRG</small></div>
        <ArrowRight aria-hidden="true" />
        <div><span>2</span><strong>Имя</strong><small>Микрофон выключен</small></div>
        <ArrowRight aria-hidden="true" />
        <div><span>3</span><strong>DRG · 3 человека</strong><small>Только эта Room</small></div>
      </div>
      <div className={styles.guestRule}><ShieldCheck aria-hidden="true" /> Чат и состав группы гостю не открываются.</div>
    </ProductSection>
  );
}

function GroupPlus() {
  return (
    <ProductSection id="group-plus" title="Group+" copy="Оформление и дополнительные возможности принадлежат группе. Голос, Split, Switch и Voop остаются бесплатными.">
      <div className={styles.plusPanel}>
        <div className={styles.identityPreview}>
          <span className={styles.identityMark}><VoopleMark /></span>
          <div><strong>VOICEKK</strong><small>group identity</small></div>
          <div className={styles.materials} aria-label="Материалы оформления"><i /><i /><i /><i /></div>
        </div>
        <ul className={styles.plusList}>
          <li><Paintbrush aria-hidden="true" /><span><strong>Темы группы</strong><small>материалы Room и sidebar</small></span></li>
          <li><Volume2 aria-hidden="true" /><span><strong>Звуки</strong><small>набор принадлежит группе</small></span></li>
          <li><Crown aria-hidden="true" /><span><strong>Group utility</strong><small>качество, лимиты и identity slots</small></span></li>
        </ul>
      </div>
    </ProductSection>
  );
}

function ProductSection({ id, title, copy, children }: { id: string; title: string; copy: string; children: ReactNode }) {
  return (
    <section id={id} className={styles.productSection} aria-labelledby={`${id}-title`}>
      <header className={styles.sectionHeading}><h2 id={`${id}-title`}>{title}</h2><p>{copy}</p></header>
      {children}
    </section>
  );
}

function AppShot({ src, alt, priority = false, position = "center" }: { src: string; alt: string; priority?: boolean; position?: "left" | "center" | "right" }) {
  return (
    <figure className={styles.appShot} data-position={position}>
      <div className={styles.windowBar}><i /><i /><i /><span>Voople</span></div>
      <Image src={src} alt={alt} width={1440} height={900} priority={priority} sizes="(max-width: 760px) 100vw, 88vw" />
    </figure>
  );
}

function LandingActions() {
  return (
    <div className={styles.actions}>
      <Link href="/download/desktop" prefetch={false} className={styles.primaryAction}><Download aria-hidden="true" /> Скачать</Link>
      <Link href="/feed" className={styles.secondaryAction}>Открыть <ArrowUpRight aria-hidden="true" /></Link>
    </div>
  );
}

function ClosingCall() {
  return (
    <section className={styles.closing} aria-labelledby="landing-closing-title">
      <span className={styles.closingMark}><VoopleMark /></span>
      <div><h2 id="landing-closing-title">VOOPLE</h2><p>Группы, чат и голосовые комнаты.</p></div>
      <LandingActions />
      {!DESKTOP_RELEASE.signed ? <small>Windows-сборка пока без цифровой подписи.</small> : null}
    </section>
  );
}
