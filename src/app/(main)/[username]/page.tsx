import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ProfilePage } from "@/components/profile/ProfilePage"
import { ProfileJsonLd } from "@/components/seo/ProfileJsonLd"
import { createProfileMetadata } from "@/lib/seo/metadata"
import { createClient } from "@/lib/supabase/server"
import { getProfileByUsername, getProfilePageData } from "@/server/services/profile.service"

export const revalidate = 60

type PageProps = {
  params: Promise<{ username: string }>
  searchParams: Promise<{ ask?: string }>
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { username } = await params
  const { ask } = await searchParams
  const profile = await getProfileByUsername(username)
  if (!profile) return {}
  return createProfileMetadata({
    displayName: profile.displayName,
    username: profile.username,
    bio: profile.bio,
    ask: ask === "1"
  })
}

export default async function UserProfilePage({ params, searchParams }: PageProps) {
  const { username } = await params
  const { ask } = await searchParams
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  const viewerId = user?.id ?? null

  const pageData = await getProfilePageData(username, viewerId)

  if (!pageData) notFound()

  const { profile, posts, canvasStrokes } = pageData

  const canFollow = viewerId !== profile.id

  return (
    <>
      <ProfileJsonLd displayName={profile.displayName} username={profile.username} bio={profile.bio} />
      <ProfilePage
        profile={profile}
        posts={posts}
        initialCanvasStrokes={canvasStrokes}
        viewerId={viewerId}
        canPost={Boolean(viewerId && viewerId === profile.id)}
        canFollow={canFollow}
        askDeepLink={ask === "1"}
      />
    </>
  )
}
