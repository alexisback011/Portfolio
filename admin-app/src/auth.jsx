import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { client, loadTokens, saveTokens, clearTokens } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await loadTokens();
      try {
        const { data } = await client.get("/auth/me");
        if (mounted) setUser(data);
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await client.post("/auth/login", { email, password });
    await saveTokens(data.access_token, data.refresh_token);
    setUser({ id: data.id, name: data.name, email: data.email, role: data.role });
    return data;
  }, []);

  const logout = useCallback(async () => {
    await clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
