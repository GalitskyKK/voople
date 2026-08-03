type AuthErrorLike = {
  code?: string;
  message?: string;
  status?: number;
};

export function getEmailDeliveryErrorMessage(error: AuthErrorLike) {
  const code = error.code?.toLowerCase() ?? "";
  const message = error.message?.toLowerCase() ?? "";

  if (code.includes("rate_limit") || message.includes("rate limit")) {
    return "Слишком много запросов на отправку. Подождите минуту и попробуйте снова.";
  }

  if (
    (typeof error.status === "number" && error.status >= 500) ||
    message.includes("sending") ||
    message.includes("smtp")
  ) {
    return "Не удалось отправить письмо. Повторите через минуту. Если ошибка сохранится, сообщите нам.";
  }

  return error.message ?? "Не удалось отправить письмо";
}
