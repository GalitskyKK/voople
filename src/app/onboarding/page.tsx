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
  searchParams: Promise<{ username?: string }>;
}) {
  const [{ username }, supabase] = await Promise.all([searchParams, createClient()]);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!username) redirect("/feed");
  return <OnboardingFlow username={username} />;
}
