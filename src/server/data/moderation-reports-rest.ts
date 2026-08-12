import type { ReportReasonCode, ReportSubjectType } from "@/lib/moderation/report";
import { getAdminClient } from "@/lib/supabase/admin";
import { assertChatMemberRest } from "@/server/data/chat-access-rest";

type Subject = {
  ownerId: string | null;
};

async function resolveReportSubject(input: {
  reporterUserId: string;
  subjectType: ReportSubjectType;
  subjectId: string;
}): Promise<Subject> {
  const admin = getAdminClient();
  if (input.subjectType === "post") {
    const { data, error } = await admin.from("posts").select("author_id").eq("id", input.subjectId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Публикация не найдена");
    return { ownerId: data.author_id as string };
  }
  if (input.subjectType === "message") {
    const { data, error } = await admin.from("messages").select("sender_id, chat_id").eq("id", input.subjectId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Сообщение не найдено");
    await assertChatMemberRest(data.chat_id as string, input.reporterUserId);
    return { ownerId: data.sender_id as string };
  }
  if (input.subjectType === "profile") {
    const { data, error } = await admin.from("users").select("id").eq("id", input.subjectId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Профиль не найден");
    return { ownerId: data.id as string };
  }
  const { data, error } = await admin.from("chats").select("id, type").eq("id", input.subjectId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.type !== "group") throw new Error("Группа не найдена");
  await assertChatMemberRest(data.id as string, input.reporterUserId);
  return { ownerId: null };
}

export async function createModerationReportRest(input: {
  reporterUserId: string;
  subjectType: ReportSubjectType;
  subjectId: string;
  reasonCode: ReportReasonCode;
  details?: string;
}) {
  const subject = await resolveReportSubject(input);
  if (subject.ownerId === input.reporterUserId) {
    throw new Error("Нельзя пожаловаться на собственный контент");
  }
  const { error } = await getAdminClient().from("moderation_reports").insert({
    reporter_user_id: input.reporterUserId,
    subject_type: input.subjectType,
    subject_id: input.subjectId,
    subject_owner_id: subject.ownerId,
    reason_code: input.reasonCode,
    details: input.details?.trim() || null,
  });
  if (error?.code === "23505") throw new Error("Вы уже отправили жалобу");
  if (error) throw new Error(error.message);
  return { ok: true as const };
}
