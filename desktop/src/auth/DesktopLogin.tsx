import { useState, type FormEvent } from "react";

import type { DesktopConfig } from "../config";
import { getEmailDeliveryErrorMessage } from "@/lib/auth/email-delivery-error";
import { DesktopTurnstile } from "./DesktopTurnstile";
import { DesktopRegister } from "./DesktopRegister";
import { getSupabase } from "./supabase";

type LoginMode = "password" | "code";

export function DesktopLogin({ config }: { config: DesktopConfig }) {
  const [registering, setRegistering] = useState(false);
  const [mode, setMode] = useState<LoginMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const supabase = getSupabase(config);

  if (registering) {
    return <DesktopRegister config={config} onLogin={() => setRegistering(false)} />;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const needsCaptcha =
      Boolean(config.turnstileSiteKey) && (mode === "password" || !codeSent);
    if (needsCaptcha && !captchaToken) {
      setError(captchaError ?? "Пройдите антибот-проверку");
      return;
    }
    setBusy(true);
    setError(null);

    const result =
      mode === "password"
        ? await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
            options: { captchaToken: captchaToken ?? undefined },
          })
        : codeSent
          ? await supabase.auth.verifyOtp({
              email: email.trim(),
              token: code,
              type: "email",
            })
          : await supabase.auth.signInWithOtp({
              email: email.trim(),
              options: {
                captchaToken: captchaToken ?? undefined,
                shouldCreateUser: false,
              },
            });

    setBusy(false);
    if (mode === "password" || !codeSent) {
      setCaptchaToken(null);
      setCaptchaResetKey((value) => value + 1);
    }
    if (result.error) {
      setError(
        mode === "code" && !codeSent
          ? getEmailDeliveryErrorMessage(result.error)
          : result.error.message,
      );
      return;
    }
    if (mode === "code" && !codeSent) setCodeSent(true);
  };

  const switchMode = () => {
    setMode((value) => (value === "password" ? "code" : "password"));
    setCodeSent(false);
    setCode("");
    setError(null);
    setCaptchaToken(null);
    setCaptchaResetKey((value) => value + 1);
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true">V</div>
        <p className="eyebrow">VOOPLE DESKTOP</p>
        <h1 id="login-title">С возвращением</h1>
        <p className="muted">Войдите в тот же аккаунт, которым пользуетесь в Voople.</p>

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
          {mode === "password" && (
            <label>
              Пароль
              <input
                type="password"
                autoComplete="current-password"
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
          )}
          {mode === "code" && codeSent && (
            <label>
              Код из письма
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                required
              />
            </label>
          )}
          {config.turnstileSiteKey && (mode === "password" || !codeSent) && (
            <DesktopTurnstile
              siteKey={config.turnstileSiteKey}
              resetKey={captchaResetKey}
              onTokenChange={setCaptchaToken}
              onError={setCaptchaError}
            />
          )}
          {!config.turnstileSiteKey && (
            <p className="captcha-note">
              Для входа с включённой CAPTCHA задайте публичный Turnstile site key.
            </p>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" disabled={busy}>
            {busy
              ? "Подключаемся…"
              : mode === "password"
                ? "Войти"
                : codeSent
                  ? "Подтвердить код"
                  : "Получить код"}
          </button>
        </form>

        <button type="button" className="text-button" onClick={switchMode}>
          {mode === "password" ? "Войти по коду из письма" : "Войти с паролем"}
        </button>
        <button type="button" className="text-button" onClick={() => setRegistering(true)}>
          Нет аккаунта? Зарегистрироваться
        </button>
      </section>
    </main>
  );
}
