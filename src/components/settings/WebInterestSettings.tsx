"use client";

import { useCallback } from "react";

import { UserInterestsSettingsPanel } from "@/components/social/UserInterestsSettingsPanel";
import { UserPrivacySettingsPanel } from "@/components/social/UserPrivacySettingsPanel";
import { trpc } from "@/lib/trpc/client";

export function WebInterestSettings() {
  const utils = trpc.useUtils();
  const mutation = trpc.social.setMyInterests.useMutation();
  const privacyMutation = trpc.social.setMyPrivacy.useMutation();
  const loadCatalog = useCallback(() => utils.client.social.interestCatalog.query(), [utils.client]);
  const load = useCallback(() => utils.client.social.myInterests.query(), [utils.client]);
  const save = useCallback(async (selectedSlugs: string[]) => {
    const result = await mutation.mutateAsync({ selectedSlugs });
    await utils.social.myInterests.invalidate();
    return result;
  }, [mutation, utils.social.myInterests]);
  const loadPrivacy = useCallback(() => utils.client.social.myPrivacy.query(), [utils.client]);
  const savePrivacy = useCallback((settings: Parameters<typeof privacyMutation.mutateAsync>[0]) => privacyMutation.mutateAsync(settings), [privacyMutation]);
  return <div className="space-y-5"><UserPrivacySettingsPanel load={loadPrivacy} save={savePrivacy} /><UserInterestsSettingsPanel loadCatalog={loadCatalog} load={load} save={save} /></div>;
}
