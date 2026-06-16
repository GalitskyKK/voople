import { getAdminClient } from "@/lib/supabase/admin";

export const QUESTION_REACTION_EMOJIS = ["❤️", "🔥", "😂", "😮"] as const;
export type QuestionReactionEmoji = (typeof QUESTION_REACTION_EMOJIS)[number];

export type QuestionReactionSummary = {
  emoji: QuestionReactionEmoji;
  count: number;
  reactedByViewer: boolean;
};

/** Реакции по всем отвеченным вопросам профиля: { questionId: summary[] }. */
export type QuestionReactionsByQuestion = Record<string, QuestionReactionSummary[]>;

function assertQuestionReactionEmoji(emoji: string): asserts emoji is QuestionReactionEmoji {
  if (!QUESTION_REACTION_EMOJIS.includes(emoji as QuestionReactionEmoji)) {
    throw new Error("Недоступная реакция");
  }
}

function summarize(
  rows: { emoji: string; reactor_user_id: string }[],
  viewerId?: string | null,
): QuestionReactionSummary[] {
  return QUESTION_REACTION_EMOJIS.map((emoji) => {
    const matching = rows.filter((row) => row.emoji === emoji);
    return {
      emoji,
      count: matching.length,
      reactedByViewer: viewerId ? matching.some((row) => row.reactor_user_id === viewerId) : false,
    };
  });
}

/**
 * Реакции на отвеченные (и не скрытые) вопросы профиля. Сначала берём id
 * отвеченных вопросов, затем их реакции — это и ограничивает выдачу
 * публичными вопросами (скрытые/неотвеченные сюда не попадают).
 */
export async function listQuestionReactionsRest(
  profileUserId: string,
  viewerId?: string | null,
): Promise<QuestionReactionsByQuestion> {
  const admin = getAdminClient();

  const { data: questions, error: qErr } = await admin
    .from("profile_questions")
    .select("id")
    .eq("profile_user_id", profileUserId)
    .eq("is_hidden", false)
    .not("answered_at", "is", null);
  if (qErr) throw new Error(qErr.message);

  const ids = ((questions ?? []) as { id: string }[]).map((row) => row.id);
  if (ids.length === 0) return {};

  const { data: reactions, error: rErr } = await admin
    .from("question_reactions")
    .select("question_id, emoji, reactor_user_id")
    .in("question_id", ids)
    .in("emoji", [...QUESTION_REACTION_EMOJIS]);
  if (rErr) throw new Error(rErr.message);

  const byQuestion: Record<string, { emoji: string; reactor_user_id: string }[]> = {};
  for (const row of (reactions ?? []) as {
    question_id: string;
    emoji: string;
    reactor_user_id: string;
  }[]) {
    (byQuestion[row.question_id] ??= []).push({
      emoji: row.emoji,
      reactor_user_id: row.reactor_user_id,
    });
  }

  const result: QuestionReactionsByQuestion = {};
  for (const id of ids) {
    result[id] = summarize(byQuestion[id] ?? [], viewerId);
  }
  return result;
}

/** Переключить реакцию viewer'а на отвеченный вопрос. Возвращает свежую сводку по вопросу. */
export async function toggleQuestionReactionRest(
  questionId: string,
  reactorUserId: string,
  emoji: string,
): Promise<QuestionReactionSummary[]> {
  assertQuestionReactionEmoji(emoji);

  const admin = getAdminClient();

  const { data: question, error: qErr } = await admin
    .from("profile_questions")
    .select("id, answered_at, is_hidden")
    .eq("id", questionId)
    .maybeSingle();
  if (qErr) throw new Error(qErr.message);

  const row = question as { answered_at: string | null; is_hidden: boolean } | null;
  if (!row || row.is_hidden || !row.answered_at) {
    throw new Error("Вопрос недоступен для реакций");
  }

  const { data: existing, error: findErr } = await admin
    .from("question_reactions")
    .select("emoji")
    .eq("question_id", questionId)
    .eq("reactor_user_id", reactorUserId)
    .eq("emoji", emoji)
    .maybeSingle();
  if (findErr) throw new Error(findErr.message);

  if (existing) {
    const { error } = await admin
      .from("question_reactions")
      .delete()
      .eq("question_id", questionId)
      .eq("reactor_user_id", reactorUserId)
      .eq("emoji", emoji);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await admin.from("question_reactions").insert({
      question_id: questionId,
      reactor_user_id: reactorUserId,
      emoji,
    });
    if (error) throw new Error(error.message);
  }

  const { data: fresh, error: listErr } = await admin
    .from("question_reactions")
    .select("emoji, reactor_user_id")
    .eq("question_id", questionId)
    .in("emoji", [...QUESTION_REACTION_EMOJIS]);
  if (listErr) throw new Error(listErr.message);

  return summarize((fresh ?? []) as { emoji: string; reactor_user_id: string }[], reactorUserId);
}
