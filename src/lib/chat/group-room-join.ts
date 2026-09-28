export function isCrossContextRoomJoinError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as {
    message?: unknown;
    data?: { code?: unknown };
    shape?: { data?: { code?: unknown } };
  };
  const code = candidate.data?.code ?? candidate.shape?.data?.code;
  return code === "PRECONDITION_FAILED"
    || candidate.message === "Сначала подтвердите завершение текущего разговора";
}

export function roomJoinErrorMessage(error: unknown) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : "Не удалось перейти в комнату";
}
