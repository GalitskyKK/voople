import { useSyncExternalStore } from "react";

export type GlobalHotkeyFailure = {
  shortcut: string;
  message: string;
};

export type GlobalHotkeyStatus = {
  mode: "idle" | "local" | "registering" | "ready" | "suspended" | "error";
  registeredCount: number;
  failures: GlobalHotkeyFailure[];
};

let snapshot: GlobalHotkeyStatus = {
  mode: "idle",
  registeredCount: 0,
  failures: [],
};
const subscribers = new Set<() => void>();

export function setGlobalHotkeyStatus(next: GlobalHotkeyStatus) {
  snapshot = next;
  subscribers.forEach((subscriber) => subscriber());
}

export function getGlobalHotkeyStatus() {
  return snapshot;
}

export function useGlobalHotkeyStatus() {
  return useSyncExternalStore(
    (subscriber) => {
      subscribers.add(subscriber);
      return () => subscribers.delete(subscriber);
    },
    () => snapshot,
    () => snapshot,
  );
}
