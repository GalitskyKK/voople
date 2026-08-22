import { getAdminClient } from "@/lib/supabase/admin";
import { assertChatMemberRest } from "@/server/data/chat-access-rest";
import { recordGroupAuditRest } from "@/server/data/chat-group-audit-rest";

export async function setGroupNameRest(chatId: string, userId: string, name: string) {
  const membership = await assertChatMemberRest(chatId, userId);
  if (membership.type !== "group" || membership.parentChatId) {
    throw new Error("Название меняется только у основной группы");
  }
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("Переименовать группу могут владелец и администраторы");
  }
  const cleanName = name.trim();
  if (cleanName.length < 2 || cleanName.length > 50) {
    throw new Error("Название — от 2 до 50 символов");
  }
  const admin = getAdminClient();
  const { data: current, error: currentError } = await admin
    .from("chats")
    .select("name")
    .eq("id", membership.accessChatId)
    .single();
  if (currentError) throw new Error(currentError.message);
  if (current.name === cleanName) return { name: cleanName };
  const { error } = await admin.from("chats").update({ name: cleanName }).eq("id", membership.accessChatId);
  if (error) throw new Error(error.message);
  await recordGroupAuditRest({
    chatId: membership.accessChatId,
    actorId: userId,
    action: "group_name_changed",
    details: { previousName: current.name, name: cleanName },
  });
  return { name: cleanName };
}
