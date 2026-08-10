"use client";

import Link from "next/link";

import {
  AppSettingsView,
  type SettingsDestinationRenderer,
} from "@/components/settings/AppSettingsView";
import { WebAccountSecuritySettings } from "@/components/settings/WebAccountSecuritySettings";

export function AppSettingsPage() {
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
    />
  );
}
