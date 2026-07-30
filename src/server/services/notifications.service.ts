import { getAdminClient } from "@/lib/supabase/admin";
import { mapSubscriptionFields } from "@/server/mappers/profile";

export type NotifType =
  | "like"
  | "follow"
  | "reply"
  | "repost"
  | "profile_reaction"
  | "profile_canvas_draw"
  | "question";

/** Типы уведомлений, в которых автор скрыт от получателя (анонимность). */
const ANONYMOUS_NOTIF_TYPES = new Set<string>(["profile_canvas_draw", "question"]);

const PROFILE_CANVAS_NOTIF_COOLDOWN_MS = 30 * 60 * 1000;

export async function createNotification(input: {
  userId: string;
  type: NotifType;
  actorId: string;
  referenceId?: string;
}) {
  if (input.userId === input.actorId) return;

  const { error } = await getAdminClient().from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    actor_id: input.actorId,
    reference_id: input.referenceId ?? null,
  });
  if (error) throw new Error(error.message);
}

/**
 * Уведомление владельцу: кто-то рисовал на холсте профиля.
 * actor_id пишется в БД (для будущего «показать автора»), в API не отдаётся.
 */
/** Best-effort: ошибка уведомления не должна откатывать сохранение штриха */
export async function notifyProfileCanvasDraw(profileUserId: string, actorId: string) {
  if (profileUserId === actorId) return;

  try {
    const admin = getAdminClient();
    const since = new Date(Date.now() - PROFILE_CANVAS_NOTIF_COOLDOWN_MS).toISOString();

    const { data: recent, error: findError } = await admin
      .from("notifications")
      .select("id")
      .eq("user_id", profileUserId)
      .eq("type", "profile_canvas_draw")
      .eq("actor_id", actorId)
      .gte("created_at", since)
      .limit(1);

    if (findError) return;
    if (recent && recent.length > 0) return;

    const { error } = await admin.from("notifications").insert({
      user_id: profileUserId,
      type: "profile_canvas_draw",
      actor_id: actorId,
      reference_id: profileUserId,
    });
    if (error) return;
  } catch {
    return;
  }
}

/**
 * Уведомление владельцу: пришёл новый анонимный вопрос.
 * actor_id пишется в БД (анти-абьюз/модерация), но в API не отдаётся.
 * Best-effort: ошибка уведомления не должна откатывать сам вопрос.
 */
export async function notifyQuestionAsked(
  profileUserId: string,
  askerId: string | null,
  questionId: string,
) {
  if (askerId && profileUserId === askerId) return;

  try {
    const { error } = await getAdminClient().from("notifications").insert({
      user_id: profileUserId,
      type: "question",
      actor_id: askerId,
      reference_id: questionId,
    });
    if (error) return;
  } catch {
    return;
  }
}

export type NotificationView = {
  id: string;
  type: string;
  read: boolean;
  createdAt: string;
  actor: {
    id: string;
    username: string;
    displayName: string;
    hasVooplePlus?: boolean;
  } | null;
  referenceId: string | null;
  /** Ссылка на профиль получателя (для анонимных уведомлений о холсте) */
  profileUsername: string | null;
};

export async function listNotifications(userId: string, limit = 40) {
  const admin = getAdminClient();

  const { data: rows, error } = await admin
    .from("notifications")
    .select("id, type, read, created_at, reference_id, actor_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const { data: recipient, error: recipientErr } = await admin
    .from("users")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  if (recipientErr) throw new Error(recipientErr.message);
  const profileUsername = (recipient?.username as string | undefined) ?? null;

  const actorIds = [
    ...new Set(
      (rows ?? [])
        .filter((r) => !ANONYMOUS_NOTIF_TYPES.has(r.type as string))
        .map((r) => r.actor_id as string | null)
        .filter(Boolean),
    ),
  ] as string[];

  const actorsById = new Map<
    string,
    { id: string; username: string; displayName: string; hasVooplePlus: boolean }
  >();

  if (actorIds.length > 0) {
    const { data: actors, error: actorsErr } = await admin
      .from("users")
      .select("id, username, display_name, subscriptions (started_at, expires_at)")
      .in("id", actorIds);

    if (actorsErr) throw new Error(actorsErr.message);
    for (const a of actors ?? []) {
      const subs = a.subscriptions as
        | { started_at: string; expires_at: string }
        | { started_at: string; expires_at: string }[]
        | null;
      const sub = Array.isArray(subs) ? subs[0] : subs;
      const { hasVooplePlus } = mapSubscriptionFields(sub ?? undefined);
      actorsById.set(a.id as string, {
        id: a.id as string,
        username: a.username as string,
        displayName: a.display_name as string,
        hasVooplePlus,
      });
    }
  }

  return (rows ?? []).map((row) => {
    const type = row.type as string;
    const actorId = row.actor_id as string | null;
    const hideActor = ANONYMOUS_NOTIF_TYPES.has(type);
    const actor =
      !hideActor && actorId ? (actorsById.get(actorId) ?? null) : null;

    return {
      id: row.id as string,
      type,
      read: row.read as boolean,
      createdAt: row.created_at as string,
      referenceId: (row.reference_id as string | null) ?? null,
      actor,
      profileUsername: hideActor ? profileUsername : null,
    } satisfies NotificationView;
  });
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await getAdminClient()
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw new Error(error.message);
}

export async function getUnreadCount(userId: string) {
  const { count, error } = await getAdminClient()
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw new Error(error.message);
  return count ?? 0;
}
