import { createContext, useContext } from "react";

export const GroupBannerSlotContext = createContext<HTMLElement | null>(null);
export function useGroupBannerSlot() { return useContext(GroupBannerSlotContext); }
