// src/components/Bands.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Header from "./common/Header";
import Footer from "./common/Footer";
import Topbar from "./common/Topbar";
import { api, apiSession } from "../apiClient";
import ShareProductModal from "./share/ShareProductModal.jsx"; // NEW

const SEO_URL = "bands-test";
const APP_BANDS_URL = "https://jewelry.amipi.com/bands";
const LOGIN_HOST_URL = "https://www.amipi.com/bands";
const LOGIN_URL = `${LOGIN_HOST_URL}?redirect=${encodeURIComponent(APP_BANDS_URL)}`;

/* ------------------------------------------------------------------ */
/*                              Helpers                                */
/* ------------------------------------------------------------------ */

/** Read customer/retailer ids from storage/globals. */
function getClientIds() {
  let customers_id = 0;
  let parent_retailer_id = 0;

  // 1) Try logged-in user object first
  try {
    const user = JSON.parse(localStorage.getItem("amipiUser") || "null");
    if (user && typeof user === "object") {
      customers_id =
        Number(
          user.customers_id ??
            user.customer_id ??
            user.retailerrid ??      // sometimes present
            user.retailer_id ??
            user.id ??                // Retailer::id
            0
        ) || 0;

      parent_retailer_id =
        Number(
          user.parent_retailer_id ??
            user.ParentRetailerID ??
            0
        ) || 0;
    }
  } catch {}

  // 2) Fallback: legacy auth blob (old site)
  if (!customers_id || !parent_retailer_id) {
    try {
      const ls = JSON.parse(localStorage.getItem("amipi_auth") || "{}");
      customers_id = customers_id || (Number(ls.customers_id ?? ls.customer_id ?? 0) || 0);
      parent_retailer_id = parent_retailer_id || (Number(ls.parent_retailer_id ?? 0) || 0);
    } catch {}
  }

  // 3) Fallback: window globals injected by PHP
  if (!customers_id || !parent_retailer_id) {
    const g = window.AMIPI_FRONT || window.AMIPI || window.__AMIPI__ || {};
    customers_id = customers_id || (Number(g.CUST_ID ?? g.customers_id ?? g.customer_id ?? 0) || 0);
    parent_retailer_id =
      parent_retailer_id || (Number(g.ParentRetailerID ?? g.parent_retailer_id ?? 0) || 0);
  }

  return { customers_id, parent_retailer_id };
}

/** Pricing/user flags used by product/cart/wishlist/compare. */
function getPricingParams() {
  let user = null;
  try { user = JSON.parse(localStorage.getItem("amipiUser") || "null"); } catch {}

  const g = window.AMIPI_FRONT || window.AMIPI || window.__AMIPI__ || {};
  const { customers_id } = getClientIds(); // keep for APIs that expect it

  const AMIPI_FRONT_Retailer_Jewelry_Level =
    Number(g.AMIPI_FRONT_Retailer_Jewelry_Level ?? user?.retailer_level_id ?? 3) || 3;

  const AMIPI_FRONT_RetailerProductFlat =
    Number(g.AMIPI_FRONT_RetailerProductFlat ?? 0) || 0;

  const AMIPI_FRONT_RetailerProductPer =
    Number(g.AMIPI_FRONT_RetailerProductPer ?? 0) || 0;

  const AMIPI_FRONT_IS_REATILER =
    ((g.AMIPI_FRONT_IS_REATILER ?? (user?.retailer_level_id > 0 ? "Yes" : "No")) === "Yes")
      ? "Yes" : "No";

  return {
    customers_id,
    AMIPI_FRONT_Retailer_Jewelry_Level,
    AMIPI_FRONT_RetailerProductFlat,
    AMIPI_FRONT_RetailerProductPer,
    AMIPI_FRONT_IS_REATILER,
  };
}


function SafeImage({ src, alt, className, style }) {
  const [ok, setOk] = useState(true);
  if (!ok || !src) return null;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading="lazy"
      onError={() => setOk(false)}
    />
  );
}

function SafeVideo({
  src,
  className,
  style,
  autoPlay = true,
  muted = true,
  loop = true,
  controls = true,
}) {
  const [ok, setOk] = useState(true);
  if (!ok || !src) return null;
  return (
    <video
      src={src}
      className={className}
      style={style}
      autoPlay={autoPlay}
      muted={muted}
      loop={loop}
      controls={controls}
      playsInline
      onError={() => setOk(false)}
    />
  );
}

function pickFirstAvailable(val, allowed) {
  if (!allowed || !allowed.length) return null;
  if (val && allowed.includes(val)) return val;
  return allowed[0];
}

/** Resolve any image/video ref to an absolute URL used by the CDN */
function toAbsoluteMediaUrl(type, input) {
  const raw =
    typeof input === "string"
      ? input
      : input?.url || input?.image || input?.src || input?.filename || "";
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const folder = type === "video" ? "product_video" : "product_images";
  const base = `https://www.amipi.com/ampvd/${folder}`;
  return `${base}/${raw}`.replace(/([^:]\/)\/+/g, "$1");
}

const FILTER_ORDER = [
  "stoneType",
  "design",
  "shape",
  "settingStyle",
  "metal",
  "quality",
  "diamondSize",
  "ringSize",
];

const formatNumber = (val) => {
  const n = Number(val);
  if (Number.isNaN(n)) return String(val ?? "");
  return n.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
};

