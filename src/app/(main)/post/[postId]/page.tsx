import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { PostDetailView } from "@/components/feed/PostDetailView"
import { WebSessionBootstrapRecovery } from "@/components/auth/WebSessionBootstrapRecovery"
import { ogImageUrl } from "@/lib/seo/metadata"
import { getServerAuthBootstrap } from "@/server/services/auth-session.service"
import { getPostById } from "@/server/services/post.service"

type PostDetailPageProps = {
  params: Promise<{ postId: string }>
}

function postDescription(post: NonNullable<Awaited<ReturnType<typeof getPostById>>>) {
  const source =
    post.repostComment ??
    post.text ??
    post.status?.thought ??
    (post.kind === "appearance"
      ? `${post.author.displayName} поделился новым образом в Voople.`
      : `Публикация ${post.author.displayName} в Voople.`)
  const normalized = source.replace(/\s+/g, " ").trim()
  return normalized.length > 155 ? `${normalized.slice(0, 154).trimEnd()}…` : normalized
}

export async function generateMetadata({ params }: PostDetailPageProps): Promise<Metadata> {
  const { postId } = await params
  const post = await getPostById(postId)
  if (!post) return { title: "Публикация не найдена", robots: { index: false, follow: false } }

  const title = `${post.author.displayName} (@${post.author.username})`
  const description = postDescription(post)
  const canonical = `/post/${post.id}`
  const image = ogImageUrl({
    title: post.author.displayName,
    subtitle: description,
    badge: "Публикация в Voople",
  })

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
      publishedTime: post.createdAt,
      authors: [`/${post.author.username}`],
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  }
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const { postId } = await params
  const bootstrap = await getServerAuthBootstrap()
  if (bootstrap.status === "error") {
    return <WebSessionBootstrapRecovery reason={bootstrap.reason} />
  }
  const user = bootstrap.value
  const viewerId = user?.id ?? null
  const post = await getPostById(postId, viewerId)

  if (!post) notFound()

  return <PostDetailView post={post} viewerId={viewerId} />
}
