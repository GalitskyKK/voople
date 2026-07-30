"use client";

import Link from "next/link";

import {
  AppSettingsView,
  type SettingsDestinationRenderer,
} from "@/components/settings/AppSettingsView";

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

  return <AppSettingsView renderDestination={renderDestination} />;
}
