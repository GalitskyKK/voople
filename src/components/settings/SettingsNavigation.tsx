"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

const SETTINGS_SECTIONS = [
  ["appearance", "Оформление"],
  ["messages", "Чаты"],
  ["notifications", "Уведомления"],
  ["interface", "Интерфейс"],
  ["hotkeys", "Горячие клавиши"],
  ["security", "Безопасность"],
  ["legal", "Документы"],
] as const;

export function SettingsNavigation() {
  const [activeSection, setActiveSection] = useState("appearance");

  const navigateTo = (sectionId: string) => {
    const target = document.getElementById(sectionId);
    if (!target) return;
    setActiveSection(sectionId);

    const scrollContainer = target.closest<HTMLElement>(
      ".desktop-shell-scroll, [data-voople-scroll]",
    );
    const reducedMotion = document.documentElement.dataset.reduceMotion === "true";
    if (scrollContainer) {
      const top =
        target.getBoundingClientRect().top -
        scrollContainer.getBoundingClientRect().top +
        scrollContainer.scrollTop -
        16;
      scrollContainer.scrollTo({
        top,
        left: scrollContainer.scrollLeft,
        behavior: reducedMotion ? "auto" : "smooth",
      });
      return;
    }

    window.scrollTo({
      top: target.getBoundingClientRect().top + window.scrollY - 80,
      left: window.scrollX,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  };

  return (
    <nav className="settings-nav" aria-label="Разделы настроек">
      {SETTINGS_SECTIONS.map(([id, label]) => (
        <button
          key={id}
          type="button"
          aria-current={activeSection === id ? "location" : undefined}
          onClick={() => navigateTo(id)}
          className={cn(activeSection === id && "settings-nav__active")}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
