"use client";

import { useEffect, useRef } from "react";

type ProfileEffectProps = {
  effectUrl: string;
};

export function ProfileEffect({ effectUrl }: ProfileEffectProps) {
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const handler = () => {
      if (!ref.current) return;
      ref.current.style.animationPlayState = document.hidden ? "paused" : "running";
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  return (
    <img
      ref={ref}
      src={effectUrl}
      alt=""
      aria-hidden
      loading="lazy"
      className="pointer-events-none absolute inset-0 z-[15] h-full w-full object-cover"
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}
