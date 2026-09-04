"use client";

import { WebAuthContinuationLink } from "@/components/auth/WebAuthContinuationLink";
import { onboardingHref, safeAuthContinuation } from "@/lib/auth/continuation";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/Button";
import { getEmailDeliveryErrorMessage } from "@/lib/auth/email-delivery-error";
import { TURNSTILE_SITE_KEY, TurnstileChallenge } from "@/components/auth/TurnstileChallenge";
import { syncPublicUser } from "@/lib/auth/sync-public-user";
import { COPY } from "@/lib/constants/copy";
import { createClient } from "@/lib/supabase/client";
import {
  startTrustedPasswordLogin,
  trustCurrentDevice,
} from "@/lib/auth/trusted-device-client";

const schema = z.object({ email: z.string().email("Некорректный email"), password: z.string().min(6, "Минимум 6 символов") });
type FormValues = z.infer<typeof schema>;
const CODE_LENGTH = 6;

export default function LoginPage() {
  const router = useRouter();
  const [codeMode, setCodeMode] = useState(false);
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const codeInputs = useRef<Array<HTMLInputElement | null>>([]);
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError, getValues } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const finishLogin = async (trustAccessToken?: string) => {
    if (trustAccessToken) {
      await trustCurrentDevice({ accessToken: trustAccessToken, platform: "web" }).catch(() => undefined);
    }
    const { username, created } = await syncPublicUser();
    const requestedRedirect = new URLSearchParams(window.location.search).get("redirect");
    const safeRedirect = safeAuthContinuation(requestedRedirect);
    router.replace(
      created && username
        ? onboardingHref(username, safeRedirect)
        : safeRedirect ?? (username ? `/${username}` : "/feed"),
    );
    router.refresh();
  };
  const onSubmit = async (data: FormValues) => {
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      return setError("root", { message: captchaError ?? "Пройдите антибот-проверку" });
    }
    try {
      const result = await startTrustedPasswordLogin({
        email: data.email.trim(),
        password: data.password,
        captchaToken: captchaToken ?? undefined,
      });
      setCaptchaToken(null);
      setCaptchaResetKey((value) => value + 1);
      if (result.verificationRequired) {
        setCodeMode(true);
        setCodeSentTo(null);
        setCode("");
        setCodeError("Это новое устройство. Получите код из письма, чтобы подтвердить вход.");
        return;
      }
      if (!result.accessToken || !result.refreshToken) throw new Error("Сервер входа вернул неполную сессию");
      const supabase = createClient();
      const { data: sessionData, error } = await supabase.auth.setSession({
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
      });
      if (error || !sessionData.session) throw error ?? new Error("Не удалось открыть сессию");
      await finishLogin();
    } catch (error) {
      setCaptchaToken(null);
      setCaptchaResetKey((value) => value + 1);
      setError("root", { message: error instanceof Error ? error.message : "Не удалось войти" });
    }
  };
  const sendCode = async () => {
    const email = getValues("email").trim();
    if (!z.string().email().safeParse(email).success) return setCodeError("Введите корректный email");
    if (TURNSTILE_SITE_KEY && !captchaToken) return setCodeError(captchaError ?? "Пройдите антибот-проверку");
    setCodeBusy(true); setCodeError(null);
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, captchaToken: captchaToken ?? undefined },
    });
    setCaptchaToken(null);
    setCaptchaResetKey((value) => value + 1);
    setCodeBusy(false);
    if (error) return setCodeError(getEmailDeliveryErrorMessage(error));
    setCode(""); setCodeSentTo(email);
    window.setTimeout(() => codeInputs.current[0]?.focus(), 0);
  };
  const verifyCode = async () => {
    if (!codeSentTo || code.length !== CODE_LENGTH) return setCodeError("Введите код из шести цифр");
    setCodeBusy(true); setCodeError(null);
    const { data, error } = await createClient().auth.verifyOtp({ email: codeSentTo, token: code, type: "email" });
    if (error || !data.session) { setCodeBusy(false); return setCodeError(error?.message ?? "Не удалось подтвердить код"); }
    try { await finishLogin(data.session.access_token); } catch (error) { setCodeBusy(false); setCodeError(error instanceof Error ? error.message : "Не удалось создать профиль"); }
  };
  const setCodeDigit = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!digits) {
      setCode((value) => `${value.slice(0, index)}${value.slice(index + 1)}`);
      return;
    }
    setCode((value) => `${value.slice(0, index)}${digits}${value.slice(index + digits.length)}`.slice(0, CODE_LENGTH));
    const next = Math.min(index + digits.length, CODE_LENGTH - 1);
    window.setTimeout(() => codeInputs.current[next]?.focus(), 0);
  };
  const pasteCode = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    window.setTimeout(() => codeInputs.current[Math.min(digits.length, CODE_LENGTH - 1)]?.focus(), 0);
  };

  return <form onSubmit={handleSubmit(onSubmit)} className="voople-panel w-full max-w-sm space-y-4 p-6"><h1 className="voople-display">{COPY.login}</h1><label className="voople-label">Email<input type="email" className="voople-input mt-1.5" {...register("email")} />{errors.email && <span className="mt-1 block text-xs text-red-400">{errors.email.message}</span>}</label>{!codeMode && <label className="voople-label">Пароль<input type="password" className="voople-input mt-1.5" {...register("password")} />{errors.password && <span className="mt-1 block text-xs text-red-400">{errors.password.message}</span>}</label>}{codeMode && codeSentTo && <fieldset className="voople-label"><legend>Код из письма</legend><div className="mt-2 grid grid-cols-6 gap-2">{Array.from({ length: CODE_LENGTH }, (_, index) => <input key={index} ref={(element) => { codeInputs.current[index] = element; }} value={code[index] ?? ""} onChange={(event) => setCodeDigit(index, event.target.value)} onPaste={pasteCode} onKeyDown={(event) => { if (event.key === "Backspace" && !code[index] && index > 0) codeInputs.current[index - 1]?.focus(); if (event.key === "ArrowLeft" && index > 0) codeInputs.current[index - 1]?.focus(); if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) codeInputs.current[index + 1]?.focus(); }} inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} maxLength={CODE_LENGTH} aria-label={`Цифра ${index + 1} кода`} className="aspect-square min-w-0 rounded-xl border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] text-center text-xl font-semibold tabular-nums outline-none transition focus:border-(--theme-accent) focus:ring-2 focus:ring-(--theme-accent)/30" />)}</div></fieldset>}{(!codeMode || !codeSentTo) && <TurnstileChallenge action="login" resetKey={captchaResetKey} onTokenChange={setCaptchaToken} onUnavailable={setCaptchaError} />}{errors.root && <p className="text-sm text-red-400">{errors.root.message}</p>}{codeError && <p className="text-sm text-red-400">{codeError}</p>}{captchaError && <p className="text-sm text-red-400">{captchaError}</p>}{!codeMode ? <Button type="submit" className="w-full" disabled={isSubmitting}>{COPY.login}</Button> : codeSentTo ? <><Button type="button" className="w-full" disabled={codeBusy} onClick={verifyCode}>{codeBusy ? "Проверяем…" : "Войти по коду"}</Button><button type="button" className="w-full text-sm voople-link" disabled={codeBusy} onClick={sendCode}>Отправить код ещё раз</button></> : <Button type="button" className="w-full" disabled={codeBusy} onClick={sendCode}>{codeBusy ? "Отправляем…" : "Отправить код"}</Button>}<button type="button" className="w-full text-center text-sm voople-link" onClick={() => { setCodeMode((value) => !value); setCodeSentTo(null); setCodeError(null); setCode(""); setCaptchaToken(null); setCaptchaResetKey((value) => value + 1); }}>{codeMode ? "Войти с паролем" : "Войти по коду из письма"}</button><p className="text-center text-sm text-[var(--app-muted)]">Нет аккаунта? <WebAuthContinuationLink entry="/register">{COPY.register}</WebAuthContinuationLink></p></form>;
}
