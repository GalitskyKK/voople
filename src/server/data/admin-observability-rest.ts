import { assertOwnedUploadKey, deleteObject } from "@/lib/object-storage";
import { getAdminClient } from "@/lib/supabase/admin";

type ModerationRow = {
  id: string;
  post_id: string;
  reporter_user_id: string;
  reason: string | null;
  status: string;
  created_at: string;
  posts: {
    text: string | null;
    media_url: string | null;
    author_id: string;
    users: { username: string; display_name: string } | null;
  } | null;
  users: { username: string; display_name: string } | null;
};

type ModerateResult = {
  media_key: string | null;
  author_id: string;
  post_id: string;
};

async function exactCount(table: string, since?: string) {
  const admin = getAdminClient();
  let query = admin.from(table).select("*", { count: "exact", head: true });
  if (since) query = query.gte("created_at", since);
  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getAdminOverviewRest() {
  const now = Date.now();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1_000).toISOString();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1_000).toISOString();
  const admin = getAdminClient();

  const [
    usersTotal,
    usersDay,
    usersWeek,
    postsTotal,
    postsDay,
    postsWeek,
    pendingReports,
    subscriptionsResult,
  ] = await Promise.all([
    exactCount("users"),
    exactCount("users", dayAgo),
    exactCount("users", weekAgo),
    exactCount("posts"),
    exactCount("posts", dayAgo),
    exactCount("posts", weekAgo),
    admin.from("moderation_reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
    admin
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .gt("expires_at", new Date(now).toISOString()),
  ]);

  if (pendingReports.error) throw new Error(pendingReports.error.message);
  if (subscriptionsResult.error) throw new Error(subscriptionsResult.error.message);

  return {
    metrics: {
      usersTotal,
      usersDay,
      usersWeek,
      postsTotal,
      postsDay,
      postsWeek,
      pendingReports: pendingReports.count ?? 0,
      activeSubscriptions: subscriptionsResult.count ?? 0,
    },
    services: {
      database: "operational" as const,
      objectStorage: process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
        ? "configured" as const
        : "missing" as const,
      payments: process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY
        ? "configured" as const
        : "missing" as const,
      captcha: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
        ? "configured" as const
        : "missing" as const,
    },
    checkedAt: new Date(now).toISOString(),
  };
}

export async function listPendingPostReportsRest(limit = 50) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("post_reports")
    .select(
      "id, post_id, reporter_user_id, reason, status, created_at, posts (text, media_url, author_id, users!posts_author_id_users_id_fk (username, display_name)), users!post_reports_reporter_user_id_fkey (username, display_name)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as ModerationRow[]).map((row) => ({
    id: row.id,
    postId: row.post_id,
    reason: row.reason,
    createdAt: row.created_at,
    post: row.posts
      ? {
          text: row.posts.text,
          hasMedia: Boolean(row.posts.media_url),
          authorId: row.posts.author_id,
          authorUsername: row.posts.users?.username ?? "unknown",
          authorDisplayName: row.posts.users?.display_name ?? "Неизвестный пользователь",
        }
      : null,
    reporter: {
      userId: row.reporter_user_id,
      username: row.users?.username ?? "unknown",
      displayName: row.users?.display_name ?? "Неизвестный пользователь",
    },
  }));
}

export async function moderatePostReportRest(input: {
  reportId: string;
  adminUserId: string;
  action: "dismiss" | "remove_post";
  note?: string;
}) {
  const admin = getAdminClient();
  const { data, error } = await admin.rpc("moderate_post_report", {
    p_report_id: input.reportId,
    p_admin_user_id: input.adminUserId,
    p_action: input.action,
    p_note: input.note?.trim() || null,
  });

  if (error) throw new Error(error.message);

  const result = (Array.isArray(data) ? data[0] : data) as ModerateResult | null;
  if (!result) throw new Error("Жалоба не найдена");

  const mediaKey = result.media_key;
  if (
    input.action === "remove_post"
    && mediaKey
    && !mediaKey.startsWith("http://")
    && !mediaKey.startsWith("https://")
  ) {
    try {
      assertOwnedUploadKey(mediaKey, result.author_id, "post");
      await deleteObject({ key: mediaKey, bucket: "public" });
    } catch (storageError) {
      console.error("Failed to clean moderated post media", {
        postId: result.post_id,
        storageError,
      });
    }
  }

  return { ok: true as const, postId: result.post_id };
}
