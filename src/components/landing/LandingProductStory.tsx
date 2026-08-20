"use client";

import { ArrowRight, Download, Headphones, MessageCircleMore, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const STORY = [
  {
    id: "profile",
    number: "01",
    eyebrow: "Профиль",
    title: "Открыл профиль — уже понял, что тебе скинуть.",
    text: "Настроение, музыка, короткая мысль и оформление живут вместе. Своим не придётся начинать разговор с дежурного «как дела?». ",
    proof: "Настроение, музыка и посты — в одном профиле",
  },
  {
    id: "messages",
    number: "02",
    eyebrow: "Сообщения",
    title: "Написал «го?» — и не потерял разговор между вкладками.",
    text: "Люди, личные чаты, группы и разделы находятся одним поиском. Сообщения, кружки, голосовые и музыка остаются в понятной ленте.",
    proof: "Люди, группы и разделы — в одном поиске",
  },
  {
    id: "rooms",
    number: "03",
    eyebrow: "Комнаты",
    title: "Покажи экран. Окно можно свернуть, разговор — нет.",
    text: "Камера, демонстрация и активный собеседник складываются в одну сцену. Мини-окно останется рядом, пока ты читаешь чат или листаешь ленту.",
    proof: "Камера, экран и мини-окно — в одной комнате",
  },
] as const;

type StoryId = (typeof STORY)[number]["id"];

function ProductFrame({ active }: { active: StoryId }) {
  return (
    <div className="landing-product-frame" data-scene={active} aria-live="polite">
      <div className="landing-product-frame__bar">
        <span />
        <span />
        <span />
        <strong>Voople</strong>
      </div>
      <div className="landing-product-frame__body">
        <nav aria-label="Пример навигации Voople">
          <span className={cn(active === "profile" && "is-active")}><UserRound /></span>
          <span className={cn(active === "messages" && "is-active")}><MessageCircleMore /></span>
          <span className={cn(active === "rooms" && "is-active")}><Headphones /></span>
        </nav>
        <div className="landing-product-frame__scene">
          <div className="landing-product-scene" data-product-scene="profile">
            <div className="landing-profile-card">
              <div className="landing-profile-card__cover" />
              <span className="landing-profile-card__avatar">В</span>
              <strong>Ваша карточка</strong>
              <small>@username · сегодня хочется громкой музыки</small>
              <div className="landing-profile-card__mood">♪ трек дня · 03:42</div>
            </div>
            <div className="landing-feed-note">
              <span>Свои поймут</span>
              <strong>Контекст виден ещё до первого сообщения.</strong>
              <small>Фото, кружок, музыка или короткий текст — без анкеты о себе.</small>
            </div>
          </div>

          <div className="landing-product-scene" data-product-scene="messages">
            <div className="landing-chat-list">
              <strong>Чаты</strong>
              <div className="landing-search-field">Поиск людей и групп</div>
              {["Команда", "Лена", "Музыка и дизайн"].map((name, index) => (
                <div key={name} className={cn("landing-chat-row", index === 0 && "is-active")}>
                  <span>{name.slice(0, 1)}</span><p><b>{name}</b><small>{index ? "Недавний разговор" : "Макет уже в сообщениях"}</small></p>
                </div>
              ))}
            </div>
            <div className="landing-chat-thread">
              <header><strong>Команда</strong><small>4 участника</small></header>
              <div className="landing-chat-thread__messages">
                <p>Созвон в восемь?</p>
                <p className="is-mine">Да. Экран покажу прямо в комнате.</p>
                <p>Закрепил план выше.</p>
              </div>
              <div className="landing-chat-composer">Сообщение…</div>
            </div>
          </div>

          <div className="landing-product-scene" data-product-scene="rooms">
            <div className="landing-room-stage">
              <div className="landing-room-stage__screen"><span>Демонстрация экрана</span></div>
              <div className="landing-room-stage__camera"><span>АК</span><small>Алексей</small></div>
              <div className="landing-room-stage__controls">●　●　●　●</div>
            </div>
            <div className="landing-call-float"><span>АК</span><p><b>Алексей говорит</b><small>Комната · 08:24</small></p></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingProductStory() {
  const [active, setActive] = useState<StoryId>("profile");
  const stepRefs = useRef(new Map<StoryId, HTMLElement>());

  useEffect(() => {
    let animationFrame = 0;
    const updateActiveStep = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const focusLine = window.innerHeight * 0.42;
        const closest = [...stepRefs.current.entries()]
          .map(([id, element]) => {
            const rect = element.getBoundingClientRect();
            return { id, distance: Math.abs(rect.top + rect.height / 2 - focusLine) };
          })
          .sort((a, b) => a.distance - b.distance)[0];
        if (closest) setActive(closest.id);
      });
    };
    updateActiveStep();
    window.addEventListener("scroll", updateActiveStep, { passive: true });
    window.addEventListener("resize", updateActiveStep);
    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", updateActiveStep);
      window.removeEventListener("resize", updateActiveStep);
    };
  }, []);

  return (
    <section className="landing-story" aria-labelledby="landing-story-title">
      <div className="landing-story__intro">
        <p>Между «ты где?» и «ещё пять минут»</p>
        <h2 id="landing-story-title">Переписка не заканчивается на кнопке «позвонить».</h2>
      </div>
      <div className="landing-story__grid">
        <div className="landing-story__steps">
          {STORY.map((step) => (
            <article
              key={step.id}
              ref={(element) => {
                if (element) stepRefs.current.set(step.id, element);
                else stepRefs.current.delete(step.id);
              }}
              data-story-id={step.id}
              className={cn("landing-story-step", active === step.id && "is-active")}
            >
              <span>{step.number}</span>
              <p>{step.eyebrow}</p>
              <h3>{step.title}</h3>
              <small>{step.text}</small>
              <strong className="landing-story-step__proof">{step.proof}</strong>
            </article>
          ))}
        </div>
        <div className="landing-story__sticky"><ProductFrame active={active} /></div>
      </div>
      <div className="landing-story__cta">
        <div>
          <p>Соберите своих в одном месте</p>
          <strong>Начните бесплатно. Карту не просим.</strong>
        </div>
        <div className="landing-story__cta-actions">
          <Link href="/register">Забрать @username <ArrowRight /></Link>
          <Link href="/download/desktop" prefetch={false}>Скачать для Windows <Download /></Link>
        </div>
      </div>
    </section>
  );
}
