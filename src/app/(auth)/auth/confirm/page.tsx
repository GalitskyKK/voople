"use client";

import { CircleAlert, LoaderCircle, MailCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { authEntryHref, onboardingHref, safeAuthContinuation } from "@/lib/auth/continuation";
import { syncPublicUser } from "@/lib/auth/sync-public-user";
import { createClient } from "@/lib/supabase/client";
import { trustCurrentDevice } from "@/lib/auth/trusted-device-client";

async function completeEmailConfirmation(code: string | null, resumed: boolean, redirectAfter: string | null) {
  const supabase = createClient();
  let accessToken: string;

  if (resumed) {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) throw error ?? new Error("Missing confirmed session");
    const verification = await supabase.auth.getUser(data.session.access_token);
    if (verification.error || !verification.data.user) {
      throw verification.error ?? new Error("Invalid confirmed session");
    }
    accessToken = data.session.access_token;
  } else {
    if (!code) throw new Error("Missing confirmation code");
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.session) throw error ?? new Error("Email confirmation failed");
    accessToken = data.session.access_token;

    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("code");
    cleanUrl.searchParams.set("confirmed", "1");
    window.history.replaceState(null, "", `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
  }

  const result = await syncPublicUser();
  await trustCurrentDevice({ accessToken, platform: "web" }).catch(() => undefined);
  return result.created && result.username
    ? onboardingHref(result.username, redirectAfter)
    : redirectAfter ?? (result.username ? `/${result.username}` : "/feed");
}

export default function EmailConfirmationPage() {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loginHref, setLoginHref] = useState("/login");
  const completionRef = useRef<{ attempt: number; promise: Promise<string> } | null>(null);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const resumed = params.get("confirmed") === "1";
    const redirectAfter = safeAuthContinuation(params.get("redirect"));
    if (completionRef.current?.attempt !== attempt) {
      completionRef.current = {
        attempt,
        promise: completeEmailConfirmation(code, resumed, redirectAfter),
      };
    }
    const completion = completionRef.current.promise;

    void completion.then((destination) => {
      if (!active) return;
      router.replace(destination);
      router.refresh();
    }).catch(() => {
      if (!active) return;
      setLoginHref(authEntryHref("/login", redirectAfter));
      setFailed(true);
    });

    return () => { active = false; };
  }, [attempt, router]);

  const retry = () => {
    setFailed(false);
    setAttempt((value) => value + 1);
  };

  return (
    <section className="voople-panel w-full max-w-sm space-y-5 p-6 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-(--theme-accent)/15 text-[var(--theme-accent)]" aria-hidden>
        {failed ? <CircleAlert className="size-6" /> : <MailCheck className="size-6" />}
      </span>
      <div className="space-y-2" role={failed ? "alert" : undefined}>
        <h1 className="voople-display">{failed ? "Не удалось подтвердить почту" : "Подтверждаем почту"}</h1>
        <p className="text-sm leading-6 text-[var(--app-muted)]">
          {failed
            ? "Ссылка могла устареть или открыться в другом браузере. Повторите проверку либо войдите в аккаунт."
            : "Подождите немного — после проверки вернём вас туда, где вы остановились."}
        </p>
      </div>
      {failed ? (
        <div className="grid gap-2">
          <Button type="button" className="w-full" onClick={retry}>Повторить</Button>
          <a className="voople-link text-sm" href={loginHref}>Перейти ко входу</a>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 text-sm text-[var(--app-muted)]" role="status" aria-live="polite">
          <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
          Проверяем ссылку…
        </div>
      )}
    </section>
  );
}
