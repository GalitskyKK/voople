import React from "react";
import { ProfileEditSheet } from "@/components/profile/ProfileEditSheet";
import { resolveCustomization } from "@/lib/customization/resolve";
import { trpc } from "@/lib/trpc/client";

export function NicknameFontHarness() {
  const utils = trpc.useUtils();
  const customization = { ...resolveCustomization({ nicknameFont: "sans" }), bannerValue: {} };
  return <>
    <button onClick={() => void utils.customization.accountNicknameFont.invalidate()}>Refresh font access</button>
    <ProfileEditSheet triggerVariant="button" profile={{
      id: "10000000-0000-4000-8000-000000000001", username: "font-fixture", displayName: "Font Fixture",
      createdAt: "2026-10-02T00:00:00Z", hasVooplePlus: false, customization, status: {},
      stats: { posts: 0, followers: 0, following: 0, views: 0 },
    }} />
  </>;
}
