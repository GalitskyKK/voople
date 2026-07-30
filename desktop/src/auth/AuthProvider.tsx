import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { DesktopConfig } from "../config";
import { getSupabase } from "./supabase";

type AuthState = {
  loading: boolean;
  session: Session | null;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({
  children,
  config,
}: {
  children: ReactNode;
  config: DesktopConfig;
}) {
  const supabase = useMemo(() => getSupabase(config), [config]);
  const [state, setState] = useState<AuthState>({ loading: true, session: null });

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setState({ loading: false, session: data.session });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setState({ loading: false, session });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useDesktopAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useDesktopAuth must be used inside AuthProvider");
  return value;
}
