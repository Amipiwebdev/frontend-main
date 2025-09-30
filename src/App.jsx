// App.jsx
import React, { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./components/Home";
import Bands from "./components/Bands";
import Bracelets from "./components/bracelets";
import { apiSession } from "./apiClient"; // baseURL https://api.amipi.com , withCredentials: true

export default function App() {
  useEffect(() => {
    let ran = false;        // ensure single exchange per mount
    let inflight = false;

    async function runSSO() {
      if (ran || inflight) return;
      inflight = true;
      try {
        // 1) Try to exchange cookie for session (OK if it returns 200 or 409 token-used)
        await apiSession.post("/api/sso/exchange", {}, {
          headers: { Accept: "application/json" }
        });
      } catch (_) {
        // ignore 401/409/etc — we still try /api/me next
      } finally {
        // 2) Always ask who we are now
        try {
          const { data } = await apiSession.get("/api/me");
          // store + broadcast so any component can react
          localStorage.setItem("amipiUser", JSON.stringify(data?.user || null));
          window.dispatchEvent(new Event("amipi-auth-changed"));
        } catch {}
        inflight = false;
        ran = true;
      }
    }

    runSSO();

    // Also retry when user comes back to the tab (if they logged in on main site)
    const onFocus = () => { ran = false; runSSO(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/bands" element={<Bands />} />
        <Route path="/bracelets" element={<Bracelets />} />
      </Routes>
    </BrowserRouter>
  );
}