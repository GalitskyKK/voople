import { createContext, useContext, type ReactNode } from "react";

export const GroupPeopleActionContext = createContext<{
  action: ReactNode;
  openPeople: () => void;
} | null>(null);

export function useGroupPeopleAction() {
  return useContext(GroupPeopleActionContext);
}
