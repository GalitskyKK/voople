import { getAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/server/services/notifications.service";

export type FollowState = {
  isSelf: boolean;
  following: boolean;
  followsYou: boolean;
  canFollow: boolean;
};

export async function getFollowStateRest(
  viewerId: string | null,
  profileUserId: string,
): Promise<FollowState> {
  if (!viewerId) {
    return { isSelf: false, following: false, followsYou: false, canFollow: false };
  }
  if (viewerId === profileUserId) {
    return { isSelf: true, following: false, followsYou: false, canFollow: false };
  }

  const admin = getAdminClient();

  const [iFollow, theyFollow] = await Promise.all([
    admin
      .from("follows")
      .select("follower_id")
      .eq("follower_id", viewerId)
      .eq("following_id", profileUserId)
      .maybeSingle(),
    admin
      .from("follows")
      .select("follower_id")
      .eq("follower_id", profileUserId)
      .eq("following_id", viewerId)
      .maybeSingle(),
  ]);

  if (iFollow.error) throw new Error(iFollow.error.message);
  if (theyFollow.error) throw new Error(theyFollow.error.message);

  return {
    isSelf: false,
    following: Boolean(iFollow.data),
    followsYou: Boolean(theyFollow.data),
    canFollow: true,
  };
}

export async function toggleFollowRest(followerId: string, followingId: string) {
  if (followerId === followingId) {
    throw new Error("Нельзя подписаться на себя");
  }

  const admin = getAdminClient();

  const { data: existing, error: findErr } = await admin
    .from("follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();

  if (findErr) throw new Error(findErr.message);

  if (existing) {
    const { error } = await admin
      .from("follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", followingId);
    if (error) throw new Error(error.message);
    return { following: false };
  }

  const { error } = await admin.from("follows").insert({
    follower_id: followerId,
    following_id: followingId,
  });
  if (error) throw new Error(error.message);

  void createNotification({
    userId: followingId,
    type: "follow",
    actorId: followerId,
  }).catch(() => {});

  return { following: true };
}
