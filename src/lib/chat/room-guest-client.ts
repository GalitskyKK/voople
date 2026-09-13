import type { RoomGuestInviteUnavailableReason } from "@/types/room-guests";

const UNAVAILABLE_COPY: Record<RoomGuestInviteUnavailableReason, string> = {
  missing: "Ссылка не найдена или записана не полностью.",
  expired: "Срок действия ссылки истёк. Попросите участника комнаты создать новую.",
  revoked: "Ссылку отозвали. Попросите участника комнаты создать новую.",
  ended: "Разговор уже завершился.",
  full: "Все гостевые места заняты.",
};

const unavailableReasons = new Set<RoomGuestInviteUnavailableReason>([
  "missing",
  "expired",
  "revoked",
  "ended",
  "full",
]);

export class RoomGuestResponseError extends Error {
  readonly status: number;
  readonly unavailableReason: RoomGuestInviteUnavailableReason | null;

  constructor(
    message: string,
    status: number,
    unavailableReason: RoomGuestInviteUnavailableReason | null,
  ) {
    super(message);
    this.name = "RoomGuestResponseError";
    this.status = status;
    this.unavailableReason = unavailableReason;
  }
}

export function roomGuestUnavailableReasonFromError(error: unknown) {
  return error instanceof RoomGuestResponseError
    ? error.unavailableReason
    : null;
}

export function roomGuestUnavailableCopy(reason: RoomGuestInviteUnavailableReason) {
  return UNAVAILABLE_COPY[reason];
}

export async function roomGuestResponseJson<T>(response: Response): Promise<T> {
  const value = await response.json().catch(() => null) as
    | T
    | { error?: string; reason?: string }
    | null;
  if (!response.ok) {
    const reason = value && typeof value === "object" && "reason" in value
      && unavailableReasons.has(value.reason as RoomGuestInviteUnavailableReason)
      ? value.reason as RoomGuestInviteUnavailableReason
      : null;
    throw new RoomGuestResponseError(
      value && typeof value === "object" && "error" in value && value.error
        ? String(value.error)
        : "Сервис комнаты временно недоступен",
      response.status,
      reason,
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
