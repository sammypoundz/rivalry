import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import * as api from "../lib/api";
import type { ApiUser } from "../lib/api";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextValue {
  user: ApiUser | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (
    identifier: string,
    password: string,
    fullName: string,
    /** Mongo ObjectId of the referrer when the signup came via their link. */
    referredBy?: string,
  ) => Promise<void>;
  signOut: () => void;
  /** Edit the logged-in user's own details (name/email/phone). */
  updateProfile: (input: {
    fullName?: string;
    email?: string;
    phone?: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // On first load, check if we already have a valid token
  useEffect(() => {
    if (!localStorage.getItem("rivalry_token")) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((res) => setUser(res.user))
      .catch(() => {
        // Token invalid/expired — clear it
        api.logout();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const signUp = useCallback(
    async (identifier: string, password: string, fullName: string, referredBy?: string) => {
      const input = api.isEmail(identifier)
        ? { email: identifier.trim(), password, fullName }
        : { phone: identifier.trim(), password, fullName };
      // Attribution: when the signup came through someone's referral link
      // (?ref=<userId> in the URL), the backend links the new account to that
      // referrer so their reward unlocks at 5 votes.
      const referrer =
        referredBy ||
        window.location.hash.match(/ref=([0-9a-fA-F]{24})/)?.[1] ||
        new URLSearchParams(window.location.search).get("ref") ||
        undefined;
      const res = await api.register(referrer ? { ...input, referredBy: referrer } : input);
      setUser(res.user);
    },
    [],
  );

  const signIn = useCallback(async (identifier: string, password: string) => {
    const input = api.isEmail(identifier)
      ? { email: identifier.trim(), password }
      : { phone: identifier.trim(), password };
    const res = await api.login(input);
    setUser(res.user);
  }, []);

  const signOut = useCallback(() => {
    api.logout();
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (input: {
      fullName?: string;
      email?: string;
      phone?: string;
    }) => {
      const res = await api.updateProfile(input);
      setUser(res.user);
    },
    [],
  );

  // Whenever the signed-in identity changes, refetch everything user-scoped
  // (my contestants, my stats, referrals, joined contests) so all screens
  // reflect the new session immediately.
  useEffect(() => {
    void queryClient.invalidateQueries();
  }, [user, queryClient]);

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signUp, signOut, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
