import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../shared/config/env";
import { getFunction } from "../shared/api/client";

export type AppRole = "admin" | "employee" | "owner";

interface AppUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: AppRole;
  is_active: boolean;
  permissions?: string[];
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  appUser: AppUser | null;
  role: AppRole | null;
  permissions: string[];
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshAppUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAppUser = useCallback(async () => {
    try {
      const data = await getFunction<AppUser>("users/me");
      setAppUser(data);
    } catch {
      setAppUser(null);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) {
        fetchAppUser().finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) {
        fetchAppUser();
      } else {
        setAppUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchAppUser]);

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + import.meta.env.BASE_URL,
        queryParams: { prompt: "select_account" },
      },
    });
  };

  const signOut = async () => {
    if (typeof window !== "undefined") {
      const clearAuthKeys = (storage: Storage) => {
        const keysToRemove: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key?.includes("auth-token")) keysToRemove.push(key);
        }
        keysToRemove.forEach((k) => storage.removeItem(k));
      };
      clearAuthKeys(localStorage);
      clearAuthKeys(sessionStorage);
    }
    await supabase.auth.signOut({ scope: "global" });
    setSession(null);
    setAppUser(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        appUser,
        role: appUser?.role ?? null,
        permissions: appUser?.permissions ?? [],
        isLoading,
        signIn,
        signOut,
        refreshAppUser: fetchAppUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
