import { getAdminClient } from "@/lib/supabase/admin"
import { toProfileCustomizationView } from "@/server/mappers/customization"
import { mapPostRow, mapUserToAuthor, type PostRow, type UserRow } from "@/server/mappers/profile"
import { loadLikedPostIdsRest } from "@/server/data/likes-rest"
import type { PostViewModel } from "@/types/domain"
import { listUserBadgesByUserIdsRest } from "@/server/data/badges-rest"

const POST_SELECT =
  "id, author_id, text, state_snapshot, media_url, media_type, is_repost, original_post_id, repost_comment, like_count, reply_count, repost_count, view_count, created_at"

export function getPostSelect() {
  return POST_SELECT
}

async function loadAuthors(authorIds: string[]) {
  if (authorIds.length === 0) return new Map<string, ReturnType<typeof mapUserToAuthor>>()

  const { data, error } = await getAdminClient()
    .from("users")
    .select("id, username, display_name, profile_customization (*), subscriptions (started_at, expires_at)")
    .in("id", [...new Set(authorIds)])

  if (error) throw new Error(error.message)

  return new Map((data ?? []).map((user) => [user.id as string, mapUserToAuthor(user as UserRow)]))
}

async function loadTags(postIds: string[]) {
  if (postIds.length === 0) return new Map<string, string[]>()

  const { data, error } = await getAdminClient()
    .from("post_hashtags")
    .select("post_id, hashtag_name")
    .in("post_id", [...new Set(postIds)])

  if (error) throw new Error(error.message)

  const tagsByPostId = new Map<string, string[]>()
  for (const row of data ?? []) {
    const postId = row.post_id as string
    const hashtagName = row.hashtag_name as string
    const tags = tagsByPostId.get(postId) ?? []
    tags.push(hashtagName)
    tagsByPostId.set(postId, tags)
  }

  return tagsByPostId
}

function fallbackAuthor() {
  return {
    username: "unknown",
    displayName: "Unknown",
    hasVooplePlus: false,
    customization: toProfileCustomizationView(null),
  };
}

function legacyAppearanceSnapshot(value: unknown): value is Record<string, unknown> & { kind: "appearance" } {
  return Boolean(
    value &&
    typeof value === "object" &&
    (value as Record<string, unknown>).kind === "appearance" &&
    !((value as Record<string, unknown>).customization),
  )
}

async function freezeLegacyAppearancePosts(
  rows: PostRow[],
  authorById: Map<string, ReturnType<typeof mapUserToAuthor>>,
) {
  const legacyRows = rows.filter((row) => legacyAppearanceSnapshot(row.state_snapshot))
  if (legacyRows.length === 0) return

  const authorIds = [...new Set(legacyRows.map((row) => row.author_id))]
  const badgesByAuthor = await listUserBadgesByUserIdsRest(authorIds)
  const admin = getAdminClient()

  await Promise.all(legacyRows.map(async (row) => {
    const author = authorById.get(row.author_id)
    if (!author?.customization) return
    const nextSnapshot = {
      ...(row.state_snapshot as Record<string, unknown>),
      customization: author.customization,
      badgeIds: badgesByAuthor.get(row.author_id) ?? [],
    }
    const { error } = await admin.from("posts").update({ state_snapshot: nextSnapshot }).eq("id", row.id)
    if (error) throw new Error(`Не удалось зафиксировать опубликованный образ: ${error.message}`)
    row.state_snapshot = nextSnapshot
  }))
}

export async function mapPostRowsWithReposts(
  rows: PostRow[],
  options?: {
    viewerId?: string | null
    authorById?: Map<string, ReturnType<typeof mapUserToAuthor>>
  }
): Promise<PostViewModel[]> {
  if (rows.length === 0) return []

  const rowById = new Map(rows.map((post) => [post.id, post]))
  let pendingIds = [
    ...new Set(
      rows
        .map((post) => post.original_post_id)
        .filter((postId): postId is string => typeof postId === "string" && !rowById.has(postId))
    )
  ]

  for (let depth = 0; depth < 4 && pendingIds.length > 0; depth++) {
    const { data, error } = await getAdminClient()
      .from("posts")
      .select(POST_SELECT)
      .in("id", pendingIds)
    if (error) throw new Error(error.message)

    const loadedRows = (data ?? []) as unknown as PostRow[]
    for (const post of loadedRows) {
      rowById.set(post.id, post)
    }

    pendingIds = [
      ...new Set(
        loadedRows
          .map((post) => post.original_post_id)
          .filter((postId): postId is string => typeof postId === "string" && !rowById.has(postId))
      )
    ]
  }

  const allRows = [...rowById.values()]
  const authorById = options?.authorById ?? new Map<string, ReturnType<typeof mapUserToAuthor>>()
  const missingAuthorIds = allRows
    .map((post) => post.author_id)
    .filter((authorId) => !authorById.has(authorId))

  if (missingAuthorIds.length > 0) {
    const loadedAuthors = await loadAuthors(missingAuthorIds)
    for (const [authorId, author] of loadedAuthors) {
      authorById.set(authorId, author)
    }
  }


  // Compatibility migration for posts published before appearance snapshots
  // included cosmetics. The first read freezes their current appearance once;
  // subsequent profile edits no longer rewrite historical posts.
  const postIds = allRows.map((post) => post.id)
  const [likedSet, tagsByPostId] = await Promise.all([
    options?.viewerId
      ? loadLikedPostIdsRest(options.viewerId, postIds)
      : Promise.resolve(new Set<string>()),
    loadTags(postIds),
    freezeLegacyAppearancePosts(allRows, authorById),
  ])

  function mapNestedPost(post: PostRow, depth = 0): PostViewModel {
    const author = authorById.get(post.author_id) ?? fallbackAuthor()
    const mapped = {
      ...mapPostRow({ ...post, tags: tagsByPostId.get(post.id) ?? [] }, author, {
        likedByViewer: likedSet.has(post.id)
      }),
      repostedByViewer: false
    }
    const target = post.original_post_id ? rowById.get(post.original_post_id) : null

    if (!post.is_repost) return mapped
    if (!target) {
      return { ...mapped, repostUnavailable: true }
    }
    if (depth >= 4) return mapped

    return {
      ...mapped,
      repost: {
        target: mapNestedPost(target, depth + 1)
      }
    }
  }

  return rows.map((post) => mapNestedPost(post))
}
