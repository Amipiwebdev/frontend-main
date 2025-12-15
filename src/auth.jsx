// src/auth.jsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { apiSession } from "./apiClient";

/**
 * Auth flow contract:
 * - Call /api/me once on load (with cookie) to hydrate.
 * - If 401 AND we have amipi_sso, call /api/sso/exchange once, then /api/me again.
 * - Avoid loops with refs/guards; expose a single refresh() entrypoint.
 */

const AuthCtx = createContext({
  user: null,
  status: "idle", // idle | checking | exchanging | authenticated | unauthenticated | error
  loading: true,
  refresh: async () => {},
  logout: async () => {},
  setUserFromLogin: () => {},
});

export const useAuth = () => useContext(AuthCtx);

const SSO_COOKIE = "amipi_sso";

const readStoredUser = () => {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("amipiUser");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getSsoCookieValue = () => {
  if (typeof document === "undefined") return "";
  const found = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SSO_COOKIE}=`));
  return found ? found.split("=").slice(1).join("=") : "";
};

const persistUser = (user) => {
  if (typeof window === "undefined") return;
  try {
    if (user) localStorage.setItem("amipiUser", JSON.stringify(user));
    else localStorage.removeItem("amipiUser");
    localStorage.setItem("amipi:auth-last", String(Date.now()));
    window.dispatchEvent(new CustomEvent("amipi:auth", { detail: { user } }));
  } catch {
    /* ignore storage errors */
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredUser());
  const [status, setStatus] = useState(() => (readStoredUser() ? "authenticated" : "idle"));

  // one-time guards
  const meFetchedRef = useRef(false);
  const exchangeAttemptedRef = useRef(false);
  const inFlightRef = useRef(false);
  const bootstrappedRef = useRef(false);

  const setUserAndBroadcast = useCallback((nextUser) => {
    setUser(nextUser || null);
    persistUser(nextUser || null);
  }, []);

  const setUserFromLogin = useCallback(
    (nextUser) => {
      setUserAndBroadcast(nextUser || null);
      setStatus(nextUser ? "authenticated" : "unauthenticated");
    },
    [setUserAndBroadcast]
  );

  // Single runner: /api/sso/exchange once (best-effort), then /api/me once.
  const runAuthOnce = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setStatus((prev) => (prev === "authenticated" ? prev : "loading"));

    const callMe = async () => {
      try {
        const { data } = await apiSession.get("/api/me", {
          headers: { Accept: "application/json" },
        });
        meFetchedRef.current = true;
        return { data, status: 200 };
      } catch (err) {
        const code = err?.response?.status;
        if (code === 401) {
          meFetchedRef.current = true;
          return { data: null, status: 401 };
        }
        throw err;
      }
    };

    try {
      // 1) Best-effort exchange once per load to convert SSO into app session
      if (!exchangeAttemptedRef.current) {
        exchangeAttemptedRef.current = true;
        try {
          await apiSession.post("/api/sso/exchange", {}, { headers: { Accept: "application/json" } });
        } catch {
          // ignore; /api/me below is the source of truth
        }
      }

      // 2) Ask who we are once
      const meRes = await callMe();
      if (meRes.status === 200 && meRes.data?.auth) {
        setUserAndBroadcast(meRes.data.user);
        setStatus("authenticated");
      } else {
        setStatus("unauthenticated");
      }
    } catch (err) {
      const code = err?.response?.status;
      setStatus(code === 401 ? "unauthenticated" : "error");
    } finally {
      inFlightRef.current = false;
    }
  }, [setUserAndBroadcast]);

  const refresh = useCallback(async () => {
    // allow manual refresh to re-run the guarded flow
    meFetchedRef.current = false;
    exchangeAttemptedRef.current = false;
    inFlightRef.current = false;
    await runAuthOnce();
  }, [runAuthOnce]);

  const logout = useCallback(async () => {
    try {
      await apiSession.post("/api/logout", {}, { headers: { Accept: "application/json" } });
    } catch {
      /* ignore */
    } finally {
      meFetchedRef.current = false;
      exchangeAttemptedRef.current = false;
      inFlightRef.current = false;
      setStatus("unauthenticated");
      setUserAndBroadcast(null);
    }
  }, [setUserAndBroadcast]);

  // Bootstrap once per page load (guards StrictMode double-run)
  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    runAuthOnce();
  }, [runAuthOnce]);

  // Sync when other tabs update auth in localStorage.
  useEffect(() => {
    const sync = () => {
      const stored = readStoredUser();
      setUser(stored);
      setStatus((prev) => (stored ? "authenticated" : prev === "authenticated" ? "unauthenticated" : prev));
    };
    window.addEventListener("storage", sync);
    window.addEventListener("amipi:auth", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("amipi:auth", sync);
    };
  }, []);

  const loading = useMemo(
    () => status === "idle" || status === "loading",
    [status]
  );

  const value = useMemo(
    () => ({ user, status, loading, refresh, logout, setUserFromLogin }),
    [user, status, loading, refresh, logout, setUserFromLogin]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
