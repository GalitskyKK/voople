export const LIVE_MOVE_SCHEMA_UNAVAILABLE = "LIVE_MOVE_SCHEMA_UNAVAILABLE";

export function isLiveMoveSchemaUnavailable(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as { message?: unknown; data?: { code?: unknown } };
  return value.message === LIVE_MOVE_SCHEMA_UNAVAILABLE
    && value.data?.code === "PRECONDITION_FAILED";
}
