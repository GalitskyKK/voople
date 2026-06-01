import { Hash } from "lucide-react"

import { HashtagFeed } from "@/components/feed/HashtagFeed"
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
      <header className="rounded-2xl border border-white/10 bg-[#1c1c1e] px-4 py-4 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
            <Hash className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold">#{tag}</h1>
            <p className="text-sm text-white/50">Посты с этим хэштегом</p>
          </div>
        </div>
      </header>
      <HashtagFeed tag={tag} viewerId={viewerId} initialPage={initialPage} />
    </div>
  )
}
