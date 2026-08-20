import { Suspense } from "react"

import { Feed } from "@/components/feed/Feed"
import type { FeedTabId } from "@/lib/constants/copy"
import { createClient } from "@/lib/supabase/server"
import { getFeedPage } from "@/server/services/feed.service"
import { getHomeOverview } from "@/server/services/home.service"
import { HomeNowPanel, HomeSecondaryRail } from "@/components/home/HomeOverviewPanels"
import type { HomeOverviewView } from "@/types/home"

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
  const [initialPage, overview] = await Promise.all([
    getFeedPage({
      followingOnly: tab === "following",
      viewerId,
      limit: 20
    }),
    viewerId
      ? getHomeOverview(viewerId)
      : Promise.resolve({ viewer: null, now: [], continue: [], communities: [] } satisfies HomeOverviewView),
  ])

  return (
    <div className="voople-feed-page grid gap-5 py-4 xl:grid-cols-[minmax(0,2fr)_minmax(17rem,0.85fr)]">
      <div className="min-w-0">
        {viewerId ? <HomeNowPanel overview={overview} /> : null}
        <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]" />}>
          <Feed
            canPost={Boolean(user)}
            viewerId={viewerId}
            initialPage={initialPage}
            initialTab={tab}
          />
        </Suspense>
      </div>
      {viewerId ? <HomeSecondaryRail overview={overview} /> : null}
    </div>
  )
}
