import { assertOwnedUploadKey, deleteObject } from "@/lib/object-storage";
import { getAdminClient } from "@/lib/supabase/admin";

type SubjectType = "post" | "message" | "profile" | "group";
type ReportRow = {
  id: string;
  subject_type: SubjectType;
  subject_id: string;
  reporter_user_id: string;
  reason_code: string;
  details: string | null;
  priority: number;
  created_at: string;
  users: { username: string; display_name: string } | null;
};

type ModerationResult = {
  subject_type: SubjectType;
  subject_id: string;
  media_key: string | null;
  owner_id: string | null;
};

async function loadSubject(type: SubjectType, id: string) {
  const admin = getAdminClient();
  if (type === "post") {
    const { data, error } = await admin.from("posts").select("text, media_url, author_id").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? { title: "Публикация", excerpt: data.text as string | null, hasMedia: Boolean(data.media_url), href: `/post/${id}`, removable: true } : null;
  }
  if (type === "message") {
    const { data, error } = await admin.from("messages").select("text, media_url, chat_id").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? { title: "Сообщение", excerpt: data.text as string | null, hasMedia: Boolean(data.media_url), href: `/messages/${data.chat_id}`, removable: true } : null;
  }
  if (type === "profile") {
    const { data, error } = await admin.from("users").select("username, display_name, bio").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? { title: `${data.display_name} · @${data.username}`, excerpt: data.bio as string | null, hasMedia: false, href: `/${data.username}`, removable: false } : null;
  }
  const { data, error } = await admin.from("chats").select("name").eq("id", id).eq("type", "group").maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { title: data.name || "Группа", excerpt: null, hasMedia: false, href: `/messages/${id}`, removable: false } : null;
}

export async function listPendingModerationReportsRest(limit = 50) {
  const { data, error } = await getAdminClient()
    .from("moderation_reports")
    .select("id, subject_type, subject_id, reporter_user_id, reason_code, details, priority, created_at, users!moderation_reports_reporter_user_id_fkey (username, display_name)")
    .eq("status", "pending")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as ReportRow[];
  return Promise.all(rows.map(async (row) => ({
    id: row.id,
    subjectType: row.subject_type,
    reasonCode: row.reason_code,
    details: row.details,
    priority: row.priority,
    createdAt: row.created_at,
    subject: await loadSubject(row.subject_type, row.subject_id),
    reporter: {
      userId: row.reporter_user_id,
      username: row.users?.username ?? "unknown",
      displayName: row.users?.display_name ?? "Неизвестный пользователь",
    },
  })));
}

export async function moderateReportRest(input: {
  reportId: string;
  adminUserId: string;
  action: "dismiss" | "remove_content";
  note?: string;
}) {
  const admin = getAdminClient();
  const { data, error } = await admin.rpc("moderate_report", {
    p_report_id: input.reportId,
    p_admin_user_id: input.adminUserId,
    p_action: input.action,
    p_note: input.note?.trim() || null,
  });
  if (error) throw new Error(error.message);
  const result = (Array.isArray(data) ? data[0] : data) as ModerationResult | null;
  if (!result) throw new Error("Жалоба не найдена");

  if (input.action === "remove_content" && result.media_key && result.owner_id) {
    const purpose = result.subject_type === "message" ? "chat" : "post";
    const bucket = purpose === "chat" ? "private" : "public";
    assertOwnedUploadKey(result.media_key, result.owner_id, purpose);
    await deleteObject({ key: result.media_key, bucket });
  }
  return { ok: true as const };
}
