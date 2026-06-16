"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { getEffectPreset, type EffectPreset } from "@/lib/customization/effects-registry";

type CssEffectLayerProps = {
  /** id пресета из effects-registry. */
  preset: string;
};

type Particle = {
  className: string;
  style: CSSProperties;
};

const PARTICLE_CLASS: Record<EffectPreset["kind"], string> = {
  snow: "voople-fx__p voople-fx__p--snow",
  confetti: "voople-fx__p voople-fx__p--confetti",
  sparkles: "voople-fx__p voople-fx__p--sparkle",
  fireflies: "voople-fx__p voople-fx__p--firefly",
};

/** Детерминированный PRNG (mulberry32) — одинаков на сервере и клиенте, без hydration mismatch. */
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildParticles(preset: EffectPreset): Particle[] {
  const rng = makeRng(hashSeed(preset.id));
  const between = (min: number, max: number) => min + rng() * (max - min);
  const className = PARTICLE_CLASS[preset.kind];

  return Array.from({ length: preset.count }, () => {
    const color = preset.colors[Math.floor(rng() * preset.colors.length)];
    const size = between(4, preset.kind === "confetti" ? 9 : 7);
    const style: CSSProperties = {
      ["--x" as string]: `${between(0, 100)}%`,
      ["--y" as string]: `${between(0, 100)}%`,
      ["--size" as string]: `${size}px`,
      ["--color" as string]: color,
      ["--dur" as string]: `${between(preset.durationSec * 0.7, preset.durationSec * 1.3)}s`,
      ["--delay" as string]: `${between(0, preset.durationSec)}s`,
      ["--drift" as string]: `${between(-24, 24)}px`,
      ["--dx" as string]: `${between(-30, 30)}px`,
      ["--dy" as string]: `${between(-30, 30)}px`,
    };
    return { className, style };
  });
}

/**
 * Рендерер code-driven эффектов (частицы на CSS). Жизненный цикл:
 * - уважает `prefers-reduced-motion` (частицы не рендерятся, плюс CSS-гейт в globals.css);
 * - пауза при скрытой вкладке (`visibilitychange`);
 * - пауза, когда карточка вне вьюпорта (`IntersectionObserver`) — экономит CPU.
 * Частицы детерминированы (seeded по id), поэтому SSR и клиент совпадают.
 */
export function CssEffectLayer({ preset: presetId }: CssEffectLayerProps) {
  const preset = getEffectPreset(presetId);
  const prefersReducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(false);
  const [offscreen, setOffscreen] = useState(false);
  const paused = hidden || offscreen;

  const particles = useMemo(() => (preset ? buildParticles(preset) : []), [preset]);

  // Пауза при скрытой вкладке.
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Пауза, когда карточка вне экрана — экономит CPU.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setOffscreen(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!preset) return null;

  return (
    <div
      ref={containerRef}
      className="voople-fx pointer-events-none absolute inset-0"
      data-paused={paused ? "true" : "false"}
      // Уважаем reduced-motion: частицы остаются как статичный декор, без движения.
      data-static={prefersReducedMotion ? "true" : "false"}
      aria-hidden
    >
      {particles.map((p, i) => (
        <span key={i} className={p.className} style={p.style} />
      ))}
    </div>
  );
}
