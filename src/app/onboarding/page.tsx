import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Настройка профиля",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ username?: string; redirect?: string }>;
}) {
  const [{ username, redirect: requestedRedirect }, supabase] = await Promise.all([searchParams, createClient()]);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!username) redirect("/feed");
  const redirectAfter =
    requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
      ? requestedRedirect
      : undefined;
  return <OnboardingFlow username={username} redirectAfter={redirectAfter} />;
}
