import { create } from "zustand";

type UiState = {
  activeSheet: string | null;
  openSheet: (id: string) => void;
  closeSheet: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  activeSheet: null,
  openSheet: (id) => set({ activeSheet: id }),
  closeSheet: () => set({ activeSheet: null }),
}));
