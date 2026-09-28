import { createContext, useContext } from "react";

export const GroupTopChromeSlotContext = createContext<HTMLElement | null>(null);

export function useGroupTopChromeSlot() {
  return useContext(GroupTopChromeSlotContext);
}
