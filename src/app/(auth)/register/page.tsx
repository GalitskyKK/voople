"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { syncPublicUser } from "@/lib/auth/sync-public-user";
import { getEmailDeliveryErrorMessage } from "@/lib/auth/email-delivery-error";
import { COPY } from "@/lib/constants/copy";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/constants/legal";
import { usernameSchema } from "@/lib/validation/username";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { TURNSTILE_SITE_KEY, TurnstileChallenge } from "@/components/auth/TurnstileChallenge";
import { useState } from "react";

const schema = z.object({
  email: z.string().email("Некорректный email"),
  username: usernameSchema,
  password: z.string().min(6, "Минимум 6 символов"),
  acceptedLegal: z.boolean().refine(Boolean, "Подтвердите согласие с условиями и политикой"),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    const requestedRedirect = new URLSearchParams(window.location.search).get("redirect");
    const redirectAfter =
      requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
        ? requestedRedirect
        : null;
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setError("root", { message: captchaError ?? "Пройдите антибот-проверку" });
      return;
    }
    const supabase = createClient();
    const acceptedAt = new Date().toISOString();
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        captchaToken: captchaToken ?? undefined,
        data: {
          username: data.username,
          privacy_accepted_at: acceptedAt,
          privacy_version: PRIVACY_VERSION,
          terms_accepted_at: acceptedAt,
          terms_version: TERMS_VERSION,
          legal_consent_source: "web_registration",
        },
      },
    });
    setCaptchaToken(null);
    setCaptchaResetKey((value) => value + 1);
    if (error) {
      setError("root", { message: getEmailDeliveryErrorMessage(error) });
      return;
    }
    if (signUpData.session) {
      try {
        const { username } = await syncPublicUser({ username: data.username });
        router.replace(
          username
            ? `/onboarding?username=${encodeURIComponent(username)}${redirectAfter ? `&redirect=${encodeURIComponent(redirectAfter)}` : ""}`
            : redirectAfter ?? "/feed",
        );
        router.refresh();
        return;
      } catch (syncErr) {
        setError("root", {
          message: syncErr instanceof Error ? syncErr.message : "Ошибка создания профиля",
        });
        return;
      }
    }
    setConfirmationEmail(data.email.trim());
  };

  if (confirmationEmail) {
    const loginHref = new URLSearchParams(window.location.search).get("redirect");
    const safeRedirect =
      loginHref?.startsWith("/") && !loginHref.startsWith("//") ? loginHref : null;

    return (
      <section
        className="voople-panel w-full max-w-sm space-y-5 p-6 text-center"
        role="status"
        aria-live="polite"
      >
        <div
          className="mx-auto grid size-14 place-items-center rounded-full bg-(--theme-accent)/15 text-2xl"
          aria-hidden="true"
        >
          ✉
        </div>
        <div className="space-y-2">
          <h1 className="voople-display">Подтвердите почту</h1>
          <p className="text-sm leading-6 text-[var(--app-muted)]">
            Мы отправили письмо на <strong className="text-[var(--foreground)]">{confirmationEmail}</strong>.
            Перейдите по ссылке в письме, чтобы завершить регистрацию.
          </p>
          <p className="text-xs text-[var(--app-muted)]">
            Если письма нет, проверьте папку «Спам».
          </p>
        </div>
        <Button
          type="button"
          className="w-full"
          onClick={() =>
            router.push(safeRedirect ? `/login?redirect=${encodeURIComponent(safeRedirect)}` : "/login")
          }
        >
          Перейти ко входу
        </Button>
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="voople-panel w-full max-w-sm space-y-4 p-6"
    >
      <h1 className="voople-display">{COPY.register}</h1>
      <label className="voople-label">
        Email
        <input type="email" autoComplete="email" className="voople-input mt-1.5" {...register("email")} />
        {errors.email && <span className="mt-1 block text-xs text-red-400">{errors.email.message}</span>}
      </label>
      <label className="voople-label">
        {COPY.username}
        <input
          type="text"
          autoComplete="username"
          spellCheck={false}
          placeholder="username"
          className="voople-input mt-1.5 lowercase"
          {...register("username")}
        />
        <span className="mt-1.5 block text-xs text-[var(--app-muted)]">{COPY.usernameHint}</span>
        {errors.username && (
          <span className="mt-1 block text-xs text-red-400">{errors.username.message}</span>
        )}
      </label>
      <label className="voople-label">
        Пароль
        <input
          type="password"
          autoComplete="new-password"
          className="voople-input mt-1.5"
          {...register("password")}
        />
        {errors.password && (
          <span className="mt-1 block text-xs text-red-400">{errors.password.message}</span>
        )}
      </label>
      <label className="flex items-start gap-2 text-xs leading-5 text-[var(--app-muted)]">
        <input
          type="checkbox"
          className="mt-1 size-4 shrink-0 accent-[var(--theme-accent)]"
          {...register("acceptedLegal")}
        />
        <span>
          Я принимаю <Link href="/legal/terms" target="_blank" rel="noreferrer" className="voople-link">условия использования</Link>{" "}
          и <Link href="/legal/privacy" target="_blank" rel="noreferrer" className="voople-link">политику конфиденциальности</Link>.
          {errors.acceptedLegal && (
            <span className="mt-1 block text-red-400">{errors.acceptedLegal.message}</span>
          )}
        </span>
      </label>
      <TurnstileChallenge
        action="register"
        resetKey={captchaResetKey}
        onTokenChange={setCaptchaToken}
        onUnavailable={setCaptchaError}
      />
      {captchaError && <p className="text-sm text-red-400">{captchaError}</p>}
      {errors.root && <p className="text-sm text-red-400">{errors.root.message}</p>}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {COPY.register}
      </Button>
      <p className="text-center text-sm text-[var(--app-muted)]">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="voople-link">
          {COPY.login}
        </Link>
      </p>
    </form>
  );
}
