import { getAdminClient } from "@/lib/supabase/admin";
import { notifyProfileCanvasDraw } from "@/server/services/notifications.service";
import type { Point, Stroke } from "@/types/canvas";

const MAX_STROKES = 500;
const MAX_POINTS_PER_STROKE = 8_000;

type StrokeRow = {
  id: string;
  profile_user_id: string;
  author_id: string;
  color: string;
  size: number;
  points: unknown;
  created_at: string;
};

function isPoint(value: unknown): value is Point {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    value[0] >= 0 &&
    value[0] <= 1 &&
    value[1] >= 0 &&
    value[1] <= 1
  );
}

function parsePoints(raw: unknown): Point[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isPoint);
}

function mapStrokeRow(row: StrokeRow): Stroke {
  return {
    id: row.id,
    userId: row.author_id,
    color: row.color,
    size: row.size,
    points: parsePoints(row.points),
  };
}

function assertStrokeInput(stroke: Stroke) {
  if (stroke.points.length < 1) {
    throw new Error("Штрих без точек");
  }
  if (stroke.points.length > MAX_POINTS_PER_STROKE) {
    throw new Error("Слишком много точек в штрихе");
  }
  if (!stroke.points.every(isPoint)) {
    throw new Error("Некорректные координаты штриха");
  }
}

export async function listProfileCanvasStrokesRest(profileUserId: string): Promise<Stroke[]> {
  const { data, error } = await getAdminClient()
    .from("profile_canvas_strokes")
    .select("id, profile_user_id, author_id, color, size, points, created_at")
    .eq("profile_user_id", profileUserId)
    .order("created_at", { ascending: true })
    .limit(MAX_STROKES);

  if (error) throw new Error(error.message);
  return ((data ?? []) as StrokeRow[]).map(mapStrokeRow).filter((s) => s.points.length > 0);
}

export async function saveProfileCanvasStrokeRest(
  profileUserId: string,
  authorId: string,
  stroke: Stroke,
): Promise<Stroke> {
  assertStrokeInput(stroke);

  const { error } = await getAdminClient().from("profile_canvas_strokes").upsert(
    {
      id: stroke.id,
      profile_user_id: profileUserId,
      author_id: authorId,
      color: stroke.color,
      size: stroke.size,
      points: stroke.points,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );

  if (error) throw new Error(error.message);

  if (profileUserId !== authorId) {
    await notifyProfileCanvasDraw(profileUserId, authorId);
  }

  return { ...stroke, userId: authorId };
}

export async function clearProfileCanvasRest(profileUserId: string, actorId: string) {
  if (profileUserId !== actorId) {
    throw new Error("Очистить холст может только владелец профиля");
  }

  const { error } = await getAdminClient()
    .from("profile_canvas_strokes")
    .delete()
    .eq("profile_user_id", profileUserId);

  if (error) throw new Error(error.message);
}

export async function deleteProfileCanvasStrokeRest(
  profileUserId: string,
  actorId: string,
  strokeId: string,
) {
  const admin = getAdminClient();
  const { data: row, error: findError } = await admin
    .from("profile_canvas_strokes")
    .select("id, author_id")
    .eq("id", strokeId)
    .eq("profile_user_id", profileUserId)
    .maybeSingle();

  if (findError) throw new Error(findError.message);
  if (!row) throw new Error("Штрих не найден");
  if (row.author_id !== actorId) {
    throw new Error("Можно отменить только свой штрих");
  }

  const { error } = await admin
    .from("profile_canvas_strokes")
    .delete()
    .eq("id", strokeId)
    .eq("profile_user_id", profileUserId);

  if (error) throw new Error(error.message);
  return { strokeId };
}

/** Последний штрих текущего пользователя на холсте профиля */
export async function undoLastOwnStrokeRest(profileUserId: string, actorId: string) {
  const admin = getAdminClient();
  const { data: row, error: findError } = await admin
    .from("profile_canvas_strokes")
    .select("id")
    .eq("profile_user_id", profileUserId)
    .eq("author_id", actorId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) throw new Error(findError.message);
  if (!row?.id) throw new Error("Нечего отменять");

  return deleteProfileCanvasStrokeRest(profileUserId, actorId, row.id);
}
