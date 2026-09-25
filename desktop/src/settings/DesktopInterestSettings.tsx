import type { Session } from "@supabase/supabase-js";
import { useCallback, useMemo } from "react";

import { UserPrivacySettingsPanel } from "@/components/social/UserPrivacySettingsPanel";
import type { UserPrivacySettingsView } from "@/types/privacy";

import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopConfig } from "../config";

export function DesktopInterestSettings({ config, session }: { config: DesktopConfig; session: Session }) {
  const client = useMemo(() => createDesktopTrpcClient(config, () => session.access_token), [config, session.access_token]);
  const loadPrivacy = useCallback(() => client.query("social.myPrivacy") as Promise<UserPrivacySettingsView>, [client]);
  const savePrivacy = useCallback((settings: UserPrivacySettingsView) => client.mutation("social.setMyPrivacy", settings) as Promise<UserPrivacySettingsView>, [client]);
  return <UserPrivacySettingsPanel load={loadPrivacy} save={savePrivacy} betaOnly />;
}
