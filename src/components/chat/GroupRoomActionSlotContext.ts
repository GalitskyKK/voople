import { createContext, useContext } from "react";

export const GroupRoomActionSlotContext = createContext<HTMLElement | null>(null);

export function useGroupRoomActionSlot() {
  return useContext(GroupRoomActionSlotContext);
}
