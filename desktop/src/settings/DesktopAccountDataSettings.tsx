import type { Session } from "@supabase/supabase-js";

import { AccountDataControls } from "@/components/settings/AccountDataControls";
import { downloadAccountExport } from "@/lib/account-export-client";

import type { DesktopConfig } from "../config";

export function DesktopAccountDataSettings({ config, session }: { config: DesktopConfig; session: Session }) {
  return <AccountDataControls exportAccountData={() => downloadAccountExport(
    new URL("/api/account/export", config.apiUrl).toString(), session.access_token,
  )} />;
}
