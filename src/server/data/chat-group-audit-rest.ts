import { getAdminClient } from "@/lib/supabase/admin";
import { assertChatMemberRest } from "@/server/data/chat-access-rest";
import type {
  ChatGroupAuditAction,
  ChatGroupAuditActor,
  ChatGroupAuditEntryView,
} from "@/types/chat";

type AuditDetails = ChatGroupAuditEntryView["details"];

export async function recordGroupAuditRest(input: {
  chatId: string;
  actorId: string;
  action: ChatGroupAuditAction;
  targetUserId?: string | null;
  details?: AuditDetails;
}) {
  const { error } = await getAdminClient().from("chat_audit_log").insert({
    chat_id: input.chatId,
    actor_id: input.actorId,
    target_user_id: input.targetUserId ?? null,
    action: input.action,
    details: input.details ?? {},
  });
  if (error) throw new Error(error.message);
}

export async function recordGroupAuditBatchRest(
  entries: Array<{
    chatId: string;
    actorId: string;
    action: ChatGroupAuditAction;
    targetUserId?: string | null;
    details?: AuditDetails;
  }>,
) {
  if (entries.length === 0) return;
  const { error } = await getAdminClient().from("chat_audit_log").insert(
    entries.map((entry) => ({
      chat_id: entry.chatId,
      actor_id: entry.actorId,
      target_user_id: entry.targetUserId ?? null,
      action: entry.action,
      details: entry.details ?? {},
    })),
  );
  if (error) throw new Error(error.message);
}

function isAuditAction(value: unknown): value is ChatGroupAuditAction {
  return [
    "member_added",
    "member_removed",
    "member_left",
    "role_changed",
    "ownership_transferred",
    "topics_changed",
    "visibility_changed",
  ].includes(String(value));
}

function toAuditActor(row: Record<string, unknown>): ChatGroupAuditActor {
  return {
    id: String(row.id),
    username: String(row.username),
    displayName: String(row.display_name),
  };
}

function toAuditDetails(value: unknown): AuditDetails {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string | number | boolean | null] => {
      const detail = entry[1];
      return detail === null || ["string", "number", "boolean"].includes(typeof detail);
    }),
  );
}

export async function listGroupAuditRest(
  chatId: string,
  userId: string,
  limit = 50,
): Promise<ChatGroupAuditEntryView[]> {
  const membership = await assertChatMemberRest(chatId, userId);
  if (membership.type !== "group" || membership.parentChatId) {
    throw new Error("Журнал доступен только в основной группе");
  }
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("Журнал действий доступен владельцу и администраторам");
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("chat_audit_log")
    .select("id, actor_id, target_user_id, action, details, created_at")
    .eq("chat_id", membership.accessChatId)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100));
  if (error) throw new Error(error.message);

  const userIds = [
    ...new Set(
      (data ?? []).flatMap((row) =>
        [row.actor_id, row.target_user_id].filter((value): value is string => typeof value === "string"),
      ),
    ),
  ];
  const { data: users, error: usersError } = userIds.length
    ? await admin.from("users").select("id, username, display_name").in("id", userIds)
    : { data: [], error: null };
  if (usersError) throw new Error(usersError.message);
  const usersById = new Map(
    (users ?? []).map((row) => [String(row.id), toAuditActor(row as Record<string, unknown>)]),
  );

  return (data ?? []).flatMap((row) => {
    if (!isAuditAction(row.action)) return [];
    const actorId = typeof row.actor_id === "string" ? row.actor_id : null;
    const targetId = typeof row.target_user_id === "string" ? row.target_user_id : null;
    return [{
      id: String(row.id),
      action: row.action,
      createdAt: String(row.created_at),
      actor: actorId ? usersById.get(actorId) ?? null : null,
      target: targetId ? usersById.get(targetId) ?? null : null,
      details: toAuditDetails(row.details),
    } satisfies ChatGroupAuditEntryView];
  });
}
