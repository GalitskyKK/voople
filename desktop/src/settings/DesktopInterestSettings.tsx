import type { Session } from "@supabase/supabase-js";
import { useCallback, useMemo } from "react";

import { UserInterestsSettingsPanel } from "@/components/social/UserInterestsSettingsPanel";
import { UserPrivacySettingsPanel } from "@/components/social/UserPrivacySettingsPanel";
import type { InterestCatalogView, UserInterestSettingsView } from "@/types/social";
import type { UserPrivacySettingsView } from "@/types/privacy";

import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopConfig } from "../config";

export function DesktopInterestSettings({ config, session }: { config: DesktopConfig; session: Session }) {
  const client = useMemo(() => createDesktopTrpcClient(config, () => session.access_token), [config, session.access_token]);
  const loadCatalog = useCallback(() => client.query("social.interestCatalog") as Promise<InterestCatalogView>, [client]);
  const load = useCallback(() => client.query("social.myInterests") as Promise<UserInterestSettingsView>, [client]);
  const save = useCallback((selectedSlugs: string[]) => client.mutation("social.setMyInterests", { selectedSlugs }) as Promise<UserInterestSettingsView>, [client]);
  const loadPrivacy = useCallback(() => client.query("social.myPrivacy") as Promise<UserPrivacySettingsView>, [client]);
  const savePrivacy = useCallback((settings: UserPrivacySettingsView) => client.mutation("social.setMyPrivacy", settings) as Promise<UserPrivacySettingsView>, [client]);
  return <div className="space-y-5"><UserPrivacySettingsPanel load={loadPrivacy} save={savePrivacy} /><UserInterestsSettingsPanel loadCatalog={loadCatalog} load={load} save={save} /></div>;
}
