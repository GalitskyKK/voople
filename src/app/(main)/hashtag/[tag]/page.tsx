import { HashtagFeed } from "@/components/feed/HashtagFeed"
import { HashtagPageHeader } from "@/components/feed/HashtagPageHeader"
import { createClient } from "@/lib/supabase/server"
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
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  const viewerId = user?.id ?? null
  const initialPage = await getHashtagFeedPage({ tag, viewerId, limit: 20 })

  return (
    <div className="voople-hashtag-page flex flex-col gap-4 py-4">
      <HashtagPageHeader tag={tag} />
      <HashtagFeed tag={tag} viewerId={viewerId} initialPage={initialPage} />
    </div>
  )
}
