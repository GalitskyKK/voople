"use client";

import Link from "next/link";

import {
  AppSettingsView,
  type SettingsDestinationRenderer,
} from "@/components/settings/AppSettingsView";
import { WebAccountSecuritySettings } from "@/components/settings/WebAccountSecuritySettings";
import { WebInterestSettings } from "@/components/settings/WebInterestSettings";
import { trpc } from "@/lib/trpc/client";

export function AppSettingsPage() {
  const subscription = trpc.shop.subscriptionStatus.useQuery(undefined, { retry: false });
  const renderDestination: SettingsDestinationRenderer = ({
    href,
    className,
    children,
  }) => (
    <Link href={href} className={className}>
      {children}
    </Link>
  );

  return (
    <AppSettingsView
      renderDestination={renderDestination}
      accountSecuritySettings={<WebAccountSecuritySettings />}
      socialSettings={<WebInterestSettings />}
      subscriptionActive={subscription.data?.active}
    />
  );
}
