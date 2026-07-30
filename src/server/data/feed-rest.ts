import { getAdminClient } from "@/lib/supabase/admin"
import { mapUserToAuthor, type PostRow, type UserRow } from "@/server/mappers/profile"
import { getPostSelect, mapPostRowsWithReposts } from "@/server/data/post-hydration"
import type { PostViewModel } from "@/types/domain"
import type { FeedPageResult } from "@/types/feed"

const DEFAULT_LIMIT = 20

export async function getFeedPageRest(options?: {
  followingOnly?: boolean
  viewerId?: string | null
  cursor?: string
  limit?: number
}): Promise<FeedPageResult> {
  const admin = getAdminClient()
  const limit = options?.limit ?? DEFAULT_LIMIT

  let authorFilter: string[] | null = null

  if (options?.followingOnly && options.viewerId) {
    const { data: follows, error } = await admin
      .from("follows")
      .select("following_id")
      .eq("follower_id", options.viewerId)

    if (error) throw new Error(error.message)
    authorFilter = (follows ?? []).map((f) => f.following_id as string)
    if (authorFilter.length === 0) return { items: [] }
  }

  let cursorCreatedAt: string | null = null
  if (options?.cursor) {
    const { data: cursorPost, error: cursorErr } = await admin
      .from("posts")
      .select("created_at")
      .eq("id", options.cursor)
      .maybeSingle()
    if (cursorErr) throw new Error(cursorErr.message)
    cursorCreatedAt = (cursorPost?.created_at as string) ?? null
  }

  let query = admin
    .from("posts")
    .select(getPostSelect())
    .order("created_at", { ascending: false })
    .limit(limit + 1)

  if (authorFilter) {
    query = query.in("author_id", authorFilter)
  }
  if (cursorCreatedAt) {
    query = query.lt("created_at", cursorCreatedAt)
  }

  const { data: posts, error: postsErr } = await query
  if (postsErr) throw new Error(postsErr.message)

  const rows = (posts ?? []) as unknown as PostRow[]
  const hasMore = rows.length > limit
  const slice = hasMore ? rows.slice(0, limit) : rows
  if (slice.length === 0) return { items: [] }

  const authorIds = [...new Set(slice.map((p) => p.author_id))]
  const { data: users, error: usersErr } = await admin
    .from("users")
    .select("id, username, display_name, profile_customization (*), subscriptions (started_at, expires_at)")
    .in("id", authorIds)

  if (usersErr) throw new Error(usersErr.message)

  const authorById = new Map(
    (users ?? []).map((u) => [u.id as string, mapUserToAuthor(u as UserRow)])
  )

  const items = await mapPostRowsWithReposts(slice, { viewerId: options?.viewerId, authorById })

  return {
    items,
    nextCursor: hasMore ? slice[slice.length - 1]!.id : undefined
  }
}

export async function getHashtagFeedPageRest(options: {
  tag: string
  viewerId?: string | null
  cursor?: string
  limit?: number
}): Promise<FeedPageResult> {
  const admin = getAdminClient()
  const limit = options.limit ?? DEFAULT_LIMIT
  const tag = options.tag.trim().replace(/^#/, "").toLowerCase()
  if (!tag) return { items: [] }

  let cursorCreatedAt: string | null = null
  if (options.cursor) {
    const { data: cursorPost, error: cursorErr } = await admin
      .from("posts")
      .select("created_at")
      .eq("id", options.cursor)
      .maybeSingle()
    if (cursorErr) throw new Error(cursorErr.message)
    cursorCreatedAt = (cursorPost?.created_at as string) ?? null
  }

  let hashtagQuery = admin
    .from("post_hashtags")
    .select("post_id, posts!inner (created_at)")
    .eq("hashtag_name", tag)
    .order("created_at", { referencedTable: "posts", ascending: false })
    .limit(limit + 1)

  if (cursorCreatedAt) {
    hashtagQuery = hashtagQuery.lt("posts.created_at", cursorCreatedAt)
  }

  const { data: hashtagRows, error: hashtagErr } = await hashtagQuery
  if (hashtagErr) throw new Error(hashtagErr.message)

  const postIds = (hashtagRows ?? []).map((row) => row.post_id as string)
  if (postIds.length === 0) return { items: [] }

  const { data: posts, error: postsErr } = await admin
    .from("posts")
    .select(getPostSelect())
    .in("id", postIds)

  if (postsErr) throw new Error(postsErr.message)

  const rowsById = new Map(((posts ?? []) as unknown as PostRow[]).map((post) => [post.id, post]))
  const rows = postIds
    .map((postId) => rowsById.get(postId))
    .filter((post): post is PostRow => Boolean(post))
  const hasMore = rows.length > limit
  const slice = hasMore ? rows.slice(0, limit) : rows

  const authorIds = [...new Set(slice.map((post) => post.author_id))]
  const { data: users, error: usersErr } = await admin
    .from("users")
    .select("id, username, display_name, profile_customization (*), subscriptions (started_at, expires_at)")
    .in("id", authorIds)

  if (usersErr) throw new Error(usersErr.message)

  const authorById = new Map(
    (users ?? []).map((user) => [user.id as string, mapUserToAuthor(user as UserRow)])
  )
  const items = await mapPostRowsWithReposts(slice, { viewerId: options.viewerId, authorById })

  return {
    items,
    nextCursor: hasMore ? slice[slice.length - 1]!.id : undefined
  }
}
