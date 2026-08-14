"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { LogIn, UserPlus } from "lucide-react";

import { Sheet } from "@/components/ui/Sheet";

type AuthIntent = {
  title?: string;
  description?: string;
};

type AuthGateContextValue = {
  authenticated: boolean;
  requireAuth: (intent?: AuthIntent) => boolean;
};

const AuthGateContext = createContext<AuthGateContextValue>({
  authenticated: true,
  requireAuth: () => true,
});

function currentReturnPath() {
  if (typeof window === "undefined") return "/feed";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function AuthGateProvider({
  authenticated,
  children,
}: {
  authenticated: boolean;
  children: ReactNode;
}) {
  const [intent, setIntent] = useState<AuthIntent | null>(null);
  const [returnPath, setReturnPath] = useState("/feed");

  const requireAuth = useCallback(
    (nextIntent?: AuthIntent) => {
      if (authenticated) return true;
      setReturnPath(currentReturnPath());
      setIntent(nextIntent ?? {});
      return false;
    },
    [authenticated],
  );

  const value = useMemo(
    () => ({ authenticated, requireAuth }),
    [authenticated, requireAuth],
  );
  const redirect = encodeURIComponent(returnPath);

  return (
    <AuthGateContext.Provider value={value}>
      {children}
      <Sheet
        open={intent !== null}
        onClose={() => setIntent(null)}
        ariaLabel="Вход в Вупл."
        className="max-w-sm overflow-hidden p-6"
      >
        <div className="space-y-5 pr-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--theme-accent)">
              Продолжить в Вупл.
            </p>
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--foreground)]">
              {intent?.title ?? "Для этого нужен профиль"}
            </h2>
            <p className="text-sm leading-6 text-[var(--app-muted)]">
              {intent?.description ??
                "Войдите или создайте профиль — после этого вернём вас сюда."}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              href={`/login?redirect=${redirect}`}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[var(--app-radius-md)] bg-[var(--theme-accent)] px-4 text-sm font-medium text-white shadow-[var(--app-shadow-sm)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--theme-accent)"
            >
                <LogIn className="h-4 w-4" />
                Войти
            </Link>
            <Link
              href={`/register?redirect=${redirect}`}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[var(--app-radius-md)] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--app-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--theme-accent)"
            >
                <UserPlus className="h-4 w-4" />
                Создать профиль
            </Link>
          </div>
        </div>
      </Sheet>
    </AuthGateContext.Provider>
  );
}

export function useAuthGate() {
  return useContext(AuthGateContext);
}
