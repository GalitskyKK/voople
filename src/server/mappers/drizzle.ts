import type { profileCustomization } from "@/server/db/schema";
import type { CustomizationRow } from "@/server/mappers/customization";
import type { UserRow, PostRow } from "@/server/mappers/profile";
import type { posts, subscriptions, userStatus, users } from "@/server/db/schema";

type UserWithRelations = typeof users.$inferSelect & {
  customization?: typeof profileCustomization.$inferSelect | null;
  status?: typeof userStatus.$inferSelect | null;
  subscription?: typeof subscriptions.$inferSelect | null;
};

export function customizationToRow(
  row: typeof profileCustomization.$inferSelect | null | undefined,
): CustomizationRow | null {
  if (!row) return null;
  return {
    banner_type: row.bannerType,
    banner_value: row.bannerValue,
    avatar_type: row.avatarType,
    avatar_data: row.avatarData,
    avatar_ring_id: row.avatarRingId,
    profile_effect_id: row.profileEffectId,
    nickname_color: row.nicknameColor,
    nickname_gradient: row.nicknameGradient,
    theme_primary: row.themePrimary,
    theme_accent: row.themeAccent,
  };
}

export function userToRow(user: UserWithRelations): UserRow {
  return {
    id: user.id,
    username: user.username,
    display_name: user.displayName,
    bio: user.bio,
    pinned_thought: user.pinnedThought,
    created_at: user.createdAt.toISOString(),
    profile_customization: customizationToRow(user.customization),
    user_status: user.status
      ? {
          mood_value: user.status.moodValue,
          thought: user.status.thought,
          track_title: user.status.trackTitle,
          track_artist: user.status.trackArtist,
        }
      : null,
    subscriptions: user.subscription
      ? {
          started_at: user.subscription.startedAt.toISOString(),
          expires_at: user.subscription.expiresAt.toISOString(),
        }
      : null,
  };
}

export function postToRow(post: typeof posts.$inferSelect): PostRow {
  return {
    id: post.id,
    author_id: post.authorId,
    text: post.text,
    state_snapshot: post.stateSnapshot,
    like_count: post.likeCount,
    reply_count: post.replyCount,
    created_at: post.createdAt.toISOString(),
  };
}
