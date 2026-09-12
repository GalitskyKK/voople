import type { RoomGuestInviteUnavailableReason } from "@/types/room-guests";

const UNAVAILABLE_COPY: Record<RoomGuestInviteUnavailableReason, string> = {
  missing: "Ссылка не найдена или записана не полностью.",
  expired: "Срок действия ссылки истёк. Попросите участника комнаты создать новую.",
  revoked: "Ссылку отозвали. Попросите участника комнаты создать новую.",
  ended: "Разговор уже завершился.",
  full: "Все гостевые места заняты.",
};

export function roomGuestUnavailableCopy(reason: RoomGuestInviteUnavailableReason) {
  return UNAVAILABLE_COPY[reason];
}

export async function roomGuestResponseJson<T>(response: Response): Promise<T> {
  const value = await response.json().catch(() => null) as T | { error?: string } | null;
  if (!response.ok) {
    throw new Error(
      value && typeof value === "object" && "error" in value && value.error
        ? String(value.error)
        : "Сервис комнаты временно недоступен",
    );
  }
  return value as T;
}

export function roomGuestMicrophoneError(error: unknown) {
  const name = error && typeof error === "object" && "name" in error
    ? String(error.name)
    : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Доступ к микрофону запрещён. Разрешите его для Voople в настройках браузера и повторите.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "Микрофон не найден. Подключите устройство и повторите.";
  }
  return error instanceof Error
    ? error.message
    : "Не удалось включить микрофон. Проверьте устройство и повторите.";
}
