"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_APP_PREFERENCES, readAppPreferences, subscribeAppPreferences } from "@/lib/app-preferences";

/** Also usable by portable views mounted without the settings provider. */
export function useInterfaceDesign() {
  return useSyncExternalStore(subscribeAppPreferences, readAppPreferences, () => DEFAULT_APP_PREFERENCES).interfaceDesign;
}
