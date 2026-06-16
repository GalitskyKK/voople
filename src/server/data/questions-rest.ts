import { getAdminClient } from "@/lib/supabase/admin";
import { createPost } from "@/server/services/post.service";
import { notifyQuestionAsked } from "@/server/services/notifications.service";

export const QUESTION_MAX_LENGTH = 500;
export const ANSWER_MAX_LENGTH = 1000;
const INBOX_LIMIT = 100;
const ANSWERED_LIMIT = 50;
const POST_TEXT_LIMIT = 280;

/** Публичный вид: отвеченный вопрос профиля. Автор вопроса не раскрывается. */
export type AnsweredQuestionView = {
  id: string;
  question: string;
  answer: string;
  answeredAt: string;
  createdAt: string;
};

/** Вид для владельца: неотвеченный вопрос в инбоксе. Автор не раскрывается. */
export type InboxQuestionView = {
  id: string;
  question: string;
  createdAt: string;
};

type QuestionRow = {
  id: string;
  question_text: string;
  answer_text: string | null;
  answered_at: string | null;
  created_at: string;
};

export async function askQuestionRest(
  profileUserId: string,
  askerId: string,
  rawText: string,
): Promise<{ ok: true }> {
  const text = rawText.trim();
  if (!text) throw new Error("Введите вопрос");
  if (text.length > QUESTION_MAX_LENGTH) {
    throw new Error(`Максимум ${QUESTION_MAX_LENGTH} символов`);
  }

  const admin = getAdminClient();
  const { data: owner, error: ownerError } = await admin
    .from("users")
    .select("id")
    .eq("id", profileUserId)
    .maybeSingle();
  if (ownerError) throw new Error(ownerError.message);
  if (!owner) throw new Error("Профиль не найден");

  const { data: inserted, error } = await admin
    .from("profile_questions")
    .insert({
      profile_user_id: profileUserId,
      asker_id: askerId,
      question_text: text,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await notifyQuestionAsked(profileUserId, askerId, inserted.id as string);
  return { ok: true };
}

/** Публичная лента: отвеченные и не скрытые вопросы профиля. */
export async function listAnsweredQuestionsRest(
  profileUserId: string,
): Promise<AnsweredQuestionView[]> {
  const { data, error } = await getAdminClient()
    .from("profile_questions")
    .select("id, question_text, answer_text, answered_at, created_at")
    .eq("profile_user_id", profileUserId)
    .eq("is_hidden", false)
    .not("answered_at", "is", null)
    .order("answered_at", { ascending: false })
    .limit(ANSWERED_LIMIT);

  if (error) throw new Error(error.message);

  return ((data ?? []) as QuestionRow[])
    .filter((row) => row.answer_text && row.answered_at)
    .map((row) => ({
      id: row.id,
      question: row.question_text,
      answer: row.answer_text as string,
      answeredAt: row.answered_at as string,
      createdAt: row.created_at,
    }));
}

/** Инбокс владельца: неотвеченные и не скрытые. Только сам владелец. */
export async function listQuestionInboxRest(ownerId: string): Promise<InboxQuestionView[]> {
  const { data, error } = await getAdminClient()
    .from("profile_questions")
    .select("id, question_text, created_at")
    .eq("profile_user_id", ownerId)
    .eq("is_hidden", false)
    .is("answered_at", null)
    .order("created_at", { ascending: false })
    .limit(INBOX_LIMIT);

  if (error) throw new Error(error.message);

  return ((data ?? []) as { id: string; question_text: string; created_at: string }[]).map(
    (row) => ({ id: row.id, question: row.question_text, createdAt: row.created_at }),
  );
}

export async function countInboxQuestionsRest(ownerId: string): Promise<number> {
  const { count, error } = await getAdminClient()
    .from("profile_questions")
    .select("*", { count: "exact", head: true })
    .eq("profile_user_id", ownerId)
    .eq("is_hidden", false)
    .is("answered_at", null);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Ответить на вопрос. Публикует ответ в публичную ленту профиля. */
export async function answerQuestionRest(
  ownerId: string,
  questionId: string,
  rawAnswer: string,
): Promise<{ ok: true }> {
  const answer = rawAnswer.trim();
  if (!answer) throw new Error("Введите ответ");
  if (answer.length > ANSWER_MAX_LENGTH) {
    throw new Error(`Максимум ${ANSWER_MAX_LENGTH} символов`);
  }

  await assertOwnsQuestion(ownerId, questionId);

  const { error } = await getAdminClient()
    .from("profile_questions")
    .update({ answer_text: answer, answered_at: new Date().toISOString() })
    .eq("id", questionId)
    .eq("profile_user_id", ownerId);

  if (error) throw new Error(error.message);
  return { ok: true };
}

/** Скрыть/удалить вопрос (владелец). Скрытие убирает его и из инбокса, и из ленты. */
export async function hideQuestionRest(
  ownerId: string,
  questionId: string,
): Promise<{ ok: true }> {
  await assertOwnsQuestion(ownerId, questionId);

  const { error } = await getAdminClient()
    .from("profile_questions")
    .delete()
    .eq("id", questionId)
    .eq("profile_user_id", ownerId);

  if (error) throw new Error(error.message);
  return { ok: true };
}

/**
 * Публикует отвеченный вопрос как пост в ленту (виральная петля).
 * Текст собирается из вопроса и ответа и обрезается до лимита поста.
 */
export async function shareAnswerToFeedRest(ownerId: string, questionId: string) {
  const { data, error } = await getAdminClient()
    .from("profile_questions")
    .select("profile_user_id, question_text, answer_text")
    .eq("id", questionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Вопрос не найден");
  if (data.profile_user_id !== ownerId) {
    throw new Error("Можно делиться только своими ответами");
  }
  if (!data.answer_text) throw new Error("Сначала ответьте на вопрос");

  const text = buildQaPostText(data.question_text, data.answer_text as string);
  return createPost(ownerId, { text });
}

/** «❓ вопрос → 💬 ответ», обрезанное до лимита поста по границе ответа. */
function buildQaPostText(question: string, answer: string): string {
  const prefix = `❓ ${question}\n💬 `;
  const room = POST_TEXT_LIMIT - prefix.length;
  if (room <= 0) {
    // Слишком длинный вопрос — публикуем только ответ.
    return truncate(`💬 ${answer}`, POST_TEXT_LIMIT);
  }
  return prefix + truncate(answer, room);
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

async function assertOwnsQuestion(ownerId: string, questionId: string) {
  const { data, error } = await getAdminClient()
    .from("profile_questions")
    .select("profile_user_id")
    .eq("id", questionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Вопрос не найден");
  if (data.profile_user_id !== ownerId) {
    throw new Error("Можно управлять только вопросами своего профиля");
  }
}