// format like StandardValueWithoutDecimal(...)
const money0 = (v) =>
  Number(v ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

// stub for ConverRelatedCurrencyPrice(...)
const convertCurrency = (v) => Number(v || 0);

const readStoredUser = () => {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("amipiUser");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

function useAuthState() {
  const [state, setState] = useState(() => {
    const user = readStoredUser();
    return { user, loading: !user };
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState((prev) => ({ ...prev, loading: true }));
      try {
        const { data } = await apiSession.get("/api/me", {
          headers: { Accept: "application/json" },
          withCredentials: true,
        });
        if (cancelled) return;
        const user = data?.auth ? data.user : null;
        if (user) localStorage.setItem("amipiUser", JSON.stringify(user));
        else localStorage.removeItem("amipiUser");
        setState({ user, loading: false });
      } catch {
        if (cancelled) return;
        setState({ user: readStoredUser(), loading: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncFromStorage = () => setState({ user: readStoredUser(), loading: false });
    window.addEventListener("storage", syncFromStorage);
    window.addEventListener("amipi:auth", syncFromStorage);
    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener("amipi:auth", syncFromStorage);
    };
  }, []);

  const goToLogin = useCallback(
    (replace = false) => {
      if (replace) window.location.replace(LOGIN_URL);
      else window.location.href = LOGIN_URL;
    },
    []
  );

  return {
    user: state.user,
    loading: state.loading,
    redirectToLogin: goToLogin,
  };
}

/* ------------------------------------------------------------------ */
/*                             Lightbox                                */
/* ------------------------------------------------------------------ */

function Lightbox({ items, index, onClose, onPrev, onNext }) {
  const open = index >= 0 && items.length > 0;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, onPrev, onNext]);

  if (!open) return null;
  const item = items[index];

  return createPortal(
    <div
      className="lb-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Product media viewer"
      onClick={onClose}
    >
      <style>{`
        .lb-backdrop{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center}
        .lb-dialog{position:relative;max-width:92vw;max-height:92vh}
        .lb-content{max-width:92vw;max-height:92vh;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 40px rgba(0,0,0,.5)}
        .lb-content img,.lb-content video{max-width:92vw;max-height:92vh;border-radius:8px;background:#000}
        .lb-close{position:absolute;top:-44px;right:0;background:transparent;color:#fff;border:0;font-size:28px;cursor:pointer;padding:0 6px}
        .lb-arrow{position:absolute;top:50%;transform:translateY(-50%);border:0;background:rgba(255,255,255,.15);color:#fff;width:44px;height:44px;border-radius:50%;cursor:pointer;font-size:28px;line-height:44px}
        .lb-arrow:hover{background:rgba(255,255,255,.3)}
        .lb-prev{left:-60px}
        .lb-next{right:-60px}
        @media(max-width:768px){
          .lb-prev{left:8px}
          .lb-next{right:8px}
          .lb-close{top:8px;right:8px;background:rgba(0,0,0,.5);border-radius:6px}
        }
      `}</style>

      <div className="lb-dialog" onClick={(e) => e.stopPropagation()}>
        <button className="lb-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
        {items.length > 1 && (
          <>
            <button className="lb-arrow lb-prev" aria-label="Previous" onClick={onPrev}>
              ‹
            </button>
            <button className="lb-arrow lb-next" aria-label="Next" onClick={onNext}>
              ›
            </button>
          </>
        )}
        <div className="lb-content">
          {item.type === "video" ? (
            <video
              src={item.src}
              controls
              autoPlay
              muted
              loop
              playsInline
              style={{ background: "#000" }}
            />
          ) : (
            <img src={item.src} alt="Product media" />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ------------------------------------------------------------------ */
/*     Infinity carousel that repeats from the start if short          */
/* ------------------------------------------------------------------ */

function GalleryCarousel({ items, onOpen, height = 400, minSlides = 3 }) {
  const [perSlide, setPerSlide] = useState(2); // desktop: 2-up, mobile: 1-up

  // Responsive columns: <768 => 1, else 3
  useEffect(() => {
    const handle = () => setPerSlide(window.innerWidth < 768 ? 1 : 3);
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  // Build padded slides
  const slides = useMemo(() => {
    if (!Array.isArray(items) || items.length === 0) return [];

    const nPer = Math.max(1, Math.min(perSlide, items.length));
    const targetLen = Math.max(items.length, nPer * minSlides);

    const padded = Array.from({ length: targetLen }, (_, i) => ({
      ...items[i % items.length],
      __origIndex: i % items.length,
    }));

    const arr = [];
    for (let i = 0; i < padded.length; i += nPer) {
      arr.push(padded.slice(i, i + nPer));
    }
    return arr;
  }, [items, perSlide, minSlides]);

  const [idx, setIdx] = useState(0);
  const total = slides.length;

  useEffect(() => {
    if (total === 0) setIdx(0);
    else if (idx > total - 1) setIdx(0);
  }, [total, idx]);

  if (!items?.length) {
    return (
      <div
        className="gallery-image-link"
        style={{ background: "#f5f5f8", minHeight: height }}
      />
    );
  }

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          width: `${Math.max(total, 1) * 100}%`,
          transform: `translateX(-${idx * (100 / Math.max(total, 1))}%)`,
          transition: "transform .35s ease",
        }}
      >
        {slides.map((slide, s) => (
          <div key={s} style={{ width: `${100 / Math.max(total, 1)}%` }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${Math.min(perSlide, slide.length)}, 1fr)`,
                gap: 0,
                minHeight: height,
              }}
            >
              {slide.map((item, i) => {
                const open = () => onOpen(item.__origIndex ?? 0);
                const commonBtnStyle = {
                  background: "transparent",
                  border: 0,
                  padding: 0,
                  height,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                };

                return item.type === "video" ? (
                  <button
                    key={`v-${s}-${i}`}
                    type="button"
                    className="gallery-image-link"
                    title="View video"
                    onClick={open}
                    style={commonBtnStyle}
                  >
                    <SafeVideo
                      src={item.src}
                      controls={false}
                      className="gallery-image"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        background: "#000",
                        pointerEvents: "none",
                      }}
                    />
                  </button>
                ) : (
                  <button
                    key={`i-${s}-${i}`}
                    type="button"
                    className="gallery-image-link"
                    title="View image"
                    onClick={open}
                    style={commonBtnStyle}
                  >
                    <SafeImage
                      src={item.src}
                      alt="Product view"
                      className="gallery-image"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        background: "#fff",
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous images"
            onClick={() => setIdx((i) => (i - 1 + total) % total)}
            className="previous-btn"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
              <path d="M320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576zM199 303L279 223C288.4 213.6 303.6 213.6 312.9 223C322.2 232.4 322.3 247.6 312.9 256.9L273.9 295.9L424 295.9C437.3 295.9 448 306.6 448 319.9C448 333.2 437.3 343.9 424 343.9L273.9 343.9L312.9 382.9C322.3 392.3 322.3 407.5 312.9 416.8C303.5 426.1 288.3 426.2 279 416.8L199 336.8C189.6 327.4 189.6 312.2 199 302.9z"/>
            </svg>
          </button>
          <button
            type="button"
            aria-label="Next images"
            onClick={() => setIdx((i) => (i + 1) % total)}
            className="next-btn"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
              <path d="M320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576zM361 417C351.6 426.4 336.4 426.4 327.1 417C317.8 407.6 317.7 392.4 327.1 383.1L366.1 344.1L216 344.1C202.7 344.1 192 333.4 192 320.1C192 306.8 202.7 296.1 216 296.1L366.1 296.1L327.1 257.1C317.7 247.7 317.7 232.5 327.1 223.2C336.5 213.9 351.7 213.8 361 223.2L441 303.2C450.4 312.6 450.4 327.8 441 337.1L361 417.1z"/>
            </svg>
          </button>
        </>
      )}
    </div>
  );
}

/* -------------------- Mobile-only Accordion Shell -------------------- */
function AccordionShell({
  id,
  title,
  isMobile,
  openId,
  setOpenId,
  selectedLabel,
  children,
}) {
  if (!isMobile) {
    return <>{children}</>;
  }
  const open = openId === id;
  return (
    <>
      <style>{`
        .acc-card{border:1px solid #e6e9f2;border-radius:14px;background:#fff;box-shadow:0 4px 12px rgba(34,48,82,.06);margin-bottom:12px;overflow:hidden}
        .acc-head{display:flex;align-items:center;justify-content:space-between;gap:2px;padding:5px 10px;cursor:pointer;background:#f1f1f1}
        .acc-title-row{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
        .acc-title{font-weight:700;letter-spacing:.5px;color:#223052;font-size:14px;flex-shrink:0}
        .acc-chip{margin-left:auto;padding:4px 10px;border-radius:12px;border:1px solid #e1e6f2;background:#f1f1f1;color:#223052;font-size:12px;font-weight:700;line-height:1;max-width:55%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .acc-toggle{border:0;background:transparent;line-height:0;padding:0px;border-radius:8px}
        .acc-toggle svg{width:18px;height:18px;transition:transform .25s ease}
        .acc-body{overflow:hidden;transition:max-height .3s ease,padding .2s ease}
        .acc-body-inner{padding:6px}
      `}</style>
      <section className="acc-card" id={`acc-${id}`}>
        <header
          className="acc-head"
          onClick={() => setOpenId(open ? null : id)}
        >
          <div className="acc-title-row">
            <div className="acc-title">{title}</div>
            {selectedLabel ? (
              <div className="acc-chip" title={selectedLabel}>
                {selectedLabel}
              </div>
            ) : null}
          </div>
          <button type="button" className="acc-toggle" aria-expanded={open}>
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M6 9l6 6 6-6"
                stroke="#223052"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transform: open ? "rotate(180deg)" : "rotate(0deg)",
                  transformOrigin: "12px 12px",
                }}
              />
            </svg>
          </button>
        </header>
        <div
          className="acc-body"
          style={{
            maxHeight: open ? "1500px" : "0px",
            paddingTop: open ? 4 : 0,
            paddingBottom: open ? 4 : 0,
          }}
        >
          <div className="acc-body-inner">{children}</div>
        </div>
      </section>
    </>
  );
}

/* ===================================================================== */
/*                               MAIN PAGE                               */
/* ===================================================================== */

const Bands = () => {
  const [pageTitle, setPageTitle] = useState("Bands");
  const [pageHeaderText, setPageHeaderText] = useState("");
  const [navPopup, setNavPopup] = useState({ key: "", title: "", text: "" });
  const [showNavPopup, setShowNavPopup] = useState(false);

  // Allowed ID lists (from catnav)
  const [allowed, setAllowed] = useState({
    stoneTypes: [],
    designs: [],
    shapes: [],
    settingStyles: [],
    metals: [],
    qualities: [],
    vendors: [],
    diamondSizes: [],
  });

  // String CSV we will actually send to /productnew
  const [vendorParam, setVendorParam] = useState(""); // e.g. "16,23"

  // Display data
  const [data, setData] = useState({
    stoneTypes: [],
    designs: [],
    shapes: [],
    settingStyles: [],
    metals: [],
    qualities: [],
    diamondSizes: [],
  });

  // Selections
  const [selected, setSelected] = useState({
    stoneType: null,
    design: null,
    shape: null,
    settingStyle: null,
    metal: null,
    quality: null,
    diamondSize: null,
    ringSize: null,
  });

  // Product & details
  const [product, setProduct] = useState(null);
  const [ringOptions, setRingOptions] = useState([]);
  const [estDiamondPcs, setEstDiamondPcs] = useState(null);
  const [estCaratWt, setEstCaratWt] = useState(null);
  const [estPrice, setEstPrice] = useState(null);

  // Loading flags to prevent layout jump
  const [productLoading, setProductLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const [loginOpen, setLoginOpen] = useState(false);
  // simple bump to re-evaluate price gates after login
  const [authVersion, setAuthVersion] = useState(0);
  const { user: authUser, loading: authLoading, redirectToLogin } = useAuthState();
  const isAuthenticated = Boolean(authUser);
  const [bootstrapDone, setBootstrapDone] = useState(() => typeof window === "undefined");

  const handleCloseNavPopup = useCallback(() => {
    if (typeof window !== "undefined" && navPopup.key) {
      localStorage.setItem(navPopup.key, "1");
    }
    setShowNavPopup(false);
  }, [navPopup.key]);

  useEffect(() => {
    if (typeof window === "undefined") {
      setBootstrapDone(true);
      return undefined;
    }

    const url = new URL(window.location.href);
    const loginToken = url.searchParams.get("token");
    if (!loginToken) {
      setBootstrapDone(true);
      return undefined;
    }

    const broadcastUser = (user) => {
      if (!window) return;
      if (user) localStorage.setItem("amipiUser", JSON.stringify(user));
      else localStorage.removeItem("amipiUser");
      window.dispatchEvent(new CustomEvent("amipi:auth", { detail: { user } }));
    };

    let cancelled = false;
    (async () => {
      try {
        let latestUser = null;

        // 1) Redeem the token
        try {
          const { data } = await apiSession.post(
            "/api/auth/token-login",
            { token: loginToken },
            { withCredentials: true }
          );
          if (cancelled) return;
          latestUser = data?.auth && data?.user ? data.user : null;
          broadcastUser(latestUser);
        } catch {
          if (cancelled) return;
          broadcastUser(null);
        }

        if (cancelled) return;

        // 2) Make sure Laravel session + cookies are in sync
        try {
          await apiSession.post(
            "/api/sso/exchange",
            {},
            { headers: { Accept: "application/json" } }
          );
        } catch {
          // ignore – /api/me below will tell us if the session exists
        }

        // 3) Ask /api/me for the canonical user payload
        try {
          const { data } = await apiSession.get("/api/me", {
            headers: { Accept: "application/json" },
            withCredentials: true,
          });
          if (cancelled) return;
          latestUser = data?.auth ? data.user : null;
          broadcastUser(latestUser);
        } catch {
          if (cancelled) return;
          broadcastUser(null);
        }
      } finally {
        if (cancelled) return;
        setAuthVersion((v) => v + 1);
        url.searchParams.delete("token");
        const cleanedSearch = url.searchParams.toString();
        const nextUrl = `${url.origin}${url.pathname}${
          cleanedSearch ? `?${cleanedSearch}` : ""
        }${url.hash}`;
        window.history.replaceState({}, "", nextUrl);
        setBootstrapDone(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Restore session from cookie if amipiUser not in localStorage
  useEffect(() => {
    if (!bootstrapDone) return undefined;
    const hasUser = !!localStorage.getItem("amipiUser");
    if (!hasUser) {
      (async () => {
        try {
          const res = await apiSession.get("/api/me", {
            headers: { Accept: "application/json" },
            withCredentials: true,
          });
          if (res.data?.auth && res.data.user) {
            localStorage.setItem("amipiUser", JSON.stringify(res.data.user));
            window.dispatchEvent(
              new CustomEvent("amipi:auth", { detail: { user: res.data.user } })
            );
            setAuthVersion((v) => v + 1);
          }
        } catch {
          /* optional */
        }
      })();
    }
    return undefined;
  }, [bootstrapDone]);



  // Lightbox
  const [lbIndex, setLbIndex] = useState(-1);

  // Share modal
  const [shareOpen, setShareOpen] = useState(false);

  // Wishlist state
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishLoading, setWishLoading] = useState(false);

  // Compare state
  const [isCompared, setIsCompared] = useState(false);
  const [comparLoading, setComparLoading] = useState(false);

  // Cart state
  const [isInCart, setIsInCart] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);

  // --------- Mobile detection & one-at-a-time accordion ----------
  const [isMobile, setIsMobile] = useState(false);
  const [openId, setOpenId] = useState("stoneType"); // default open on mobile
  useEffect(() => {
    const apply = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && !openId) setOpenId("stoneType");
      if (!mobile) setOpenId(null);
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [openId]);

  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);



  // Helpers for filter card images
  const getImageUrl = (file, folder) =>
    file?.startsWith("http")
      ? file
      : file
      ? `https://www.amipi.com/images/${folder}/${file}`
      : "";

  /* 1) Initial: fetch catnav + display lists + defaults */
  useEffect(() => {
    api.get(`/catnav/${SEO_URL}`).then(async (res) => {
      const nav = res.data?.[0] || {};

      setPageTitle(nav.category_navigation_title || "Bands");
      setPageHeaderText(String(nav.category_navigation_header_text || "").trim());

      const popupText = String(nav.category_navigation_popup_text || "").trim();
      const popupKey = `catnav_popup_seen_${
        nav.category_navigation_id || nav.category_navigation_seo_url || SEO_URL
      }`;
      const popupTitle = nav.category_navigation_title || nav.category_navigation_pagename || "Notice";

      setNavPopup({ key: popupKey, title: popupTitle, text: popupText });

      if (popupText && typeof window !== "undefined") {
        const seen = localStorage.getItem(popupKey);
        if (!seen) {
          setShowNavPopup(true);
          localStorage.setItem(popupKey, "1");
        }
      }

      const stoneTypeIds = String(nav.category_navigation_sub_stone_type ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "")
        .map(Number)
        .filter((n) => !Number.isNaN(n));

      const designIds = String(nav.category_navigation_sub_category_group ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "")
        .map(Number)
        .filter((n) => !Number.isNaN(n));

      const settingStyleIds = String(nav.category_navigation_sub_category ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "")
        .map(Number)
        .filter((n) => !Number.isNaN(n));

      const shapeIds = String(nav.shap_display ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "")
        .map(Number)
        .filter((n) => !Number.isNaN(n));

      const metalIds = String(nav.metal_type_display ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "")
        .map(Number)
        .filter((n) => !Number.isNaN(n));

      const qualityIds = String(nav.qualities_display ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "")
        .map(Number)
        .filter((n) => !Number.isNaN(n));

      const vendorIds = String(nav.vendor_display ?? nav.vendors_display ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "")
        .map(Number)
        .filter((n) => !Number.isNaN(n));

      setAllowed({
        stoneTypes: stoneTypeIds,
        designs: designIds,
        shapes: shapeIds,
        settingStyles: settingStyleIds,
        metals: metalIds,
        qualities: qualityIds,
        vendors: vendorIds,
        diamondSizes: [],
      });

      setVendorParam(vendorIds.join(","));

      const [
        stoneTypesRes,
        designsRes,
        shapesRes,
        settingStylesRes,
        metalsRes,
        qualitiesRes,
      ] = await Promise.all([
        api.get(`/productstonetype/byids/${stoneTypeIds.join(",")}`),
        api.get(`/stylegroup/byids/${designIds.join(",")}`),
        api.get(`/shapes/byids/${shapeIds.join(",")}`),
        api.get(`/stylecategory/byids/${settingStyleIds.join(",")}`),
        api.get(`/metaltype/byids/${metalIds.join(",")}`),
        api.get(`/quality/byids/${qualityIds.join(",")}`),
      ]);

      setData({
        stoneTypes: stoneTypesRes.data || [],
        designs: designsRes.data || [],
        shapes: shapesRes.data || [],
        settingStyles: settingStylesRes.data || [],
        metals: metalsRes.data || [],
        qualities: qualitiesRes.data || [],
        diamondSizes: [],
      });

      setSelected((prev) => ({
        ...prev,
        stoneType: pickFirstAvailable(
          Number(nav.category_navigation_default_sub_stone_type),
          stoneTypeIds
        ),
        design: pickFirstAvailable(
          Number(nav.category_navigation_default_sub_category_group),
          designIds
        ),
        shape: pickFirstAvailable(Number(nav.shap_default), shapeIds),
        settingStyle: pickFirstAvailable(
          Number(nav.category_navigation_default_sub_category),
          settingStyleIds
        ),
        metal: pickFirstAvailable(Number(nav.metal_type_default), metalIds),
        quality: pickFirstAvailable(Number(nav.qualities_default), qualityIds),
        diamondSize: null,
        ringSize: null,
      }));
    });
  }, []);

  /* 2) StoneType => Design */
  useEffect(() => {
    if (!selected.stoneType) return;
    api
      .get(`/designs`, { params: { stoneType: selected.stoneType } })
      .then((res) => {
        const allowedIds = allowed.designs;
        const filtered = (res.data || []).filter((d) => allowedIds.includes(d.id));
        setData((d) => ({ ...d, designs: filtered }));
        setSelected((sel) => ({
          ...sel,
          design: pickFirstAvailable(sel.design, filtered.map((x) => x.id)),
        }));
      });
  }, [selected.stoneType, allowed.designs]);

  /* 3) Design => Shape */
  useEffect(() => {
    if (!selected.stoneType || !selected.design) return;
    api
      .get(`/shapesnew`, {
        params: { stoneType: selected.stoneType, design: selected.design },
      })
      .then((res) => {
        const allowedIds = allowed.shapes;
        const filtered = (res.data || []).filter((d) => allowedIds.includes(d.id));
        setData((d) => ({ ...d, shapes: filtered }));
        setSelected((sel) => ({
          ...sel,
          shape: pickFirstAvailable(sel.shape, filtered.map((x) => x.id)),
        }));
      });
  }, [selected.stoneType, selected.design, allowed.shapes]);

  /* 4) Shape => Setting Styles */
  useEffect(() => {
    if (!selected.stoneType || !selected.design || !selected.shape) return;
    api
      .get(`/setting-styles`, {
        params: {
          stoneType: selected.stoneType,
          design: selected.design,
          shape: selected.shape,
        },
      })
      .then((res) => {
        const allowedIds = allowed.settingStyles;
        const filtered = (res.data || []).filter((d) => allowedIds.includes(d.id));
        setData((d) => ({ ...d, settingStyles: filtered }));
        setSelected((sel) => ({
          ...sel,
          settingStyle: pickFirstAvailable(
            sel.settingStyle,
            filtered.map((x) => x.id)
          ),
        }));
      });
  }, [selected.stoneType, selected.design, selected.shape, allowed.settingStyles]);

  /* 5) Setting Style => Metal */
  useEffect(() => {
    if (
      !selected.stoneType ||
      !selected.design ||
      !selected.shape ||
      !selected.settingStyle
    )
      return;
    api
      .get(`/metals`, {
        params: {
          stoneType: selected.stoneType,
          design: selected.design,
          shape: selected.shape,
          settingStyle: selected.settingStyle,
        },
      })
      .then((res) => {
        const allowedIds = allowed.metals;
        const filtered = (res.data || []).filter((d) => allowedIds.includes(d.id));
        setData((d) => ({ ...d, metals: filtered }));
        setSelected((sel) => ({
          ...sel,
          metal: pickFirstAvailable(sel.metal, filtered.map((x) => x.id)),
        }));
      });
  }, [
    selected.stoneType,
    selected.design,
    selected.shape,
    selected.settingStyle,
    allowed.metals,
  ]);

  /* 6) Metal => Quality */
  useEffect(() => {
    if (
      !selected.stoneType ||
      !selected.design ||
      !selected.shape ||
      !selected.settingStyle ||
      !selected.metal
    )
      return;
    api
      .get(`/qualities`, {
        params: {
          stoneType: selected.stoneType,
          design: selected.design,
          shape: selected.shape,
          settingStyle: selected.settingStyle,
          metal: selected.metal,
        },
      })
      .then((res) => {
        const allowedIds = allowed.qualities;
        const filtered = (res.data || []).filter((d) => allowedIds.includes(d.id));
        setData((d) => ({ ...d, qualities: filtered }));
        setSelected((sel) => ({
          ...sel,
          quality: pickFirstAvailable(sel.quality, filtered.map((x) => x.id)),
        }));
      });
  }, [
    selected.stoneType,
    selected.design,
    selected.shape,
    selected.settingStyle,
    selected.metal,
    allowed.qualities,
  ]);

  /* Decide size unit (ct/mm) */
  const selectedStoneType = useMemo(
    () => data.stoneTypes.find((st) => (st.pst_id || st.id) === selected.stoneType),
    [data.stoneTypes, selected.stoneType]
  );

  const fallbackUnit =
    /diamond/i.test(
      String(
        selectedStoneType?.pst_name ||
          selectedStoneType?.pst_description ||
          selectedStoneType?.name ||
          ""
      )
    )
      ? "ct"
      : "mm";

  const sizeUnit =
    String(
      selectedStoneType?.pst_ct_mm_flag ??
        selectedStoneType?.ct_mm_flag ??
        fallbackUnit
    )
      .trim()
      .toLowerCase() === "mm"
      ? "mm"
      : "ct";

  /* 7) Quality => Stone Size */
  useEffect(() => {
    if (
      !selected.stoneType ||
      !selected.design ||
      !selected.shape ||
      !selected.settingStyle ||
      !selected.metal ||
      !selected.quality
    )
      return;

    api
      .get(`/diamond-sizesnew`, {
        params: {
          stoneType: selected.stoneType,
          design: selected.design,
          shape: selected.shape,
          settingStyle: selected.settingStyle,
          metal: selected.metal,
          quality: selected.quality,
          unit: sizeUnit,
        },
      })
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : [];

        let sizes = rows.map((r) => {
          if (typeof r === "object" && r !== null) {
            const mm = r.size_mm ?? r.center_stone_mm ?? r.mm ?? null;
            const ct =
              r.size_ct ??
              r.size ??
              r.center_stone_weight ??
              r.weight ??
              null;
            return sizeUnit === "mm" ? mm : ct;
          }
          return r;
        });

        sizes = sizes
          .filter((v) => v !== null && v !== undefined && v !== "")
          .map((v) => Number(v))
          .filter((n) => !Number.isNaN(n));

        sizes = Array.from(new Set(sizes)).sort((a, b) => a - b);

        setData((d) => ({ ...d, diamondSizes: sizes }));
        setSelected((sel) => ({
          ...sel,
          diamondSize: pickFirstAvailable(sel.diamondSize, sizes),
        }));
      });
  }, [
    selected.stoneType,
    selected.design,
    selected.shape,
    selected.settingStyle,
    selected.metal,
    selected.quality,
    sizeUnit,
  ]);

 /* 8) After diamond size → fetch ring size options from filters */
useEffect(() => {
  if (!bootstrapDone) return;
  if (
    !selected.stoneType ||
    !selected.design ||
    !selected.shape ||
    !selected.settingStyle ||
    !selected.metal ||
    !selected.quality ||
    !selected.diamondSize
  ) {
    setRingOptions([]);
    setSelected((sel) => ({ ...sel, ringSize: null }));
    return;
  }

  const params = {
    stoneType: selected.stoneType,
    design: selected.design,
    shape: selected.shape,
    settingStyle: selected.settingStyle,
    metal: selected.metal,
    quality: selected.quality,
    diamondSize: selected.diamondSize,
    unit: sizeUnit,
    vendors: vendorParam || "",
  };

  api.get("/ring-size-options", { params }).then((res) => {
    const opts = Array.isArray(res.data) ? res.data : [];
    setRingOptions(opts);
    setSelected((sel) => {
      const found = opts.find((x) => x.value_id === sel.ringSize);
      return { ...sel, ringSize: found ? found.value_id : opts?.[0]?.value_id || null };
    });
  });
}, [
  selected.stoneType,
  selected.design,
  selected.shape,
  selected.settingStyle,
  selected.metal,
  selected.quality,
  selected.diamondSize,
  sizeUnit,
  vendorParam,
]);

/* 9) All filters + ring size → Product */
useEffect(() => {
  if (!bootstrapDone) return;
  if (
    !selected.stoneType ||
    !selected.design ||
    !selected.shape ||
    !selected.settingStyle ||
    !selected.metal ||
    !selected.quality ||
    !selected.diamondSize ||
    !selected.ringSize
  ) {
    // keep layout stable but clear product if not enough inputs
    // (optional) setProduct(null);
    return;
  }

  const pricing = getPricingParams();
  const params = {
    stoneType: selected.stoneType,
    design: selected.design,
    shape: selected.shape,
    settingStyle: selected.settingStyle,
    metal: selected.metal,
    quality: selected.quality,
    diamondSize: selected.diamondSize,
    ringSize: selected.ringSize,      // <-- NEW: send ring size
    unit: sizeUnit,
    vendors: vendorParam || "",
    ...pricing,
  };

  let cancelled = false;
  setProductLoading(true);
  api
    .get(`/productnew`, { params })
    .then((res) => !cancelled && setProduct(res.data || null))
    .finally(() => !cancelled && setProductLoading(false));
  return () => { cancelled = true; };
}, [
  selected.stoneType,
  selected.design,
  selected.shape,
  selected.settingStyle,
  selected.metal,
  selected.quality,
  selected.diamondSize,
  selected.ringSize,     // <-- depends on ringSize now
  sizeUnit,
  vendorParam,
  authVersion,
  bootstrapDone,
]);


  /* 10) Estimates for pcs / carat / price w.r.t ring size */
  useEffect(() => {
    if (!product) return;
    let diamondPcs = Number(product.estimated_pcs || product.diamond_pics || 0);
    let caratWeight = Number(product.total_carat_weight || 0);

    let price = Number(
      product.products_price ?? product.base_price ?? product.products_price1 ?? 0
    );

    const selectedRingOption = ringOptions.find((o) => o.value_id === selected.ringSize);
    if (selectedRingOption) {
      if (selectedRingOption.options_symbol && selectedRingOption.estimated_weight !== null) {
        const estW = Number(selectedRingOption.estimated_weight);
        switch (selectedRingOption.options_symbol) {
          case "+": diamondPcs += estW; break;
          case "-": diamondPcs -= estW; break;
          case "*": diamondPcs *= estW; break;
          case "/": diamondPcs /= estW; break;
          default: break;
        }
      }
      if (selectedRingOption.estimated_symbol && selectedRingOption.estimated_weight !== null) {
        const estW = Number(selectedRingOption.estimated_weight);
        switch (selectedRingOption.estimated_symbol) {
          case "+": caratWeight += estW; break;
          case "-": caratWeight -= estW; break;
          case "*": caratWeight *= estW; break;
          case "/": caratWeight /= estW; break;
          default: break;
        }
      }
      if (selectedRingOption.options_symbol && selectedRingOption.options_price !== null) {
        const optPrice = Number(selectedRingOption.options_price);
        switch (selectedRingOption.options_symbol) {
          case "+": price += optPrice; break;
          case "-": price -= optPrice; break;
          case "*": price *= optPrice; break;
          case "/": price /= optPrice; break;
          default: break;
        }
      }
    }
    setEstDiamondPcs(diamondPcs);
    setEstCaratWt(caratWeight);
    setEstPrice(price);
  }, [product, ringOptions, selected.ringSize]);

  /* Build media items for gallery/lightbox */
  const galleryItems = useMemo(() => {
    const arr = [];
    if (product?.videos?.length) {
      product.videos.forEach((v) =>
        arr.push({ type: "video", src: toAbsoluteMediaUrl("video", v) })
      );
    }
    if (product?.images?.length) {
      product.images.forEach((im) =>
        arr.push({ type: "image", src: toAbsoluteMediaUrl("image", im) })
      );
    }
    return arr;
  }, [product]);

  // Lightbox handlers
  const openLightbox = (i) => setLbIndex(i);
  const closeLightbox = () => setLbIndex(-1);
  const prevLightbox = () =>
    setLbIndex((i) => (i <= 0 ? galleryItems.length - 1 : i - 1));
  const nextLightbox = () =>
    setLbIndex((i) => (i + 1) % Math.max(galleryItems.length, 1));

  /* Selected labels for mobile accordion headers */
  const selectedLabels = useMemo(() => {
    const stoneType = data.stoneTypes.find((st) => (st.pst_id || st.id) === selected.stoneType);
    const design = data.designs.find((d) => (d.psg_id || d.id) === selected.design);
    const shape = data.shapes.find((sh) => sh.id === selected.shape);
    const settingStyle = data.settingStyles.find(
      (sc) => (sc.psc_id || sc.id) === selected.settingStyle
    );
    const metal = data.metals.find((m) => (m.dmt_id || m.id) === selected.metal);
    const quality = data.qualities.find((q) => (q.dqg_id || q.id) === selected.quality);
    const ring = ringOptions.find((opt) => opt.value_id === selected.ringSize);

    return {
      stoneType: stoneType?.pst_description || stoneType?.pst_name || stoneType?.name || "",
      design: design?.psg_name || design?.name || "",
      shape: shape?.name || "",
      settingStyle: settingStyle?.psc_name || settingStyle?.name || "",
      metal: metal?.dmt_tooltip || metal?.dmt_name || metal?.name || "",
      quality: quality?.dqg_alias || quality?.dqg_name || quality?.name || "",
      diamondSize:
        selected.diamondSize != null ? `${selected.diamondSize} ${sizeUnit.toUpperCase()}` : "",
      ringSize: ring?.value_name || "",
    };
  }, [
    data.stoneTypes,
    data.designs,
    data.shapes,
    data.settingStyles,
    data.metals,
    data.qualities,
    ringOptions,
    selected,
    sizeUnit,
  ]);

  // Filter click handler
  function handleFilterChange(key, value) {
    setSelected((prev) => {
      const updated = { ...prev, [key]: value };

      const dataMap = {
        stoneType: data.stoneTypes.map((x) => x.pst_id || x.id),
        design: data.designs.map((x) => x.psg_id || x.id),
        shape: data.shapes.map((x) => x.id),
        settingStyle: data.settingStyles.map((x) => x.psc_id || x.id),
        metal: data.metals.map((x) => x.dmt_id || x.id),
        quality: data.qualities.map((x) => x.dqg_id || x.id),
        diamondSize: data.diamondSizes,
        ringSize: ringOptions.map((x) => x.value_id),
      };

      const idx = FILTER_ORDER.indexOf(key);
      for (const k of FILTER_ORDER.slice(idx + 1)) {
        if (updated[k] !== null && !dataMap[k]?.includes(updated[k])) {
          updated[k] = null;
        }
      }
      return updated;
    });
  }

  // CSRF preflight
  useEffect(() => {
    apiSession.get("/api/csrf").catch(() => {});
  }, []);

  // ids fallback using session user
  function resolveIdsWithAuthFallback(baseIds = {}) {
    let u = null;
    try {
      u = JSON.parse(localStorage.getItem("amipiUser") || "null");
    } catch {}
    const cid =
      Number(baseIds.customers_id || 0) ||
      Number(u?.customers_id ?? u?.customer_id ?? u?.retailerrid ?? u?.id ?? 0) ||
      0;
    const prid =
      Number(baseIds.parent_retailer_id || 0) ||
      Number(u?.parent_retailer_id ?? 0) ||
      0;

    return { customers_id: cid, parent_retailer_id: prid };
  }

  /* -------------------- Wishlist -------------------- */
  useEffect(() => {
    if (!product?.products_id || !isAuthenticated) {
      setIsWishlisted(false);
      return;
    }

    const ids = resolveIdsWithAuthFallback(getClientIds());

    apiSession
      .get("/api/wishlist/check", {
        params: {
          products_id: product.products_id,
          customers_id: ids.customers_id,
          parent_retailer_id: ids.parent_retailer_id,
        },
        headers: { Accept: "application/json" },
      })
      .then((res) => setIsWishlisted(Boolean(res.data?.wishlisted)))
      .catch(() => setIsWishlisted(false));
  }, [product?.products_id, isAuthenticated]);

  async function handleWishlistToggle() {
    if (!product?.products_id || wishLoading) return;
    if (!isAuthenticated) {
      redirectToLogin();
      return;
    }

    const pricing = getPricingParams();
    const ids = resolveIdsWithAuthFallback(getClientIds());

    const payload = {
      products_id: product.products_id,
      customers_id: ids.customers_id,
      parent_retailer_id: ids.parent_retailer_id,
      ...pricing,
    };

    try {
      setWishLoading(true);
      const { data } = await apiSession.post("/api/wishlist/toggle", payload, {
        headers: { Accept: "application/json" },
      });
      setIsWishlisted(data?.status === "added");
    } catch (e) {
      console.error("Wishlist toggle failed", e?.response?.data || e.message);
    } finally {
      setWishLoading(false);
    }
  }

  /* -------------------- Compare -------------------- */
  useEffect(() => {
    if (!product?.products_id || !isAuthenticated) {
      setIsCompared(false);
      return;
    }
    const { customers_id, parent_retailer_id } = getClientIds();
    api
      .get("/compare/check_product", {
        params: {
          products_id: product.products_id,
          customers_id,
          parent_retailer_id,
        },
      })
      .then((res) => setIsCompared(Boolean(res.data?.compared)))
      .catch(() => setIsCompared(false));
  }, [product?.products_id, isAuthenticated]);

  async function handleCompareToggle() {
    if (!isAuthenticated) {
      redirectToLogin();
      return;
    }
    const pricing = getPricingParams();
    if (!product?.products_id || comparLoading) return;
    const { customers_id, parent_retailer_id } = getClientIds();
    try {
      setComparLoading(true);
      const { data } = await api.post("/compare/toggle_product", {
        products_id: product.products_id,
        customers_id,
        parent_retailer_id,
        ...pricing,
      });
      setIsCompared(data?.status === "added");
    } catch (e) {
      console.error("Compare toggle failed", e);
    } finally {
      setComparLoading(false);
    }
  }

  /* -------------------- Cart -------------------- */
  useEffect(() => {
    if (!product?.products_id || !isAuthenticated) {
      setIsInCart(false);
      return;
    }
    const { customers_id, parent_retailer_id } = getClientIds();

    apiSession
      .get("/api/cartcheck", {
        params: { products_id: product.products_id, customers_id, parent_retailer_id },
        headers: { Accept: "application/json" },
      })
      .then((res) => setIsInCart(Boolean(res.data?.in_cart)))
      .catch(() => setIsInCart(false));
  }, [product?.products_id, isAuthenticated]);

  async function handleCartToggle() {
    if (!product?.products_id || cartLoading) return;
    if (!isAuthenticated) {
      redirectToLogin();
      return;
    }

    const { customers_id, parent_retailer_id } = getClientIds();
    const pricing = getPricingParams();

    const payload = {
      products_id: product.products_id,
      customers_id,
      parent_retailer_id,
      product_quantity: 1,

      // filters
      stoneType: selected.stoneType,
      design: selected.design,
      shape: selected.shape,
      settingStyle: selected.settingStyle,
      metal: selected.metal,
      quality: selected.quality,
      diamondSize: selected.diamondSize,
      ringSize: selected.ringSize,
      unit: sizeUnit,
      vendors: vendorParam || "",

      // pricing flags
      ...pricing,
    };

    try {
      setCartLoading(true);
      const { data } = await apiSession.post("/api/carttoggle", payload, {
        headers: { Accept: "application/json" },
      });
      setIsInCart(data?.status === "added");
    } catch (e) {
      console.error("Cart toggle failed", e?.response?.data || e.message);
    } finally {
      setCartLoading(false);
    }
  }

  /* ------------------------------------------------------------------ */
  /*                               Render                                */
  /* ------------------------------------------------------------------ */

  const anyBlockingLoad = productLoading || optionsLoading;

  return (
    <div>
      {/* one-time CSS for stable layout + overlay */}
      <style>{`
        .stable-wrap{position:relative}
        .stable-wrap.is-loading{pointer-events:none}
        .stable-wrap .block-overlay{position:absolute;inset:0;background:rgba(255,255,255,.6);display:flex;align-items:center;justify-content:center;z-index:2}
        .stable-wrap .spinner{width:38px;height:38px;border-radius:50%;border:4px solid #dfe3ec;border-top-color:#2c3b5b;animation:spin .9s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}

        /* lock heights so cards don't collapse while content swaps */
        .selection-card{min-height:210px}
        .band-heading-type{min-height:120px; margin-top:15px}
        .ring-size-select{min-height:40px}

        /* preserve grid structure even if ring options are loading */
        .ring-size-block{min-height:82px}
        .price-grid{display:flex;gap:16px;flex-wrap:wrap}
        .price-item{flex:1 1 220px}
        .price-row{display:flex;align-items:center;justify-content:space-between}
        .price-item.right .price-row{justify-content:space-between}
      `}</style>

      <Topbar />
      <Header />
      <div className="custom-container">
        <div className="row">
          <div className="col-12">
            <h1>{pageTitle}</h1>
          </div>
          {pageHeaderText ? (
            <div className="col-12">
              <h2>{pageHeaderText}</h2>
            </div>
          ) : null}

          <div className="main-content flex-wrap d-flex align-items-start p-0 justify-content-center">
            {/* GALLERY */}
            <div className="left-gallery-band row col-12 p-3">
              <GalleryCarousel items={galleryItems} onOpen={openLightbox} />
              <Lightbox
                items={galleryItems}
                index={lbIndex}
                onClose={closeLightbox}
                onPrev={prevLightbox}
                onNext={nextLightbox}
              />
            </div>

            {/* FILTERS + DETAILS */}
            <div className="right-filters row col-12 d-flex flex-wrap align-items-start">

              {/* Stone Type */}
              <div className="filter-block stone-type col-12 col-lg-6 col-md-12 col-sm-12">
                {!isMobile && <div className="filter-title">STONE TYPE</div>}
                <AccordionShell
                  id="stoneType"
                  title="STONE TYPE"
                  isMobile={isMobile}
                  selectedLabel={selectedLabels.stoneType}
                  openId={openId}
                  setOpenId={setOpenId}
                >
                  <div className="filter-options">
                    {data.stoneTypes.map((st) => (
                      <button
                        key={st.pst_id || st.id}
                        type="button"
                        className={
                          "filter-card" +
                          (selected.stoneType === (st.pst_id || st.id) ? " selected" : "")
                        }
                        onClick={() => handleFilterChange("stoneType", st.pst_id || st.id)}
                      >
                        <SafeImage
                          src={getImageUrl(st.pst_image || st.image, "stone_type")}
                          alt={st.pst_name || st.name}
                        />
                        <span className="filter-label">{st.pst_description || st.name}</span>
                      </button>
                    ))}
                  </div>
                </AccordionShell>
              </div>

              {/* Design */}
              <div className="filter-block col-12 col-lg-3 col-md-12 col-sm-12">
                {!isMobile && <div className="filter-title">DESIGN</div>}
                <AccordionShell
                  id="design"
                  title="DESIGN"
                  isMobile={isMobile}
                  selectedLabel={selectedLabels.design}
                  openId={openId}
                  setOpenId={setOpenId}
                >
                  <div className="filter-options">
                    {data.designs.map((d) => (
                      <button
                        key={d.psg_id || d.id}
                        type="button"
                        className={
                          "filter-card" +
                          (selected.design === (d.psg_id || d.id) ? " selected" : "")
                        }
                        onClick={() => handleFilterChange("design", d.psg_id || d.id)}
                      >
                        <SafeImage
                          src={getImageUrl(d.psg_image || d.image, "style_group")}
                          alt={d.psg_name || d.name}
                        />
                        <span className="filter-label">{d.psg_name || d.name}</span>
                      </button>
                    ))}
                  </div>
                </AccordionShell>
              </div>

              {/* Stone Shape */}
              <div className="filter-block diamond-shape-im col-12 col-lg-3 col-md-12 col-sm-12">
                {!isMobile && <div className="filter-title">STONE SHAPE</div>}
                <AccordionShell
                  id="shape"
                  title="STONE SHAPE"
                  isMobile={isMobile}
                  selectedLabel={selectedLabels.shape}
                  openId={openId}
                  setOpenId={setOpenId}
                >
                  <div className="filter-options">
                    {data.shapes.map((sh) => (
                      <button
                        key={sh.id}
                        type="button"
                        className={"filter-card" + (selected.shape === sh.id ? " selected" : "")}
                        onClick={() => handleFilterChange("shape", sh.id)}
                      >
                        <SafeImage src={getImageUrl(sh.image, "shape")} alt={sh.name} />
                        <span className="filter-label">{sh.name}</span>
                      </button>
                    ))}
                  </div>
                </AccordionShell>
              </div>

              {/* Setting Style */}
              <div className="filter-block col-12 col-lg-3 col-md-12 col-sm-12">
                {!isMobile && <div className="filter-title">SETTING STYLE</div>}
                <AccordionShell
                  id="settingStyle"
                  title="SETTING STYLE"
                  isMobile={isMobile}
                  selectedLabel={selectedLabels.settingStyle}
                  openId={openId}
                  setOpenId={setOpenId}
                >
                  <div className="filter-options">
                    {data.settingStyles.map((sc) => (
                      <button
                        key={sc.psc_id || sc.id}
                        type="button"
                        className={
                          "filter-card" +
                          (selected.settingStyle === (sc.psc_id || sc.id) ? " selected" : "")
                        }
                        onClick={() => handleFilterChange("settingStyle", sc.psc_id || sc.id)}
                      >
                        <SafeImage
                          src={getImageUrl(sc.psc_image || sc.image, "style_category")}
                          alt={sc.psc_name || sc.name}
                        />
                        <span className="filter-label">{sc.psc_name || sc.name}</span>
                      </button>
                    ))}
                  </div>
                </AccordionShell>
              </div>

              {/* Metal */}
              <div className="filter-block metal-icon col-12 col-lg-3 col-md-12 col-sm-12">
                {!isMobile && <div className="filter-title">METAL</div>}
                <AccordionShell
                  id="metal"
                  title="METAL"
                  isMobile={isMobile}
                  selectedLabel={selectedLabels.metal}
                  openId={openId}
                  setOpenId={setOpenId}
                >
                  <div className="filter-options metal-label">
                    {data.metals.map((m) => (
                      <button
                        key={m.dmt_id || m.id}
                        type="button"
                        className={
                          "filter-card" +
                          (selected.metal === (m.dmt_id || m.id) ? " selected" : "")
                        }
                        onClick={() => handleFilterChange("metal", m.dmt_id || m.id)}
                        title={m.dmt_name}
                      >
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: "10px",
                            background: m.color_code,
                            boxShadow: "0 2px 10px #22305213",
                          }}
                        >
                          <span className="filter-label">{m.dmt_tooltip || m.dmt_tooltip}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </AccordionShell>
              </div>

              {/* Stone Quality */}
              <div className="filter-block diamond-q col-12 col-lg-3 col-md-12 col-sm-12">
                {!isMobile && <div className="filter-title">STONE QUALITY</div>}
                <AccordionShell
                  id="quality"
                  title="STONE QUALITY"
                  isMobile={isMobile}
                  selectedLabel={selectedLabels.quality}
                  openId={openId}
                  setOpenId={setOpenId}
                >
                  <div className="filter-options" style={{ display: "flex", flexWrap: "wrap" }}>
                    {data.qualities.map((q) => (
                      <button
                        key={q.dqg_id || q.id}
                        type="button"
                        className={
                          "filter-card" +
                          (selected.quality === (q.dqg_id || q.id) ? " selected" : "")
                        }
                        onClick={() => handleFilterChange("quality", q.dqg_id || q.id)}
                      >
                        <div className="quality-alias">{q.dqg_alias || q.name}</div>
                        <div
                          className={
                            "quality-origin " +
                            ((q.dqg_origin || q.origin) === "Lab Grown" ? "lab-grown" : "earth-mined")
                          }
                        >
                          {q.dqg_origin || q.origin}
                        </div>
                      </button>
                    ))}
                  </div>
                </AccordionShell>
              </div>

              {/* Stone Size */}
              <div className="filter-block diamond-s col-12 col-lg-3 col-md-12 col-sm-12">
                {!isMobile && (
                  <div className="filter-title">STONE SIZE ({sizeUnit.toUpperCase()})</div>
                )}
                <AccordionShell
                  id="diamondSize"
                  title={`STONE SIZE (${sizeUnit.toUpperCase()})`}
                  isMobile={isMobile}
                  selectedLabel={selectedLabels.diamondSize}
                  openId={openId}
                  setOpenId={setOpenId}
                >
                  <div className="filter-options diamond-size">
                    {data.diamondSizes.map((size) => (
                      <button
                        key={String(size)}
                        type="button"
                        className={
                          "filter-card" + (selected.diamondSize === size ? " selected" : "")
                        }
                        onClick={() => handleFilterChange("diamondSize", size)}
                      >
                        {size} {sizeUnit.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </AccordionShell>
              </div>

              {/* Ring Size — keep visible once options exist */}
              <div className="filter-block col-12 col-lg-3 col-md-12 col-sm-12 ring-size-block">
                {!isMobile && <div className="filter-title">CHOOSE RING SIZE</div>}
                <AccordionShell
                  id="ringSize"
                  title="CHOOSE RING SIZE"
                  isMobile={isMobile}
                  selectedLabel={selectedLabels.ringSize}
                  openId={openId}
                  setOpenId={setOpenId}
                >
                  <div className={`stable-wrap ${optionsLoading ? "is-loading" : ""}`}>
                    {optionsLoading && (<div className="block-overlay"><div className="spinner" /></div>)}
                    {ringOptions.length > 0 ? (
                      <select
                        value={selected.ringSize || ""}
                        className="ring-size-select"
                        onChange={(e) => handleFilterChange("ringSize", Number(e.target.value))}
                      >
                        {ringOptions.map((opt) => (
                          <option key={opt.value_id} value={opt.value_id}>{opt.value_name}</option>
                        ))}
                      </select>
                    ) : (
                      <select className="ring-size-select" disabled>
                        <option>Loading…</option>
                      </select>
                    )}
                  </div>
                </AccordionShell>
              </div>


              {/* PRODUCT DETAILS / ACTIONS */}

             {/* PRODUCT DETAILS / ACTIONS */}
<div className="product-details col-12 col-lg-6 col-md-12 col-sm-12 filter-block">
  <div className={`stable-wrap ${productLoading ? "is-loading" : ""}`}>
    {productLoading && (
      <div className="block-overlay">
        <div className="spinner" />
      </div>
    )}

    {product ? (
      <div className="detail">
        <div className="box-grey table-responsive">
          <main className="wrap">
            <section className="selection-card" role="region" aria-labelledby="ys-title">
              <header className="card-head">
                <h2 id="ys-title" className="card-title">YOUR SELECTION</h2>
                <span className="order-no">#{product.products_style_no || "--"}</span>
              </header>

              <div className="pillbar" aria-label="Key attributes">
                {/* Color/Clarity */}
                <div className="pill" aria-label="Color and clarity">
                  <strong>{product.dqg_alias || "--"}</strong>
                  <span className="sub">{product.center_stone_name || "--"}</span>
                </div>

                {/* Ring Size */}
                <div className="pill small" aria-label="Ring size">
                  <strong>Ring Size:</strong>
                  <span>
                    {ringOptions.find((o) => o.value_id === selected.ringSize)?.value_name || "--"}
                  </span>
                </div>

                {/* Est Carat */}
                <div className="pill" aria-label="Estimated carat weight">
                  <strong>Est. Carat Wt*</strong>
                  <span className="sub l-pill">
                    {estCaratWt !== null
                      ? Number(estCaratWt).toFixed(2)
                      : product.total_carat_weight || "--"}{" "}
                    CT [+/− 5%]
                  </span>
                </div>

                {/* Est Pcs */}
                <div className="pill small" aria-label="Estimated diamond pieces">
                  <strong>Est. Diamond Pcs*:</strong>
                  <span>{estDiamondPcs !== null ? estDiamondPcs : product.estimated_pcs || "--"}</span>
                </div>

                {/* PRICE */}
                <div className="pill price" aria-label="Price">
                  {(() => {
                    if (!isAuthenticated) {
                      return (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            redirectToLogin();
                          }}
                          className="btn btn-link p-0 d-flex align-items-center gap-2 text-uppercase"
                        >                          
                          <span>Login to view price</span>
                        </button>
                      );
                    }

                    const base =
                      estPrice !== null
                        ? Number(estPrice)
                        : Number(
                            product?.products_price ??
                              product?.base_price ??
                              product?.products_price1 ??
                              NaN
                          );

                    if (Number.isNaN(base)) return <>$ --</>;

                    const tariffPer = Number(product?.tariff_per ?? 0);
                    const regularConverted = convertCurrency(base);

                    if (tariffPer > 0) {
                      const withTariff = Math.round(base * ((100 + tariffPer) / 100));
                      const withTariffConverted = convertCurrency(withTariff);
                      return (
                        <div className="price-grid">
                          <div className="price-item">
                            <div className="price-row">
                              <span className="label">Regular Price</span>
                              <span className="value">${money0(regularConverted)}</span>
                            </div>
                          </div>
                          <div className="price-item right">
                            <div className="price-row">
                              <span className="label">With {money0(tariffPer)}% Tariff</span>
                              <span className="value">${money0(withTariffConverted)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return <>$ {money0(regularConverted)}</>;
                  })()}
                </div>

              </div>

              {/* Details grid */}
              <div className="details">
                <div className="kv">
                  <div className="k">Metal</div>
                  <div className="v">{product.metal_name || "--"}</div>
                </div>
                <div className="kv">
                  <div className="k">Design</div>
                  <div className="v">{product.style_group_name || "--"}</div>
                </div>
                <div className="kv">
                  <div className="k">Setting Style</div>
                  <div className="v">{product.style_category_name || "--"}</div>
                </div>
                <div className="kv">
                  <div className="k">Stone Shape</div>
                  <div className="v">{product.diamond_shape_name || "--"}</div>
                </div>
                <div className="kv">
                  <div className="k">Stone Size</div>
                  <div className="v">
                    {selected.diamondSize != null
                      ? `${selected.diamondSize} ${sizeUnit.toUpperCase()}`
                      : product.diamond_size || `${product.total_carat_weight || "--"} CT (Each)`}
                  </div>
                </div>
                <div className="kv">
                  <div className="k">Stone Type</div>
                  <div className="v">{product.stone_type_name || "--"}</div>
                </div>
              </div>

              <p className="note">
                *customization may cause some variation in final product.
              </p>
            </section>
          </main>
        </div>
      </div>
    ) : (
      // skeleton shell to preserve height
      <div className="selection-card box-grey" />
    )}
  </div>
</div>

<div className="col-12 col-lg-3 col-md-12 col-sm-12 filter-block">
  <div className={`stable-wrap ${productLoading ? "is-loading" : ""}`}>
    {productLoading && (
      <div className="block-overlay">
        <div className="spinner" />
      </div>
    )}

    {product ? (
      <>
        <div className="band-heading-type">
          <p className="product-description__title detail-three stud-para">
            <a
              id="product-title-link"
              href={`https://www.amipi.com/${product.products_seo_url || ""}`}
              target="_blank"
              rel="noreferrer"
              style={{ cursor: "pointer" }}
            >
              {product.products_blurb || "--"}
            </a>
          </p>
          <p className="stud-subtitle">{product.products_description || "--"}</p>
        </div>

        <div className="d-flex c_flex_box justify-content-center">
          <div className="col-xs-12 col-sm-12 product-description-variation-details-action stud-action-filter">
            <ul className="action product-d-action">
              {/* View details */}
             
              <li className="common-btn svg-design">
                <a
                  href={`https://www.amipi.com/${product.products_seo_url || ""}`}
                  target="_blank"
                  rel="noreferrer"
                  title="View Full Details"
                >
                 
                  <div className="band-cart-btn">
                  
                    <i className="fa fa-cog" aria-hidden="true"></i> 
                 
                  </div>
                </a>
              </li>
            

              {/* Share (opens modal) */}
               <li
                className="common-btn"
                style={{ cursor: "pointer" }}
                title="Share With A Friend"
                onClick={() => setShareOpen(true)}
              >
                <i className="fa fa-share-alt" aria-hidden="true"></i>
              </li> 

              {/* Wishlist */}
               <li
                  className="common-btn"
                  title={isWishlisted ? "Remove From Wishlist" : "Add to Wishlist"}
                  style={{ cursor: wishLoading ? "wait" : "pointer" }}
                >
                  {(() => {
                    if (!isAuthenticated) {
                      // 🔒 Guest user — show redirect button
                      return (
                        <button
                          type="button"
                          onClick={() => (redirectToLogin())}
                          disabled={wishLoading}
                          className="btn btn-link p-0"
                          style={{ textTransform: "uppercase" }}
                        >
                          <i className="fa fa-heart" aria-hidden="true" /> 
                        </button>
                      );
                    } else {
                      // ✅ Logged-in user — show normal wishlist toggle
                      return (
                        <button
                          type="button"
                          onClick={handleWishlistToggle}
                          disabled={wishLoading}
                          className="btn btn-link p-0"
                          aria-pressed={isWishlisted}
                          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                        >
                          <i
                            className="fa fa-heart"
                            aria-hidden="true"
                            style={{ color: isWishlisted ? "#e74c3c" : "#2c3b5b" }}
                          />
                        </button>
                      );
                    }
                  })()}
                </li>


              {/* Compare */}
              {/* <li
                className="AddCompareButtClass wishlist-btn common-btn"
                title={isCompared ? "Remove From Compare" : "Add to Compare"}
                style={{ cursor: comparLoading ? "wait" : "pointer" }}
              >
                <button
                  type="button"
                  onClick={handleCompareToggle}
                  disabled={comparLoading}
                  className="btn btn-link p-0"
                  aria-pressed={isCompared}
                  aria-label={isCompared ? "Remove from compare" : "Add to compare"}
                >
                  <i
                    className="fa fa-compress"
                    aria-hidden="true"
                    style={{ color: isCompared ? "#e74c3c" : "#2c3b5b" }}
                  />
                </button>
              </li> */}

              {/* Cart */}
               
               <li
                  className="hover-none"
                  title={isInCart ? "Remove From Cart" : "Add to Cart"}
                  style={{ cursor: cartLoading ? "wait" : "pointer" }}
                >
                  <div className="band-cart-btn">
                    {(() => {
                      if (!isAuthenticated) {
                        // 🔒 Guest user — show login redirect button
                        return (
                          <button
                            type="button"
                            onClick={() => (redirectToLogin())}
                            className="common-btn band-cart"                            
                          >
                            <i className="fa fa-shopping-cart" aria-hidden="true" />{" "}
                            Add to Cart
                          </button>
                        );
                      } else {
                        // ✅ Logged-in user — show normal Add/Remove button
                        return (
                          <button
                            type="button"
                            onClick={handleCartToggle}
                            disabled={cartLoading}
                            className="common-btn band-cart"
                            aria-pressed={isInCart}
                            aria-label={isInCart ? "Remove from cart" : "Add to cart"}
                          >
                            <i
                              className="fa fa-shopping-cart"
                              aria-hidden="true"
                              style={{ color: isInCart ? "#e74c3c" : "#Fed700" }}
                            />{" "}
                            {isInCart ? "Remove From Cart" : "Add To Cart"}
                          </button>
                        );
                      }
                    })()}
                  </div>
                </li>
            </ul>
          </div>
        </div>
      </>
    ) : (
      // skeleton shell to preserve height
      <div className="band-heading-type" />
    )}
  </div>
</div>



              </div>
          </div>
        </div>
      </div>
      <Footer />

      {showNavPopup && navPopup.text
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Page notice"
              onClick={handleCloseNavPopup}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,.55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9998,
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: "#fff",
                  borderRadius: 10,
                  boxShadow: "0 14px 40px rgba(0,0,0,.25)",
                  padding: "26px 28px",
                  maxWidth: "92vw",
                  width: 520,
                  color: "#223052",
                  position: "relative",
                }}
              >
                <button
                  type="button"
                  aria-label="Close notice"
                  onClick={handleCloseNavPopup}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: 10,
                    background: "transparent",
                    border: 0,
                    fontSize: 22,
                    color: "#94a0b3",
                    cursor: "pointer",
                  }}
                >
                  &times;
                </button>
                {navPopup.title ? (
                  <h2 style={{ margin: "0 0 10px", fontWeight: 700 }}>
                    {navPopup.title}
                  </h2>
                ) : null}
                <div
                  style={{ fontSize: 15, lineHeight: 1.5 }}
                  dangerouslySetInnerHTML={{ __html: navPopup.text }}
                />
              </div>
            </div>,
            document.body
          )
        : null}

      {/* Share modal */}
      {shareOpen && (
        <ShareProductModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          productId={product?.products_id}
          optionId={selected.ringSize}
          productTitle={product?.products_name || ""}
          productUrl={`https://www.amipi.com/${product?.products_seo_url || ""}`}
          productImage={
            Array.isArray(product?.images) && product.images[0]
              ? toAbsoluteMediaUrl("image", product.images[0])
              : ""
          }
          authUser={null}
        />
      )}

       {/* Login modal */}
      {loginOpen && (
        <LoginModal
          open={loginOpen}
          onClose={() => setLoginOpen(false)}
          onSuccess={() => {
            setLoginOpen(false);
            setAuthVersion((v) => v + 1); // re-render to reveal price
          }}
        />
      )}
      
    </div>
  );
};


function LoginModal({ open, onClose, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [jump, setJump] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  

 async function handleLogin(e) {
  e.preventDefault();
  setLoading(true);
  setError("");

  try {
    const payload = {
      login_uname: email.trim(),
      login_pass: password,
      jump_to: jump || undefined,
    };

    const { data } = await apiSession.post("api/login", payload, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      withCredentials: true // Required for cookie session
    });

    if (data?.status === "success" && data?.user) {
      // ✅ No need to manually check for amipi_sso cookie
      localStorage.setItem("amipiUser", JSON.stringify(data.user));
      onSuccess?.(data.user);
    } else {
      setError(data?.message || "Login failed");
    }
  } catch (err) {
    console.error("Login error:", err);
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      "Login failed. Please check credentials.";
    setError(msg);
  } finally {
    setLoading(false);
  }
}


  return createPortal(
    <div
      aria-modal="true"
      role="dialog"
      aria-label="Login"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.6)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560, maxWidth: "92vw", background: "#fff", borderRadius: 6,
          boxShadow: "0 12px 32px rgba(0,0,0,.25)", overflow: "hidden"
        }}
      >
        <div style={{ padding: "26px 28px 10px" }}>
          <h2 style={{ margin: 0, fontWeight: 700, color: "#223052", textAlign: "center" }}>
            WELCOME <span style={{ fontWeight: 400 }}>TO AMIPI</span>
          </h2>
          <p style={{ margin: "8px 0 18px", textAlign: "center", color: "#666" }}>
            Please login to view prices
          </p>

          <form onSubmit={handleLogin}>
            <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 6 }}>EMAIL</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email ID"
              style={{ width: "100%", height: 38, padding: "0 10px", border: "1px solid #d7dbe6", borderRadius: 4 }}
            />

            <label style={{ display: "block", fontSize: 12, color: "#555", margin: "12px 0 6px" }}>PASSWORD</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="*****"
              style={{ width: "100%", height: 38, padding: "0 10px", border: "1px solid #d7dbe6", borderRadius: 4 }}
            />

            <label style={{ display: "block", fontSize: 12, color: "#555", margin: "12px 0 6px" }}>JUMP TO</label>
            <select
              value={jump}
              onChange={(e) => setJump(e.target.value)}
              style={{ width: "100%", height: 38, padding: "0 10px", border: "1px solid #d7dbe6", borderRadius: 4 }}
            >
              <option value="">Select</option>
              <option value="bands">Bands</option>
              <option value="diamonds">Diamonds</option>
            </select>

            {error && (
              <div style={{ color: "#b00020", marginTop: 10, fontSize: 14 }}>{error}</div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "center" }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  minWidth: 110, height: 36, borderRadius: 4, border: 0,
                  background: "#2c3b5b", color: "#fff", fontWeight: 600, cursor: loading ? "wait" : "pointer"
                }}
              >
                {loading ? "Logging in…" : "LOGIN"}
              </button>
              <a href="/forgot-password" style={{ minWidth: 150, height: 36, lineHeight: "36px", textAlign: "center",
                borderRadius: 4, border: "1px solid #d7dbe6", color: "#2c3b5b", textDecoration: "none", fontWeight: 600 }}>
                FORGOT PASSWORD
              </a>
              <a href="/register" style={{ minWidth: 120, height: 36, lineHeight: "36px", textAlign: "center",
                borderRadius: 4, border: "1px solid #d7dbe6", color: "#2c3b5b", textDecoration: "none", fontWeight: 600 }}>
                NEW USER
              </a>
            </div>
          </form>
        </div>

        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            position: "absolute", right: 10, top: 10, border: 0,
            background: "transparent", fontSize: 24, color: "#99a2b3", cursor: "pointer"
          }}
        >
          ×
        </button>
      </div>
    </div>,
    document.body 
  );
}


export default Bands;




