"use client";

import { useEffect, useState } from "react";

import { resolveAppThemeAssets } from "@/lib/app-theme-assets";
import { getAppTheme } from "@/lib/app-themes";
import { useAppTheme } from "./AppThemeProvider";

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return prefersReducedMotion;
}

type ThemeImageLayerProps = {
  url: string;
  className?: string;
};

function ThemeImageLayer({ url, className }: ThemeImageLayerProps) {
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- animated WebP/APNG backgrounds are not a good fit for next/image
    <img
      src={url}
      alt=""
      aria-hidden
      decoding="async"
      className={className}
      onError={() => setHidden(true)}
    />
  );
}

export function AppThemeBackground() {
  const { themeId } = useAppTheme();
  const prefersReducedMotion = usePrefersReducedMotion();
  const theme = getAppTheme(themeId);
  const assets = resolveAppThemeAssets(theme, {
    preferStaticBackground: prefersReducedMotion,
  });
  const hasLayers = Boolean(assets.backgroundUrl || assets.overlayUrl);

  if (!hasLayers) return null;

  return (
    <div
      key={themeId}
      aria-hidden
      className="voople-app-theme-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {assets.backgroundUrl && (
        <ThemeImageLayer
          url={assets.backgroundUrl}
          className="voople-app-theme-bg__image absolute inset-0 h-full w-full object-cover"
        />
      )}
      {assets.overlayUrl && (
        <ThemeImageLayer
          url={assets.overlayUrl}
          className="voople-app-theme-bg__overlay absolute inset-0 h-full w-full object-cover opacity-35 mix-blend-screen"
        />
      )}
      <div className="voople-app-theme-bg__scrim absolute inset-0 bg-background/78" />
    </div>
  );
}
