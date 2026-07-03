"use client"

import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

import { useProfileCardVideo } from "./ProfileCardVideoScope"

export type ProfileCardVideoPlacement = "banner" | "body"

type ProfileCardVideoProps = {
  placement: ProfileCardVideoPlacement
  className?: string
}

/**
 * Медиа-слой баннера/основы: sharp в баннере, blurred под glass-подложкой в body.
 * Поддерживает и видео (webm/mp4 + poster), и картинку (image-баннер).
 */
export function ProfileCardVideo({ placement, className }: ProfileCardVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { media, isActive, prefersReducedMotion } = useProfileCardVideo()

  const isVideo = media.kind === "video"

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (prefersReducedMotion || !isActive) {
      video.pause()
      return
    }

    void video.play().catch(() => {
      /* autoplay blocked — poster остаётся */
    })
  }, [isActive, prefersReducedMotion])

  const showVideo = isVideo && isActive && !prefersReducedMotion
  const isBody = placement === "body"

  // Постер для видео / URL для картинки — общий fallback-источник.
  const imageSrc =
    media.kind === "video" ? media.posterUrl : media.kind === "image" ? media.imageUrl : ""

  return (
    <div
      aria-hidden
      className={cn(
        "profile-card-video rounded-2xl pointer-events-none absolute inset-0 overflow-hidden",
        isBody ? "profile-card-video--body" : "profile-card-video--banner",
        className,
      )}>
      <div className="profile-card-video__media absolute inset-0">
        {showVideo && media.kind === "video" ? (
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            playsInline
            muted
            loop
            autoPlay
            poster={media.posterUrl}
            preload="metadata">
            <source src={media.webmUrl} type="video/webm" />
            <source src={media.mp4Url} type="video/mp4" />
          </video>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- poster / image fallback
          <img
            src={imageSrc}
            alt=""
            aria-hidden
            decoding="async"
            fetchPriority="low"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </div>
      {isBody ? (
        <div className="profile-card-video__body-scrim absolute inset-0" aria-hidden />
      ) : (
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20"
          aria-hidden
        />
      )}
    </div>
  )
}
