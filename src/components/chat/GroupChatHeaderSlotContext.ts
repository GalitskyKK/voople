import { createContext, useContext } from "react";

export const GroupChatHeaderSlotContext = createContext<HTMLElement | null>(null);
export function useGroupChatHeaderSlot() { return useContext(GroupChatHeaderSlotContext); }
