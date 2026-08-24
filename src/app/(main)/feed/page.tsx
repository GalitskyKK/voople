import { Suspense } from "react"

import { Feed } from "@/components/feed/Feed"
import type { FeedTabId } from "@/lib/constants/copy"
import { createClient } from "@/lib/supabase/server"
import { getFeedPage } from "@/server/services/feed.service"
import { getHomeOverview } from "@/server/services/home.service"
import { HomeNowPanel, HomeSecondaryRail } from "@/components/home/HomeOverviewPanels"
import { HomeFeedLayoutView } from "@/components/home/HomeFeedLayoutView"
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
      : Promise.resolve({ viewer: null, now: [], continue: [], continueCandidates: [], communities: [] } satisfies HomeOverviewView),
  ])

  return (
    <HomeFeedLayoutView
      className="py-4"
      primary={<>
        {viewerId ? <HomeNowPanel overview={overview} /> : null}
        <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]" />}>
          <Feed
            canPost={Boolean(user)}
            viewerId={viewerId}
            initialPage={initialPage}
            initialTab={tab}
          />
        </Suspense>
      </>}
      secondary={viewerId ? <HomeSecondaryRail overview={overview} /> : null}
    />
  )
}
