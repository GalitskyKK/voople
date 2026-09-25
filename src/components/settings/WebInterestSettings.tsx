"use client";

import { useCallback } from "react";

import { UserPrivacySettingsPanel } from "@/components/social/UserPrivacySettingsPanel";
import { trpc } from "@/lib/trpc/client";

export function WebInterestSettings() {
  const utils = trpc.useUtils();
  const privacyMutation = trpc.social.setMyPrivacy.useMutation();
  const loadPrivacy = useCallback(() => utils.client.social.myPrivacy.query(), [utils.client]);
  const savePrivacy = useCallback((settings: Parameters<typeof privacyMutation.mutateAsync>[0]) => privacyMutation.mutateAsync(settings), [privacyMutation]);
  return <UserPrivacySettingsPanel load={loadPrivacy} save={savePrivacy} betaOnly />;
}
