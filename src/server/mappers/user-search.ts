import { mapSubscriptionFields } from "@/server/mappers/profile";
import {
  toProfileCustomizationView,
  type CustomizationRow,
} from "@/server/mappers/customization";
import type { UserSearchHit } from "@/types/search";

export type UserSearchRow = {
  id: string;
  username: string;
  display_name: string;
  bio?: string | null;
  subscriptions?:
    | { started_at: string; expires_at: string }
    | { started_at: string; expires_at: string }[]
    | null;
  profile_customization?: CustomizationRow | CustomizationRow[] | null;
};

export function mapUserSearchRow(row: UserSearchRow): UserSearchHit {
  const subscription = Array.isArray(row.subscriptions)
    ? row.subscriptions[0]
    : row.subscriptions;
  const { hasVooplePlus } = mapSubscriptionFields(subscription ?? undefined);
  const customizationRow = Array.isArray(row.profile_customization)
    ? row.profile_customization[0]
    : row.profile_customization;
  const customization = toProfileCustomizationView(customizationRow, {
    hasActiveSubscription: hasVooplePlus,
  });

  return {
    type: "user",
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio ?? null,
    hasVooplePlus,
    avatarUrl: customization.assets.animatedAvatarUrl ?? null,
  };
}
