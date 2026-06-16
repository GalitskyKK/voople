"use client"

import { useState } from "react"

type ProfileEffectProps = {
  effectUrl: string
}

/**
 * Картиночный эффект профиля (APNG / animated-WebP) поверх карточки.
 * Анимация живёт внутри самого файла, поэтому JS её не контролирует.
 * При ошибке загрузки слой скрывается через state (а не inline display:none).
 * Сброс при смене URL обеспечивает родитель через `key={effectUrl}`,
 * поэтому новый рабочий эффект не остаётся скрытым.
 */
export function ProfileEffect({ effectUrl }: ProfileEffectProps) {
  const [failed, setFailed] = useState(false)

  if (failed) return null

  return (
    // eslint-disable-next-line @next/next/no-img-element -- анимированные WebP/APNG не подходят для next/image
    <img
      src={effectUrl}
      alt=""
      aria-hidden
      loading="lazy"
      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      onError={() => setFailed(true)}
    />
  )
}
