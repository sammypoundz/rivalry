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

interface AuthContextValue {
  user: ApiUser | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (
    identifier: string,
    password: string,
    fullName: string,
  ) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

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
    async (identifier: string, password: string, fullName: string) => {
      const input = api.isEmail(identifier)
        ? { email: identifier.trim(), password, fullName }
        : { phone: identifier.trim(), password, fullName };
      const res = await api.register(input);
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

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
