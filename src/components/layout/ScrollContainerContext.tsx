"use client";

import { createContext, useContext, type RefObject } from "react";

const ScrollContainerContext = createContext<RefObject<HTMLElement | null> | null>(null);

export function ScrollContainerProvider({
  scrollRef,
  children,
}: {
  scrollRef: RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) {
  return (
    <ScrollContainerContext.Provider value={scrollRef}>{children}</ScrollContainerContext.Provider>
  );
}

export function useScrollContainerRef() {
  const scrollRef = useContext(ScrollContainerContext);
  if (!scrollRef) {
    throw new Error("useScrollContainerRef must be used within ScrollContainerProvider");
  }
  return scrollRef;
}
