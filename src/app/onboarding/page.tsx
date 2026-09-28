import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { authEntryHref, onboardingHref, safeAuthContinuation } from "@/lib/auth/continuation";

import { WebSessionBootstrapRecovery } from "@/components/auth/WebSessionBootstrapRecovery";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { getServerAuthBootstrap } from "@/server/services/auth-session.service";

export const metadata: Metadata = {
  title: "Настройка профиля",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ username?: string | string[]; redirect?: string | string[] }>;
}) {
  const [{ username, redirect: requestedRedirect }, bootstrap] = await Promise.all([
    searchParams,
    getServerAuthBootstrap(),
  ]);
  if (bootstrap.status === "error") {
    return <WebSessionBootstrapRecovery reason={bootstrap.reason} />;
  }
  const user = bootstrap.value;
  const redirectAfter = safeAuthContinuation(requestedRedirect) ?? undefined;
  if (!user) redirect(authEntryHref("/login", typeof username === "string" ? onboardingHref(username, redirectAfter) : redirectAfter));
  if (typeof username !== "string" || !username) redirect(redirectAfter ?? "/feed");
  return <OnboardingFlow username={username} redirectAfter={redirectAfter} />;
}
