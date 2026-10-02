import type { AppThemeId } from "@/lib/app-themes";

import type { PersonalStyleAccess } from "@/types/personal-style-access";
export type { PersonalStyleAccess } from "@/types/personal-style-access";

export type AccountAppTheme = {
  savedAppThemeId: string | null;
  effectiveAppThemeId: AppThemeId;
  access: PersonalStyleAccess;
};
