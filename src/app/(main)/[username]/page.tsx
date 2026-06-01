import { notFound } from "next/navigation"

import { ProfilePage } from "@/components/profile/ProfilePage"
import { createClient } from "@/lib/supabase/server"
import { getProfilePageData } from "@/server/services/profile.service"

export const revalidate = 60

type PageProps = {
  params: Promise<{ username: string }>
}

export default async function UserProfilePage({ params }: PageProps) {
  const { username } = await params
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  const viewerId = user?.id ?? null

  const pageData = await getProfilePageData(username, viewerId)

  if (!pageData) notFound()

  const { profile, posts, canvasStrokes } = pageData

  const canFollow = Boolean(viewerId && viewerId !== profile.id)

  return (
    <ProfilePage
      profile={profile}
      posts={posts}
      initialCanvasStrokes={canvasStrokes}
      viewerId={viewerId}
      canPost={Boolean(viewerId && viewerId === profile.id)}
      canFollow={canFollow}
    />
  )
}
