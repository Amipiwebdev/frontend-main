// App.jsx
import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import Bands from "./components/Bands";
import Bracelets from "./components/bracelets";
import JewelryDetails from "./components/jewelry-details-page/JewelryDetails";

// OPTION A (keep your current imports):
import { apiSession } from "./apiClient";

// OPTION B (if you added helpers in apiClient.js):
// import { sget, spost } from "./apiClient";

export default function App() {
  useEffect(() => {
    let ran = false;      // ensure a single run per mount (we re-run on focus)
    let inflight = false;

    const broadcast = (user) => {
      // Persist for late subscribers and cross-tab sync
      if (user) localStorage.setItem("amipiUser", JSON.stringify(user));
      else localStorage.removeItem("amipiUser");

      // Also bump a timestamp so 'storage' listeners always fire
      localStorage.setItem("amipi:auth-last", String(Date.now()));

      // Same-tab event so Header can react instantly
      window.dispatchEvent(new CustomEvent("amipi:auth", { detail: { user } }));
    };

    async function runSSO() {
      if (ran || inflight) return;
      inflight = true;

      try {
        // --- 1) Try SSO exchange (200 OK or 409 token-used are both fine) ---
        // Using your existing client:
        await apiSession.post("/api/sso/exchange", {}, { headers: { Accept: "application/json" } });

        // If you adopted helpers, you could instead do:
        // await spost("sso/exchange", {});
      } catch {
        // ignore; we still ask /api/me next
      }

      try {
        // --- 2) Who am I now? ---
        const { data } = await apiSession.get("/api/me", { headers: { Accept: "application/json" } });
        // Or with helpers: const { data } = await sget("me");
        broadcast(data?.auth ? data.user : null);
      } catch {
        broadcast(null);
      } finally {
        inflight = false;
        ran = true;
      }
    }

    // Run once on mount
    runSSO();

    // Re-try when the tab regains focus/visibility (user might log in on amipi.com)
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
        <Route path="/jewelry-details/jewelry/:sku" element={<JewelryDetails />} />
        <Route path="/jewelry-details" element={<JewelryDetails />} />
      </Routes>
    </BrowserRouter>
  );
}
