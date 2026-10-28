type AuthErrorLike = {
  code?: string;
  message?: string;
  status?: number;
};

export function getCaptchaErrorMessage(error: AuthErrorLike) {
  if (error.code === "captcha_failed" || error.message?.toLowerCase().includes("captcha")) {
    return "Не удалось пройти антибот-проверку. Обновите страницу и попробуйте снова.";
  }
  return null;
}

export function getPasswordLoginFailure(error: AuthErrorLike) {
  const captchaMessage = getCaptchaErrorMessage(error);
  if (captchaMessage) return { error: captchaMessage, status: 400 };
  if (error.status === 429 || error.code?.includes("rate_limit")) {
    return { error: "Слишком много попыток. Попробуйте позже.", status: 429 };
  }
  if (!error.status || error.status >= 500) {
    return { error: "Сервис входа временно недоступен", status: 503 };
  }
  return { error: "Неверный email или пароль", status: 401 };
}
