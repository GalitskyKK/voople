import { useState, type FormEvent } from "react";

import { usernameSchema } from "@/lib/validation/username";
import { getEmailDeliveryErrorMessage } from "@/lib/auth/email-delivery-error";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/constants/legal";

import type { DesktopConfig } from "../config";
import { DesktopTurnstile } from "./DesktopTurnstile";
import { getSupabase } from "./supabase";

export function DesktopRegister({
  config,
  onLogin,
}: {
  config: DesktopConfig;
  onLogin: () => void;
}) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsedUsername = usernameSchema.safeParse(username);
    if (!parsedUsername.success) {
      setError(parsedUsername.error.issues[0]?.message ?? "Некорректный username");
      return;
    }
    if (config.turnstileSiteKey && !captchaToken) {
      setError(captchaError ?? "Пройдите антибот-проверку");
      return;
    }
    if (!acceptedLegal) {
      setError("Подтвердите согласие с условиями и политикой");
      return;
    }

    setBusy(true);
    setError(null);
    setConfirmationEmail(null);
    const acceptedAt = new Date().toISOString();
    const { data, error: signUpError } = await getSupabase(config).auth.signUp({
      email: email.trim(),
      password,
      options: {
        captchaToken: captchaToken ?? undefined,
        data: {
          username: parsedUsername.data,
          privacy_accepted_at: acceptedAt,
          privacy_version: PRIVACY_VERSION,
          terms_accepted_at: acceptedAt,
          terms_version: TERMS_VERSION,
          legal_consent_source: "desktop_registration",
        },
      },
    });
    setBusy(false);
    setCaptchaToken(null);
    setCaptchaResetKey((value) => value + 1);

    if (signUpError) {
      setError(getEmailDeliveryErrorMessage(signUpError));
      return;
    }
    if (!data.session) {
      setConfirmationEmail(email.trim());
    }
  };

  if (confirmationEmail) {
    return (
      <main className="auth-page">
        <section className="auth-card auth-confirmation" role="status" aria-live="polite">
          <div className="brand-mark" aria-hidden="true">✉</div>
          <p className="eyebrow">РЕГИСТРАЦИЯ</p>
          <h1>Подтвердите почту</h1>
          <p className="muted">
            Мы отправили письмо на <strong>{confirmationEmail}</strong>. Перейдите по ссылке в письме,
            чтобы завершить регистрацию.
          </p>
          <p className="captcha-note">Если письма нет, проверьте папку «Спам».</p>
          <button type="button" className="primary-button" onClick={onLogin}>
            Перейти ко входу
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="register-title">
        <div className="brand-mark" aria-hidden="true">V</div>
        <p className="eyebrow">VOOPLE DESKTOP</p>
        <h1 id="register-title">Создать аккаунт</h1>
        <p className="muted">Username сохранится за вами после подтверждения регистрации.</p>

        <form onSubmit={submit} className="auth-form">
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Username
            <input
              type="text"
              autoComplete="username"
              minLength={3}
              maxLength={30}
              spellCheck={false}
              value={username}
              onChange={(event) => setUsername(event.target.value.toLowerCase())}
              required
            />
          </label>
          <label>
            Пароль
            <input
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <label className="auth-legal-consent">
            <input
              type="checkbox"
              checked={acceptedLegal}
              onChange={(event) => setAcceptedLegal(event.target.checked)}
              required
            />
            <span>
              Я принимаю <a href={`${config.apiUrl}/legal/terms`} target="_blank" rel="noreferrer">условия использования</a>{" "}
              и <a href={`${config.apiUrl}/legal/privacy`} target="_blank" rel="noreferrer">политику конфиденциальности</a>.
            </span>
          </label>
          {config.turnstileSiteKey ? (
            <DesktopTurnstile
              action="register"
              siteKey={config.turnstileSiteKey}
              resetKey={captchaResetKey}
              onTokenChange={setCaptchaToken}
              onError={setCaptchaError}
            />
          ) : null}
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="primary-button" disabled={busy}>
            {busy ? "Создаём аккаунт…" : "Зарегистрироваться"}
          </button>
        </form>

        <button type="button" className="text-button" onClick={onLogin}>
          Уже есть аккаунт? Войти
        </button>
      </section>
    </main>
  );
}
