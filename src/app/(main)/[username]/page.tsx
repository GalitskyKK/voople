import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ProfilePage } from "@/components/profile/ProfilePage"
import { ProfileJsonLd } from "@/components/seo/ProfileJsonLd"
import { WebSessionBootstrapRecovery } from "@/components/auth/WebSessionBootstrapRecovery"
import { createProfileMetadata } from "@/lib/seo/metadata"
import { getServerAuthBootstrap } from "@/server/services/auth-session.service"
import { getBetaProfileByUsername, getProfilePageData } from "@/server/services/profile.service"

export const revalidate = 60

type PageProps = {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params
  const profile = await getBetaProfileByUsername(username)
  if (!profile) return {}
  return createProfileMetadata({
    displayName: profile.displayName,
    username: profile.username,
    bio: profile.bio,
    ask: false
  })
}

export default async function UserProfilePage({ params }: PageProps) {
  const { username } = await params
  const bootstrap = await getServerAuthBootstrap()
  if (bootstrap.status === "error") {
    return <WebSessionBootstrapRecovery reason={bootstrap.reason} />
  }
  const user = bootstrap.value
  const viewerId = user?.id ?? null

  const pageData = await getProfilePageData(username, viewerId)

  if (!pageData) notFound()

  const { profile, canvasStrokes } = pageData

  const canFollow = viewerId !== profile.id

  return (
    <>
      <ProfileJsonLd displayName={profile.displayName} username={profile.username} bio={profile.bio} />
      <ProfilePage
        profile={profile}
        initialCanvasStrokes={canvasStrokes}
        viewerId={viewerId}
        canFollow={canFollow}
      />
    </>
  )
}
