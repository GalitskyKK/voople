import { getAdminClient } from "@/lib/supabase/admin";

type CountRpcResult =
  | number
  | { record_post_view?: number; record_profile_view?: number }
  | null;

function readCount(result: CountRpcResult, key: "record_post_view" | "record_profile_view") {
  if (typeof result === "number") return result;
  return result?.[key] ?? 0;
}

export async function recordPostViewRest(postId: string, viewerId: string) {
  const { data, error } = await getAdminClient().rpc("record_post_view", {
    p_post_id: postId,
    p_viewer_user_id: viewerId,
  });

  if (error) throw new Error(error.message);
  return { viewCount: readCount(data as CountRpcResult, "record_post_view") };
}

export async function recordProfileViewRest(profileUserId: string, viewerId: string) {
  const { data, error } = await getAdminClient().rpc("record_profile_view", {
    p_profile_user_id: profileUserId,
    p_viewer_user_id: viewerId,
  });

  if (error) throw new Error(error.message);
  return { viewCount: readCount(data as CountRpcResult, "record_profile_view") };
}
