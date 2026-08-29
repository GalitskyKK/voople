import type { Metadata } from "next";
import { redirect } from "next/navigation";

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
  searchParams: Promise<{ username?: string; redirect?: string }>;
}) {
  const [{ username, redirect: requestedRedirect }, bootstrap] = await Promise.all([
    searchParams,
    getServerAuthBootstrap(),
  ]);
  if (bootstrap.status === "error") {
    return <WebSessionBootstrapRecovery reason={bootstrap.reason} />;
  }
  const user = bootstrap.value;
  if (!user) redirect("/login");
  if (!username) redirect("/feed");
  const redirectAfter =
    requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
      ? requestedRedirect
      : undefined;
  return <OnboardingFlow username={username} redirectAfter={redirectAfter} />;
}
