"use client";

import Link from "next/link";

import {
  AppSettingsView,
  type SettingsDestinationRenderer,
} from "@/components/settings/AppSettingsView";
import { WebAccountSecuritySettings } from "@/components/settings/WebAccountSecuritySettings";
import { WebAccountDataSettings } from "@/components/settings/WebAccountDataSettings";
import { WebPrivacySettings } from "@/components/settings/WebPrivacySettings";
import { trpc } from "@/lib/trpc/client";

export function AppSettingsPage() {
  const subscription = trpc.shop.subscriptionStatus.useQuery(undefined, { retry: false });
  const theme = trpc.customization.accountTheme.useQuery(undefined, { retry: false, refetchInterval: 30_000 });
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
      accountDataSettings={<WebAccountDataSettings />}
      privacySettings={<WebPrivacySettings />}
      subscriptionActive={subscription.data?.active}
      selectPaidAppTheme={theme.isError ? false : theme.data?.access.capabilities.selectPaidAppTheme}
    />
  );
}
