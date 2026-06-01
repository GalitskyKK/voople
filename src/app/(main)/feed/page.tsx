import { Suspense } from "react"

import { Feed } from "@/components/feed/Feed"
import type { FeedTabId } from "@/lib/constants/copy"
import { createClient } from "@/lib/supabase/server"
import { getFeedPage } from "@/server/services/feed.service"

type FeedPageProps = {
  searchParams?: Promise<{ tab?: string }>
}

function resolveFeedTab(tab: string | undefined): FeedTabId {
  return tab === "following" ? "following" : "overview"
}

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const params = await searchParams
  const tab = resolveFeedTab(params?.tab)
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  const viewerId = user?.id ?? null
  const initialPage = await getFeedPage({
    followingOnly: tab === "following",
    viewerId,
    limit: 20
  })

  return (
    <div className="voople-feed-page flex h-full min-h-0 flex-col py-4">
      <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-white/5" />}>
        <Feed
          canPost={Boolean(user)}
          viewerId={viewerId}
          initialPage={initialPage}
          initialTab={tab}
        />
      </Suspense>
    </div>
  )
}
