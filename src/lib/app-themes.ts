import type { AppThemeAssetIds } from "@/lib/app-theme-assets";

export type AppThemeId = "void" | "violet" | "rose" | "emerald" | "gold";

export type AppTheme = {
  id: AppThemeId;
  name: string;
  description: string;
  paid?: boolean;
  tokens: {
    background: string;
    foreground: string;
    surface: string;
    surfaceSoft: string;
    border: string;
    accent: string;
    accentSoft: string;
  };
  assets?: AppThemeAssetIds;
};

export const APP_THEMES: AppTheme[] = [
  {
    id: "void",
    name: "Void",
    description: "Базовая тёмная тема Voople",
    tokens: {
      background: "#0C0C11",
      foreground: "#E8E8EC",
      surface: "#18181D",
      surfaceSoft: "rgba(255,255,255,0.045)",
      border: "rgba(255,255,255,0.08)",
      accent: "#8B7EC8",
      accentSoft: "rgba(139,126,200,0.14)",
    },
  },
  {
    id: "violet",
    name: "Violet Pulse",
    description: "Контрастная фиолетовая тема",
    tokens: {
      background: "#10091F",
      foreground: "#F5F0FF",
      surface: "#211334",
      surfaceSoft: "rgba(167,139,250,0.10)",
      border: "rgba(196,181,253,0.16)",
      accent: "#A78BFA",
      accentSoft: "rgba(167,139,250,0.22)",
    },
    assets: {
      backgroundId: "violet",
      backgroundStaticId: "violet-static",
    },
  },
  {
    id: "rose",
    name: "Neon Rose",
    description: "Платная тема для яркого профиля",
    paid: true,
    tokens: {
      background: "#160812",
      foreground: "#FFF1F7",
      surface: "#2B1022",
      surfaceSoft: "rgba(244,114,182,0.10)",
      border: "rgba(244,114,182,0.18)",
      accent: "#F472B6",
      accentSoft: "rgba(244,114,182,0.22)",
    },
    assets: {
      backgroundId: "rose",
      backgroundStaticId: "rose-static",
      overlayId: "rose-overlay",
    },
  },
  {
    id: "emerald",
    name: "Emerald",
    description: "Спокойная зелёная тема",
    tokens: {
      background: "#061410",
      foreground: "#ECFDF5",
      surface: "#0D241D",
      surfaceSoft: "rgba(52,211,153,0.10)",
      border: "rgba(110,231,183,0.16)",
      accent: "#34D399",
      accentSoft: "rgba(52,211,153,0.22)",
    },
    assets: {
      backgroundId: "emerald",
    },
  },
  {
    id: "gold",
    name: "Gold",
    description: "Платная тёплая тема",
    paid: true,
    tokens: {
      background: "#161006",
      foreground: "#FFF7ED",
      surface: "#2A1E0B",
      surfaceSoft: "rgba(251,191,36,0.10)",
      border: "rgba(251,191,36,0.18)",
      accent: "#FBBF24",
      accentSoft: "rgba(251,191,36,0.24)",
    },
    assets: {
      backgroundId: "gold.apng",
      backgroundStaticId: "gold-static",
    },
  },
];

export const DEFAULT_APP_THEME_ID: AppThemeId = "void";

export function getAppTheme(themeId: string | null | undefined): AppTheme {
  return APP_THEMES.find((theme) => theme.id === themeId) ?? APP_THEMES[0]!;
}
