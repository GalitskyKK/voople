import { assertOwnedUploadKey, deleteObject } from "@/lib/object-storage";
import { getAdminClient } from "@/lib/supabase/admin";

type DeletePostResult = {
  media_key: string | null;
  original_post_id: string | null;
};

export async function deletePostRest(userId: string, postId: string) {
  const admin = getAdminClient();
  const { data, error } = await admin.rpc("delete_own_post", {
    p_post_id: postId,
    p_actor_id: userId,
  });

  if (error) throw new Error(error.message);

  const result = (Array.isArray(data) ? data[0] : data) as DeletePostResult | null;
  if (!result) throw new Error("Пост не найден");

  const mediaKey = result.media_key;
  if (mediaKey && !mediaKey.startsWith("http://") && !mediaKey.startsWith("https://")) {
    try {
      assertOwnedUploadKey(mediaKey, userId, "post");
      await deleteObject({ key: mediaKey, bucket: "public" });
    } catch (error) {
      // The post is already removed transactionally. Storage cleanup must not
      // make the client believe the deletion failed after the database commit.
      console.error("Failed to delete post media object", { postId, error });
    }
  }

  return { postId };
}
