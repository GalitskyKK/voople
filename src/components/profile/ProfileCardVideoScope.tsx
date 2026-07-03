"use client"

import { createContext, useContext, type ReactNode } from "react"

import { useIntersectionObserver } from "@/hooks/useIntersectionObserver"
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion"
import type { ResolvedBannerMedia } from "@/lib/customization/types"
import { cn } from "@/lib/utils"

type ProfileCardVideoContextValue = {
  media: ResolvedBannerMedia
  isActive: boolean
  prefersReducedMotion: boolean
}

const ProfileCardVideoContext = createContext<ProfileCardVideoContextValue | null>(null)

export function useProfileCardVideo() {
  const value = useContext(ProfileCardVideoContext)
  if (!value) {
    throw new Error("useProfileCardVideo must be used inside ProfileCardVideoScope")
  }
  return value
}

type ProfileCardVideoScopeProps = {
  media: ResolvedBannerMedia
  children: ReactNode
  className?: string
}

/** Один observer на карточку — оба media-слоя (баннер + основа) play/pause синхронно. */
export function ProfileCardVideoScope({ media, children, className }: ProfileCardVideoScopeProps) {
  const { ref, isIntersecting } = useIntersectionObserver({
    rootMargin: "48px",
    threshold: 0.05,
  })
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <ProfileCardVideoContext.Provider
      value={{
        media,
        isActive: isIntersecting,
        prefersReducedMotion,
      }}>
      <div ref={ref} className={cn("profile-card-video-scope flex flex-col", className)}>
        {children}
      </div>
    </ProfileCardVideoContext.Provider>
  )
}
