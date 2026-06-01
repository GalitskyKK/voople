"use client"

import { useEffect } from "react"

import { createClient } from "@/lib/supabase/client"
import { trpc } from "@/lib/trpc/client"
import type { FeedTabId } from "@/lib/constants/copy"

type RealtimePostRow = {
  id: string
  author_id: string
  created_at: string
  view_count?: number | null
  like_count?: number | null
  reply_count?: number | null
  repost_count?: number | null
}

function patchPostCounters<
  T extends { pages: Array<{ items: Array<{ id: string }> }> } | undefined
>(old: T, row: RealtimePostRow): T {
  return old
    ? ({
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          items: page.items.map((post) =>
            post.id === row.id
              ? {
                  ...post,
                  viewCount: row.view_count ?? (post as { viewCount?: number }).viewCount ?? 0,
                  likeCount: row.like_count ?? (post as { likeCount?: number }).likeCount ?? 0,
                  replyCount: row.reply_count ?? (post as { replyCount?: number }).replyCount ?? 0,
                  repostCount:
                    row.repost_count ?? (post as { repostCount?: number }).repostCount ?? 0
                }
              : post
          )
        }))
      } as T)
    : old
}

export function useRealtimeFeed(tab: FeedTabId, viewerId: string | null | undefined) {
  const utils = trpc.useUtils()

  useEffect(() => {
    const supabase = createClient()
    const channelId = crypto.randomUUID()
    const channel = supabase
      .channel(`feed:${tab}:${viewerId ?? "public"}:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts"
        },
        (payload) => {
          const row = payload.new as RealtimePostRow
          if (!row.id || !row.author_id || !row.created_at) return

          void utils.feed.getPage.invalidate({ tab, limit: 20 })
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "posts"
        },
        (payload) => {
          const row = payload.new as RealtimePostRow
          if (!row.id) return
          utils.feed.getPage.setInfiniteData({ tab, limit: 20 }, (old) =>
            patchPostCounters(old, row)
          )
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [tab, utils, viewerId])
}
