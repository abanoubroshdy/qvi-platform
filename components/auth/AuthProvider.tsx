"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { clearPasswordRecovery, markPasswordRecovery } from "@/lib/auth/recovery";
import {
  configureSupabase,
  getSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type RuntimeConfigResponse = {
  configured?: boolean;
  url?: string;
  anonKey?: string;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(() => isSupabaseConfigured());

  const refresh = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setUser(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase.auth.getUser();
    setUser(data.user ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    async function boot() {
      if (!getSupabaseClient()) {
        try {
          const response = await fetch("/api/supabase-config", { cache: "no-store" });
          const data = (await response.json()) as RuntimeConfigResponse;
          if (data.configured && data.url && data.anonKey) {
            configureSupabase({ url: data.url, anonKey: data.anonKey });
          }
        } catch {
          // Keep working without a backend if the runtime config is unavailable.
        }
      }

      if (!active) return;

      const supabase = getSupabaseClient();
      setConfigured(Boolean(supabase));
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        if (!active) return;
        if (event === "PASSWORD_RECOVERY" && session?.user?.id) {
          markPasswordRecovery(session.user.id);
        }
        setUser(session?.user ?? null);
      });

      const { data } = await supabase.auth.getSession();
      // PKCE recovery emits PASSWORD_RECOVERY on a macrotask after initialize.
      // Wait for it before consumers read the recovery mark.
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (!active) {
        sub.subscription.unsubscribe();
        return;
      }
      setUser(data.session?.user ?? null);
      setLoading(false);

      return () => {
        sub.subscription.unsubscribe();
      };
    }

    const pending = boot();
    return () => {
      active = false;
      void pending.then((unsubscribe) => unsubscribe?.());
    };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    clearPasswordRecovery();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, configured, refresh, signOut }),
    [user, loading, configured, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
