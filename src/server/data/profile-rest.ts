import { getAdminClient } from "@/lib/supabase/admin"
import { clearExpiredSubscriptionCustomizationRest } from "@/server/data/subscription-rest"
import {
  mapUserToAuthor,
  mapUserToProfile,
  type PostRow,
  type UserRow
} from "@/server/mappers/profile"
import { listProfileCanvasStrokesRest } from "@/server/data/profile-canvas-rest"
import { getPostSelect, mapPostRowsWithReposts } from "@/server/data/post-hydration"
import type { PostViewModel, ProfileViewModel } from "@/types/domain"

async function countExact(table: string, column: string, value: string) {
  const admin = getAdminClient()
  const { count, error } = await admin
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column, value)
  if (error) throw new Error(error.message)
  return count ?? 0
}

async function loadStats(userId: string) {
  const [posts, followers, following, views] = await Promise.all([
    countExact("posts", "author_id", userId),
    countExact("follows", "following_id", userId),
    countExact("follows", "follower_id", userId),
    countExact("profile_views", "profile_user_id", userId)
  ])
  return { posts, followers, following, views }
}

async function fetchUserRowByUsername(username: string): Promise<UserRow | null> {
  const admin = getAdminClient()
  const { data, error } = await admin
    .from("users")
    .select(
      `
      id, username, display_name, bio, pinned_thought, created_at,
      profile_customization (*),
      user_status (*),
      subscriptions (started_at, expires_at)
    `
    )
    .eq("username", username)
    .maybeSingle()

  if (error) throw new Error(error.message)
  const row = data as UserRow | null
  const subscription = Array.isArray(row?.subscriptions) ? row.subscriptions[0] : row?.subscriptions
  if (row && (!subscription || new Date(subscription.expires_at) <= new Date())) {
    await clearExpiredSubscriptionCustomizationRest(row.id)
    const { data: refreshed, error: refreshError } = await admin
      .from("users")
      .select(`id, username, display_name, bio, pinned_thought, created_at, profile_customization (*), user_status (*), subscriptions (started_at, expires_at)`)
      .eq("username", username)
      .maybeSingle()
    if (refreshError) throw new Error(refreshError.message)
    return refreshed as UserRow | null
  }
  return row
}

async function fetchPostsByAuthorId(authorId: string, limit = 50) {
  const admin = getAdminClient()
  const { data, error } = await admin
    .from("posts")
    .select(getPostSelect())
    .eq("author_id", authorId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as PostRow[]
}

export async function getProfilePageDataRest(username: string, viewerId?: string | null) {
  const user = await fetchUserRowByUsername(username)
  if (!user) return null

  const userRow = user
  const author = mapUserToAuthor(userRow)

  const [stats, postRows, canvasStrokes] = await Promise.all([
    loadStats(user.id),
    fetchPostsByAuthorId(user.id),
    listProfileCanvasStrokesRest(user.id)
  ])

  return {
    profile: mapUserToProfile(userRow, stats),
    posts: await mapPostRowsWithReposts(postRows, {
      viewerId,
      authorById: new Map([[user.id, author]])
    }),
    canvasStrokes
  }
}

export async function getProfileByUsernameRest(username: string): Promise<ProfileViewModel | null> {
  const user = await fetchUserRowByUsername(username)
  if (!user) return null
  const stats = await loadStats(user.id)
  return mapUserToProfile(user, stats)
}

export async function getPostsByUsernameRest(
  username: string,
  viewerId?: string | null
): Promise<PostViewModel[]> {
  const user = await fetchUserRowByUsername(username)
  if (!user) return []

  const author = mapUserToAuthor(user)
  const postRows = await fetchPostsByAuthorId(user.id)
  return mapPostRowsWithReposts(postRows, {
    viewerId,
    authorById: new Map([[user.id, author]])
  })
}
