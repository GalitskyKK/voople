import { Download } from "lucide-react";
import Link from "next/link";

import { VoopleMark } from "@/components/brand/VoopleMark";
import { SiteFooter } from "@/components/layout/SiteFooter";

import { LandingAccountActions } from "./LandingAccountActions";
import styles from "./LandingPage.module.css";

export function LandingPage() {
  return (
    <div className={styles.page} data-route-kind="landing">
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Voople — главная">
          <span className={styles.brandMark}><VoopleMark /></span>
          <span>VOOPLE</span>
        </Link>
        <div className={styles.accountActions}><LandingAccountActions /></div>
      </header>

      <main id="main-content" className={styles.main}>
        <section className={styles.hero} aria-labelledby="landing-title">
          <h1 id="landing-title">VOOPLE</h1>
          <p>Место для своих: группы, общий чат и голосовые комнаты.</p>
          <div className={styles.actions}>
            <Link href="/login" className={styles.primaryAction}>Войти</Link>
            <Link href="/download/desktop" prefetch={false} className={styles.secondaryAction}>
              <Download aria-hidden="true" /> Скачать
            </Link>
          </div>
          <p className={styles.guestNote}>Гостем можно войти по ссылке-приглашению.</p>
        </section>
      </main>

      <SiteFooter className={styles.footer} />
    </div>
  );
}
