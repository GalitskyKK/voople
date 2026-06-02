import { toProfileCustomizationView, type CustomizationRow } from "@/server/mappers/customization";
import { publicAssetUrl } from "@/lib/object-storage";
import type {
  PostAuthorView,
  PostViewModel,
  ProfileStatus,
  ProfileViewModel,
  StatusPostPayload,
} from "@/types/domain";

export type UserRow = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  pinned_thought: string | null;
  created_at: string;
  profile_customization?: CustomizationRow | CustomizationRow[] | null;
  user_status?: StatusRow | StatusRow[] | null;
  subscriptions?: { started_at: string; expires_at: string } | { started_at: string; expires_at: string }[] | null;
};

export function mapSubscriptionFields(
  subscription: { started_at: string; expires_at: string } | null | undefined,
): { subscriptionStartedAt: string | null; hasVooplePlus: boolean } {
  if (!subscription) {
    return { subscriptionStartedAt: null, hasVooplePlus: false };
  }
  const expiresAt = new Date(subscription.expires_at);
  const active = expiresAt > new Date();
  return {
    subscriptionStartedAt: active ? subscription.started_at : null,
    hasVooplePlus: active,
  };
}

type StatusRow = {
  mood_value?: number | null;
  thought?: string | null;
  track_title?: string | null;
  track_artist?: string | null;
};

export type PostRow = {
  id: string;
  author_id: string;
  text: string | null;
  state_snapshot: unknown;
  media_url?: string | null;
  media_type?: "image" | "gif" | "meme" | null;
  is_repost?: boolean | null;
  original_post_id?: string | null;
  repost_comment?: string | null;
  like_count: number;
  reply_count: number;
  repost_count?: number | null;
  view_count?: number | null;
  created_at: string;
  tags?: string[];
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapStatus(row: StatusRow | null): ProfileStatus {
  if (!row) return {};
  return {
    moodValue: row.mood_value,
    thought: row.thought,
    trackTitle: row.track_title,
    trackArtist: row.track_artist,
  };
}

export function mapUserToAuthor(
  user: Pick<UserRow, "username" | "display_name" | "profile_customization" | "subscriptions">,
): PostAuthorView {
  const customizationRow = first(user.profile_customization);
  const { hasVooplePlus } = mapSubscriptionFields(first(user.subscriptions));
  return {
    username: user.username,
    displayName: user.display_name,
    hasVooplePlus,
    customization: toProfileCustomizationView(customizationRow),
  };
}

export function mapUserToProfile(
  user: UserRow,
  stats: ProfileViewModel["stats"],
): ProfileViewModel {
  const customizationRow = first(user.profile_customization);
  const statusRow = first(user.user_status);
  const subscription = first(user.subscriptions);
  const { subscriptionStartedAt, hasVooplePlus } = mapSubscriptionFields(subscription);

  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    bio: user.bio,
    createdAt: user.created_at,
    subscriptionStartedAt,
    hasVooplePlus,
    customization: toProfileCustomizationView(customizationRow),
    status: mapStatus(statusRow),
    stats,
  };
}

function snapshotToStatus(snapshot: unknown): StatusPostPayload | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const s = snapshot as Record<string, unknown>;
  return {
    moodValue: (s.moodValue ?? s.mood_value) as number | null | undefined,
    thought: (s.thought as string | null) ?? null,
    trackTitle: (s.trackTitle ?? s.track_title) as string | null | undefined,
    trackArtist: (s.trackArtist ?? s.track_artist) as string | null | undefined,
  };
}

export function mapPostRow(
  post: PostRow,
  author: PostAuthorView,
  options?: { likedByViewer?: boolean },
): PostViewModel {
  const status = snapshotToStatus(post.state_snapshot);
  const hasStatus = status && (status.thought || status.moodValue != null);

  return {
    id: post.id,
    author,
    kind: hasStatus ? "status" : "text",
    text: post.text ?? undefined,
    status: hasStatus ? status : undefined,
    repostComment: post.repost_comment ?? undefined,
    repost: undefined,
    mediaUrl: publicAssetUrl(post.media_url ?? null),
    mediaType: post.media_type ?? null,
    likeCount: post.like_count,
    replyCount: post.reply_count,
    viewCount: post.view_count ?? 0,
    repostCount: post.repost_count ?? 0,
    createdAt: post.created_at,
    likedByViewer: options?.likedByViewer ?? false,
    tags: post.tags,
  };
}
