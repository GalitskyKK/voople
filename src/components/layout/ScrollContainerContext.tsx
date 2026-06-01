"use client";

import { createContext, useContext, type RefObject } from "react";

export type ScrollContainerMode = "window" | "element";

type ScrollContainerContextValue = {
  scrollRef: RefObject<HTMLElement | null>;
  mode: ScrollContainerMode;
};

const ScrollContainerContext = createContext<ScrollContainerContextValue | null>(null);

export function ScrollContainerProvider({
  scrollRef,
  mode,
  children,
}: {
  scrollRef: RefObject<HTMLElement | null>;
  mode: ScrollContainerMode;
  children: React.ReactNode;
}) {
  return (
    <ScrollContainerContext.Provider value={{ scrollRef, mode }}>
      {children}
    </ScrollContainerContext.Provider>
  );
}

export function useScrollContainer() {
  const value = useContext(ScrollContainerContext);
  if (!value) {
    throw new Error("useScrollContainer must be used within ScrollContainerProvider");
  }
  return value;
}

/** @deprecated use useScrollContainer */
export function useScrollContainerRef() {
  return useScrollContainer().scrollRef;
}
