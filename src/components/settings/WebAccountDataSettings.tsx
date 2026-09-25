"use client";

import { downloadAccountExport } from "@/lib/account-export-client";
import { AccountDataControls } from "./AccountDataControls";

export function WebAccountDataSettings() {
  return <AccountDataControls exportAccountData={() => downloadAccountExport("/api/account/export")} />;
}
