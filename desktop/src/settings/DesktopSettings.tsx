import {
  AppSettingsView,
  type SettingsDestinationRenderer,
} from "@/components/settings/AppSettingsView";
import type { Session } from "@supabase/supabase-js";
import { AppPageContent } from "@/components/layout/AppPageContent";

import type { DesktopConfig } from "../config";
import { useGlobalHotkeyStatus } from "../hotkeys/global-hotkey-status";
import { DesktopWindowSettings } from "./DesktopWindowSettings";
import { DesktopAccountSecuritySettings } from "./DesktopAccountSecuritySettings";
import { DesktopNotificationSettings } from "./DesktopNotificationSettings";

export function DesktopSettings({
  config,
  session,
  navigate,
}: {
  config: DesktopConfig;
  session: Session;
  navigate: (href: string) => void;
}) {
  const hotkeyRuntimeStatus = useGlobalHotkeyStatus();
  const renderDestination: SettingsDestinationRenderer = ({
    href,
    className,
    children,
    external,
  }) => {
    if (external) {
      return (
        <a
          href={new URL(href, config.apiUrl).toString()}
          className={className}
          target="_blank"
          rel="noreferrer"
        >
          {children}
        </a>
      );
    }

    return (
      <button
        type="button"
        className={className}
        onClick={() => navigate(href.split("?")[0])}
      >
        {children}
      </button>
    );
  };

  return (
    <AppPageContent>
    <AppSettingsView
      renderDestination={renderDestination}
      hotkeyRuntimeStatus={hotkeyRuntimeStatus}
      desktopWindowSettings={<DesktopWindowSettings />}
      desktopCallNotifications
      desktopNotificationSettings={<DesktopNotificationSettings />}
      accountSecuritySettings={
        <DesktopAccountSecuritySettings config={config} session={session} />
      }
    />
    </AppPageContent>
  );
}
