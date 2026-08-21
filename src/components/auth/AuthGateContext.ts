"use client";

import { createContext, useContext } from "react";

export type AuthIntent = {
  title?: string;
  description?: string;
};

export type AuthGateContextValue = {
  authenticated: boolean;
  requireAuth: (intent?: AuthIntent) => boolean;
};

export const AuthGateContext = createContext<AuthGateContextValue>({
  authenticated: true,
  requireAuth: () => true,
});

export function useAuthGate() {
  return useContext(AuthGateContext);
}
