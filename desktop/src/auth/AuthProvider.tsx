import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { DesktopConfig } from "../config";
import type { AuthSessionBootstrapReason } from "@/lib/supabase/session-bootstrap";
import { resolveAuthSessionBootstrap } from "@/lib/supabase/session-bootstrap";
import { getSupabase } from "./supabase";

type AuthState = {
  bootstrapError: AuthSessionBootstrapReason | null;
  loading: boolean;
  retry: () => void;
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
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<AuthState, "retry">>({
    bootstrapError: null,
    loading: true,
    session: null,
  });
  const retry = useCallback(() => {
    setState((current) => ({
      ...current,
      bootstrapError: null,
      loading: true,
    }));
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    let resolvedByAuthEvent = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active || event === "INITIAL_SESSION") return;
      resolvedByAuthEvent = true;
      setState({ bootstrapError: null, loading: false, session });
    });

    void resolveAuthSessionBootstrap(async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) return { value: null, error };

      const verification = await supabase.auth.getUser(data.session.access_token);
      return { value: data.session, error: verification.error };
    }).then((result) => {
      if (!active || resolvedByAuthEvent) return;
      if (result.status === "error") {
        setState({
          bootstrapError: result.reason,
          loading: false,
          session: null,
        });
        return;
      }
      setState({ bootstrapError: null, loading: false, session: result.value });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [attempt, supabase]);

  useEffect(() => {
    if (!state.bootstrapError) return;
    window.addEventListener("online", retry, { once: true });
    return () => window.removeEventListener("online", retry);
  }, [retry, state.bootstrapError]);

  const value = useMemo(() => ({ ...state, retry }), [retry, state]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useDesktopAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useDesktopAuth must be used inside AuthProvider");
  return value;
}
