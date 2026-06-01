import { notFound } from "next/navigation"

import { PostDetailView } from "@/components/feed/PostDetailView"
import { createClient } from "@/lib/supabase/server"
import { getPostById } from "@/server/services/post.service"

type PostDetailPageProps = {
  params: Promise<{ postId: string }>
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const { postId } = await params
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  const viewerId = user?.id ?? null
  const post = await getPostById(postId, viewerId)

  if (!post) notFound()

  return <PostDetailView post={post} viewerId={viewerId} />
}
