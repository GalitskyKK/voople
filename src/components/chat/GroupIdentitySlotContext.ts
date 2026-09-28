import { createContext, useContext } from "react";

export const GroupIdentitySlotContext = createContext<HTMLElement | null>(null);

export function useGroupIdentitySlot() {
  return useContext(GroupIdentitySlotContext);
}
