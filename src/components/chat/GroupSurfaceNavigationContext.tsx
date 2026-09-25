"use client";

import { createContext, useContext } from "react";

import type { GroupSurfaceTab } from "./GroupSurfaceTabs";

export const GroupSurfaceNavigationContext = createContext<((tab: GroupSurfaceTab) => void) | null>(null);

export function useGroupSurfaceNavigation() {
  return useContext(GroupSurfaceNavigationContext);
}
