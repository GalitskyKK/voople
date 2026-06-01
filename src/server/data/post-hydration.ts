import { getAdminClient } from "@/lib/supabase/admin"
import { toProfileCustomizationView } from "@/server/mappers/customization"
import { mapPostRow, mapUserToAuthor, type PostRow, type UserRow } from "@/server/mappers/profile"
import { loadLikedPostIdsRest } from "@/server/data/likes-rest"
import type { PostViewModel } from "@/types/domain"

const POST_SELECT =
  "id, author_id, text, state_snapshot, media_url, media_type, is_repost, original_post_id, repost_comment, like_count, reply_count, repost_count, view_count, created_at"

export function getPostSelect() {
  return POST_SELECT
}

async function loadAuthors(authorIds: string[]) {
  if (authorIds.length === 0) return new Map<string, ReturnType<typeof mapUserToAuthor>>()

  const { data, error } = await getAdminClient()
    .from("users")
    .select("id, username, display_name, profile_customization (*)")
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
    customization: toProfileCustomizationView(null)
  }
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

  const likedSet = options?.viewerId
    ? await loadLikedPostIdsRest(
        options.viewerId,
        allRows.map((post) => post.id)
      )
    : new Set<string>()
  const tagsByPostId = await loadTags(allRows.map((post) => post.id))

  function mapNestedPost(post: PostRow, depth = 0): PostViewModel {
    const author = authorById.get(post.author_id) ?? fallbackAuthor()
    const mapped = {
      ...mapPostRow({ ...post, tags: tagsByPostId.get(post.id) ?? [] }, author, {
        likedByViewer: likedSet.has(post.id)
      }),
      repostedByViewer: false
    }
    const target = post.original_post_id ? rowById.get(post.original_post_id) : null

    if (!post.is_repost || !target || depth >= 4) return mapped

    return {
      ...mapped,
      repost: {
        target: mapNestedPost(target, depth + 1)
      }
    }
  }

  return rows.map((post) => mapNestedPost(post))
}
