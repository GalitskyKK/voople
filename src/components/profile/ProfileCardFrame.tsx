import type { CSSProperties } from "react"

import type { ResolvedFrame } from "@/lib/customization/types"

import {
  ProfileCardFrameAsset,
  ProfileCardFrameSlice,
} from "./ProfileCardFrameAsset"

/**
 * CSS-рамки остаются matte-подложкой с padding. Растровая рамка собирается из
 * четырёх адаптивных срезов одного 1200×1600 файла: верх/низ не искажаются,
 * а по высоте растягиваются только прямые боковые стойки.
 */
export type FrameLayerProps = {
  className: string | null
  style: CSSProperties
}

export function ProfileCardFrameOverlay({ frame }: { frame: ResolvedFrame | null }) {
  if (frame?.kind !== "image" || !frame.imageUrl) return null

  return (
    <div className="profile-card__frame-overlay" aria-hidden>
      <ProfileCardFrameSlice
        key={`${frame.imageUrl}:left`}
        src={frame.imageUrl}
        viewBox="0 220 140 1160"
        className="profile-card__frame-side profile-card__frame-side--left"
      />
      <ProfileCardFrameSlice
        key={`${frame.imageUrl}:right`}
        src={frame.imageUrl}
        viewBox="1060 220 140 1160"
        className="profile-card__frame-side profile-card__frame-side--right"
      />
      <ProfileCardFrameSlice
        key={`${frame.imageUrl}:top`}
        src={frame.imageUrl}
        viewBox="0 0 1200 220"
        className="profile-card__frame-cap profile-card__frame-cap--top"
      />
      <ProfileCardFrameSlice
        key={`${frame.imageUrl}:bottom`}
        src={frame.imageUrl}
        viewBox="0 1380 1200 220"
        className="profile-card__frame-cap profile-card__frame-cap--bottom"
      />
    </div>
  )
}

/**
 * Independent artwork for the banner/body seam. It lives inside the body
 * stacking context, so the avatar, its ring and its decoration stay above it.
 */
export function ProfileCardFrameDivider({ frame }: { frame: ResolvedFrame | null }) {
  if (frame?.kind !== "image" || !frame.dividerUrl) return null

  return (
    <div className="profile-card__frame-divider" aria-hidden>
      <ProfileCardFrameAsset
        key={frame.dividerUrl}
        src={frame.dividerUrl}
        className="h-auto w-full max-w-none"
      />
    </div>
  )
}

/** CSS-переменные и класс для рамки-подложки на `<article class="profile-card">`. */
export function frameLayerProps(frame: ResolvedFrame | null): FrameLayerProps {
  // Every card uses the same outer shell/inset. This keeps the content width
  // and card footprint stable when a frame is equipped or removed.
  if (!frame) return { className: "profile-card--frame-shell", style: {} }

  const style: Record<string, string> = {
    "--profile-frame-width": `${frame.width}px`,
  }

  const [c1, c2] = frame.colors

  switch (frame.kind) {
    case "solid":
    case "glass":
      style["--profile-frame-color"] = c1 ?? "transparent"
      break
    case "gradient":
      style["--profile-frame-color"] = c1 ?? "transparent"
      style["--profile-frame-image"] = `linear-gradient(135deg, ${frame.colors.join(", ")})`
      break
    case "glow":
      style["--profile-frame-color"] = c1 ?? "transparent"
      style["--profile-frame-shadow"] =
        `0 0 18px 2px ${c2 ?? c1 ?? "transparent"}, 0 0 6px ${c1 ?? "transparent"}`
      break
    case "image":
      style["--profile-frame-color"] = c1 ?? "transparent"
      style["--profile-frame-outset"] = `${Math.max(frame.width, 18)}px`
      break
  }

  return {
    className:
      frame.kind === "image"
        ? "profile-card--frame-shell profile-card--framed profile-card--image-frame"
        : `profile-card--frame-shell profile-card--framed profile-card--framed-${frame.kind}`,
    style: style as CSSProperties,
  }
}
