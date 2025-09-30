// src/auth.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { apiSession } from "./apiClient";

// Shape of /api/me => { auth: boolean, user: object|null, session_id: string }
const AuthCtx = createContext({ user: null, loading: true, refresh: () => {}, logout: () => {} });
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);     // null = unknown, false = not logged-in, object = user
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const { data } = await apiSession.get("/api/me");
      setUser(data.auth ? data.user : false);
    } catch {
      setUser(false);
    } finally {
      setLoading(false);
    }
  };

  const doExchange = async () => {
    // Post once; ignore 401/409; then /api/me decides truth
    try {
      await apiSession.post("/api/sso/exchange", {}, { headers: { Accept: "application/json" } });
    } catch {}
  };

  const logout = async () => {
    try {
      await apiSession.post("/api/logout");
    } finally {
      setUser(false);
    }
  };

  useEffect(() => {
    (async () => {
      await doExchange();
      await refresh();
    })();

    // optional: re-check when tab regains focus (user may log in on main site)
    const again = async () => { await doExchange(); await refresh(); };
    window.addEventListener("focus", again);
    document.addEventListener("visibilitychange", again);
    return () => {
      window.removeEventListener("focus", again);
      document.removeEventListener("visibilitychange", again);
    };
  }, []);

  return (
    <AuthCtx.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}