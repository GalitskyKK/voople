import { getAdminClient } from "@/lib/supabase/admin";
import { assertChatMemberRest } from "@/server/data/chat-access-rest";
import { recordGroupAuditRest } from "@/server/data/chat-group-audit-rest";

export async function setGroupMemberRoleRest(
  chatId: string,
  actorId: string,
  memberId: string,
  role: "admin" | "member",
) {
  const membership = await assertChatMemberRest(chatId, actorId);
  if (membership.type !== "group" || membership.parentChatId) {
    throw new Error("Роли настраиваются в основной группе");
  }
  if (membership.role !== "owner") {
    throw new Error("Назначать администраторов может только владелец группы");
  }
  if (actorId === memberId) throw new Error("Роль владельца нельзя изменить");

  const admin = getAdminClient();
  const { data: target, error: targetError } = await admin
    .from("chat_members")
    .select("role")
    .eq("chat_id", membership.accessChatId)
    .eq("user_id", memberId)
    .maybeSingle();
  if (targetError) throw new Error(targetError.message);
  if (!target) throw new Error("Участник уже покинул группу");
  if (target.role === "owner") throw new Error("Роль владельца нельзя изменить");
  if (target.role === role) return { role };

  const previousRole = target.role === "admin" ? "admin" : "member";
  const { error } = await admin
    .from("chat_members")
    .update({ role })
    .eq("chat_id", membership.accessChatId)
    .eq("user_id", memberId);
  if (error) throw new Error(error.message);

  try {
    await recordGroupAuditRest({
      chatId: membership.accessChatId,
      actorId,
      targetUserId: memberId,
      action: "role_changed",
      details: { fromRole: previousRole, toRole: role },
    });
  } catch (auditError) {
    await admin
      .from("chat_members")
      .update({ role: previousRole })
      .eq("chat_id", membership.accessChatId)
      .eq("user_id", memberId);
    throw auditError;
  }
  return { role };
}

export async function transferGroupOwnershipRest(
  chatId: string,
  actorId: string,
  targetUserId: string,
) {
  const membership = await assertChatMemberRest(chatId, actorId);
  if (membership.type !== "group" || membership.parentChatId) {
    throw new Error("Владение передаётся только в основной группе");
  }
  if (membership.role !== "owner") {
    throw new Error("Передать владение может только текущий владелец");
  }
  if (actorId === targetUserId) throw new Error("Вы уже владелец этой группы");

  const { error } = await getAdminClient().rpc("transfer_group_ownership", {
    p_chat_id: membership.accessChatId,
    p_actor_id: actorId,
    p_target_user_id: targetUserId,
  });
  if (error) throw new Error(error.message);
  return { transferred: true as const, ownerId: targetUserId };
}
