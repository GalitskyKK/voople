import { HashtagFeed } from "@/components/feed/HashtagFeed"
import { HashtagPageHeader } from "@/components/feed/HashtagPageHeader"
import { WebSessionBootstrapRecovery } from "@/components/auth/WebSessionBootstrapRecovery"
import { getServerAuthBootstrap } from "@/server/services/auth-session.service"
import { getHashtagFeedPage } from "@/server/services/feed.service"

type HashtagPageProps = {
  params: Promise<{ tag: string }>
}

function normalizeTag(tag: string) {
  return decodeURIComponent(tag).trim().replace(/^#/, "").toLowerCase()
}

export default async function HashtagPage({ params }: HashtagPageProps) {
  const { tag: rawTag } = await params
  const tag = normalizeTag(rawTag)
  const bootstrap = await getServerAuthBootstrap()
  if (bootstrap.status === "error") {
    return <WebSessionBootstrapRecovery reason={bootstrap.reason} />
  }
  const user = bootstrap.value
  const viewerId = user?.id ?? null
  const initialPage = await getHashtagFeedPage({ tag, viewerId, limit: 20 })

  return (
    <div className="voople-hashtag-page flex flex-col gap-4 py-4">
      <HashtagPageHeader tag={tag} />
      <HashtagFeed tag={tag} viewerId={viewerId} initialPage={initialPage} />
    </div>
  )
}
