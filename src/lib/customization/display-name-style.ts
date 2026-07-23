import type { CSSProperties } from "react";

import type { DisplayNameStyle, NicknameEffect, NicknameFont } from "./types";

export const NICKNAME_FONTS: Array<{ id: NicknameFont; label: string; sample: string }> = [
  { id: "sans", label: "Базовый", sample: "Gg" },
  { id: "serif", label: "Редакционный", sample: "Gg" },
  { id: "rounded", label: "Мягкий", sample: "Gg" },
  { id: "mono", label: "Моно", sample: "Gg" },
  { id: "display", label: "Акцентный", sample: "Gg" },
  { id: "soft", label: "Дружелюбный", sample: "Gg" },
];

export const NICKNAME_EFFECTS: Array<{ id: NicknameEffect; label: string }> = [
  { id: "plain", label: "Минимализм" },
  { id: "gradient", label: "Градиент" },
  { id: "neon", label: "Неон" },
  { id: "highlight", label: "Выделение" },
  { id: "outline", label: "Контур" },
];

const FONT_FAMILIES: Record<NicknameFont, string | undefined> = {
  sans: undefined,
  serif: "Georgia, 'Times New Roman', serif",
  rounded: "ui-rounded, 'Arial Rounded MT Bold', system-ui, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Consolas, monospace",
  display: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif",
  soft: "'Trebuchet MS', system-ui, sans-serif",
};

export function displayNamePresentation(value: DisplayNameStyle): {
  className?: string;
  style: CSSProperties;
} {
  const color = value.color ?? "var(--foreground)";
  const effect = value.effect ?? (value.gradient ? "gradient" : "plain");
  const style: CSSProperties = { fontFamily: FONT_FAMILIES[value.font ?? "sans"] };

  if (effect === "gradient") {
    style.backgroundImage = `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 35%, var(--foreground)))`;
    style.color = "transparent";
    return { className: "bg-clip-text text-transparent", style };
  }
  if (effect === "neon") {
    style.color = color;
    style.textShadow = `0 0 5px ${color}, 0 0 14px ${color}`;
  } else if (effect === "highlight") {
    style.color = color;
    style.background = `color-mix(in srgb, ${color} 22%, transparent)`;
    style.paddingInline = "0.22em";
    style.borderRadius = "0.3em";
  } else if (effect === "outline") {
    style.color = "transparent";
    style.WebkitTextStroke = `1px ${color}`;
  } else {
    style.color = value.color ?? undefined;
  }

  return { style };
}
