import type { CSSProperties } from "react"

import type { ResolvedFrame } from "@/lib/customization/types"

/**
 * Рамка карточки = подложка-matte вокруг всей карточки (баннер + основа как единый блок).
 * Реализована как `padding` + `background` на `<article class="profile-card">`
 * (см. `.profile-card--framed` в globals.css), поэтому заливка видна:
 *   - в кольце-паддинге по внешнему периметру,
 *   - в зазоре между баннером и основой (`--profile-section-gap`).
 * Баннер/основа лежат сверху и непрозрачны → matte не заходит на их площадь.
 * Заменяет прежний ProfileCardEffectLayer.
 *
 * Виды (frames-registry):
 * - solid    — сплошной цвет подложки
 * - gradient — градиент подложки
 * - glow     — цвет подложки + внешнее свечение (box-shadow)
 * - glass    — полупрозрачная подложка + backdrop-blur
 * - image    — картиночная подложка (cover; видна только в кольце/зазоре)
 */
export type FrameLayerProps = {
  className: string | null
  style: CSSProperties
}

/** CSS-переменные и класс для рамки-подложки на `<article class="profile-card">`. */
export function frameLayerProps(frame: ResolvedFrame | null): FrameLayerProps {
  if (!frame) return { className: null, style: {} }

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
      if (frame.imageUrl) {
        style["--profile-frame-image"] = `url("${frame.imageUrl}")`
      }
      break
  }

  return {
    className: `profile-card--framed profile-card--framed-${frame.kind}`,
    style: style as CSSProperties,
  }
}
