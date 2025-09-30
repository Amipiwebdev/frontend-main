// src/components/Bracelets.jsx
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Header from "./common/Header";
import Footer from "./common/Footer";
import Topbar from "./common/Topbar";
import { api } from "../apiClient"; // axios instance with baseURL
import ShareProductModal from "./share/ShareProductModal"; // NEW

const SEO_URL = "br-test";

/* ------------------------------------------------------------------ */
/*                              Helpers                                */
/* ------------------------------------------------------------------ */

/** Read customer/retailer ids from globals or localStorage so we can
 *  send them along with wishlist/compare/cart requests. Falls back to 0. */
function getClientIds() {
  let customers_id = 0;
  let parent_retailer_id = 0;
  try {
    const g = window.AMIPI_FRONT || window.AMIPI || window.__AMIPI__ || {};
    customers_id =
      Number(g.CUST_ID ?? g.customer_id ?? g.customers_id ?? 0) || 0;
    parent_retailer_id =
      Number(g.ParentRetailerID ?? g.parent_retailer_id ?? 0) || 0;

    // Also allow storing after login
    if (!customers_id) {
      const ls = JSON.parse(localStorage.getItem("amipi_auth") || "{}");
      customers_id = Number(ls.customers_id ?? ls.customer_id ?? 0) || 0;
      parent_retailer_id = Number(ls.parent_retailer_id ?? 0) || 0;
    }
  } catch (_) {}
  return { customers_id, parent_retailer_id };
}

// NEW — pricing context you previously had in PHP sessions
function getPricingParams() {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("amipiUser") || "null");
  } catch {}

  const g = window.AMIPI_FRONT || window.AMIPI || window.__AMIPI__ || {};

  const customers_id =
    Number(
      (user && (user.customer_id ?? user.customers_id)) ??
        g.customers_id ??
        g.customer_id ??
        0
    ) || 0;

  const AMIPI_FRONT_Retailer_Jewelry_Level =
    Number(g.AMIPI_FRONT_Retailer_Jewelry_Level ?? user?.retailer_level_id ?? 3) || 3;

  const AMIPI_FRONT_RetailerProductFlat =
    Number(g.AMIPI_FRONT_RetailerProductFlat ?? 0) || 0;
  const AMIPI_FRONT_RetailerProductPer =
    Number(g.AMIPI_FRONT_RetailerProductPer ?? 0) || 0;

  const AMIPI_FRONT_IS_REATILER =
    (g.AMIPI_FRONT_IS_REATILER ??
      (user?.retailer_level_id > 0 ? "Yes" : "No")) === "Yes"
      ? "Yes"
      : "No";

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

// stub for ConverRelatedCurrencyPrice(...) — customize if you already keep a rate
const convertCurrency = (v) => {
  // If you already have a currency rate, use it here.
  // Example:
  // const rate = Number((window.AMIPI_FRONT || {}).currency_rate ?? 1);
  // return v * rate;
  return Number(v || 0);
};


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

  // Build padded slides so there's never an empty slide
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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"> <path d="M320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576zM199 303L279 223C288.4 213.6 303.6 213.6 312.9 223C322.2 232.4 322.3 247.6 312.9 256.9L273.9 295.9L424 295.9C437.3 295.9 448 306.6 448 319.9C448 333.2 437.3 343.9 424 343.9L273.9 343.9L312.9 382.9C322.3 392.3 322.3 407.5 312.9 416.8C303.5 426.1 288.3 426.2 279 416.8L199 336.8C189.6 327.4 189.6 312.2 199 302.9z"/></svg>
          </button>
          <button
            type="button"
            aria-label="Next images"
            onClick={() => setIdx((i) => (i + 1) % total)}
            className="next-btn"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"> <path d="M320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576zM361 417C351.6 426.4 336.4 426.4 327.1 417C317.8 407.6 317.7 392.4 327.1 383.1L366.1 344.1L216 344.1C202.7 344.1 192 333.4 192 320.1C192 306.8 202.7 296.1 216 296.1L366.1 296.1L327.1 257.1C317.7 247.7 317.7 232.5 327.1 223.2C336.5 213.9 351.7 213.8 361 223.2L441 303.2C450.4 312.6 450.4 327.8 441 337.1L361 417.1z"/></svg>
          </button>
        </>
      )}
    </div>
  );
}

/* -------------------- Mobile Tabs helper (UI only) -------------------- */
function MobileTabs({ active, onChange }) {
  const tabs = [
    { key: "stoneType", label: "Stone Type" },
    { key: "design", label: "Design" },
    { key: "shape", label: "Stone Shape" },
    { key: "settingStyle", label: "Setting Style" },
    { key: "metal", label: "Metal" },
    { key: "quality", label: "Stone Quality" },
    { key: "diamondSize", label: "Stone Size" },
  ];

  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          .mobile-tabs {
            position: sticky;
            top: 0;
            z-index: 20;
            background: #fff;
            padding: 8px 12px;
            margin: -8px -12px 12px;
            overflow-x: auto;
            border-bottom: 1px solid #eef0f5;
          }
          .mobile-tabs .tab-btn {
            white-space: nowrap;
            border: 1px solid #dfe3ee;
            padding: 6px 10px;
            border-radius: 20px;
            background: #fff;
            font-size: 13px;
            line-height: 1;
            margin-right: 8px;
          }
          .mobile-tabs .tab-btn.active {
            background: #223052;
            color: #fff;
            border-color: #223052;
          }
        }
      `}</style>

      <div className="mobile-tabs d-flex align-items-center">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`tab-btn ${active === t.key ? "active" : ""}`}
            onClick={() => onChange(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </>
  );
}

/* ===================================================================== */
/*                               MAIN PAGE                               */
/* ===================================================================== */

const Bracelets = () => {
  const [pageTitle, setPageTitle] = useState("Bracelets");

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

  // --------- Mobile tabs state (UI only) ----------
    const [isMobile, setIsMobile] = useState(false);
    const [activeTab, setActiveTab] = useState("stoneType");

  // Detect <768px for tabs UI
    useEffect(() => {
      const apply = () => setIsMobile(window.innerWidth < 768);
      apply();
      window.addEventListener("resize", apply);
      return () => window.removeEventListener("resize", apply);
    }, []);
    const hideIfNotActive = (key) =>
      isMobile && activeTab !== key ? { display: "none" } : undefined;

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

      setPageTitle(nav.category_navigation_title || "Bracelets");

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

  /* Decide size unit (ct/mm) from stone type. Fallback: Diamonds => ct; others => mm */
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

  /* 7) Quality => Stone Size (dynamic values from weight or mm) */
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
          unit: sizeUnit, // optional backend hint
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

  /* 8) Stone Size => Product (include vendors CSV + pricing) */
  useEffect(() => {
    if (
      !selected.stoneType ||
      !selected.design ||
      !selected.shape ||
      !selected.settingStyle ||
      !selected.metal ||
      !selected.quality ||
      !selected.diamondSize
    ) {
      setProduct(null);
      setRingOptions([]);
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
      unit: sizeUnit,
      vendors: vendorParam || "",
      ...pricing,
    };

    api.get(`/productnew`, { params }).then((res) => setProduct(res.data));
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

  /* 9) Product => Ring options */
  useEffect(() => {
    if (!product?.products_id) {
      setRingOptions([]);
      setSelected((sel) => ({ ...sel, ringSize: null }));
      return;
    }
    api.get(`/product-options/${product.products_id}`).then((res) => {
      const opts = res.data || [];
      setRingOptions(opts);
      setSelected((sel) => {
        const found = opts.find((x) => x.value_id === sel.ringSize);
        return {
          ...sel,
          ringSize: found ? found.value_id : opts?.[0]?.value_id || null,
        };
      });
    });
  }, [product?.products_id]);

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

  /* -------------------- Wishlist -------------------- */
  useEffect(() => {
    if (!product?.products_id) {
      setIsWishlisted(false);
      return;
    }
    const { customers_id, parent_retailer_id } = getClientIds();
    api
      .get("/wishlist/check", {
        params: {
          products_id: product.products_id,
          customers_id,
          parent_retailer_id,
        },
      })
      .then((res) => setIsWishlisted(Boolean(res.data?.wishlisted)))
      .catch(() => setIsWishlisted(false));
  }, [product?.products_id]);

  async function handleWishlistToggle() {
    const pricing = getPricingParams();
    if (!product?.products_id || wishLoading) return;
    const { customers_id, parent_retailer_id } = getClientIds();
    try {
      setWishLoading(true);
      const { data } = await api.post("/wishlist/toggle", {
        products_id: product.products_id,
        customers_id,
        parent_retailer_id,
        ...pricing,
      });
      setIsWishlisted(data?.status === "added");
    } catch (e) {
      console.error("Wishlist toggle failed", e);
    } finally {
      setWishLoading(false);
    }
  }

  /* -------------------- Compare -------------------- */
  useEffect(() => {
    if (!product?.products_id) {
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
  }, [product?.products_id]);

  async function handleCompareToggle() {
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
    if (!product?.products_id) {
      setIsInCart(false);
      return;
    }
    const { customers_id, parent_retailer_id } = getClientIds();
    api
      .get("/cartcheck", {
        params: {
          products_id: product.products_id,
          customers_id,
          parent_retailer_id,
        },
      })
      .then((res) => setIsInCart(Boolean(res.data?.in_cart)))
      .catch(() => setIsInCart(false));
  }, [product?.products_id]);

  async function handleCartToggle() {
    const pricing = getPricingParams();
    if (!product?.products_id || cartLoading) return;
    const { customers_id, parent_retailer_id } = getClientIds();
    try {
      setCartLoading(true);
      const { data } = await api.post("/carttoggle", {
        products_id: product.products_id,
        customers_id,
        parent_retailer_id,
        ...pricing,
      });
      setIsInCart(data?.status === "added");
    } catch (e) {
      console.error("Cart toggle failed", e);
    } finally {
      setCartLoading(false);
    }
  }

  /* ------------------------------------------------------------------ */
  /*                               Render                                */
  /* ------------------------------------------------------------------ */

  return (
    <div>
      <Topbar />
      <Header />
      <div className="custom-container">
        <div className="row">
          <div className="col-12">
            <h1>{pageTitle}</h1>
          </div>

          <div className="main-content flex-wrap d-flex align-items-start p-0">
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
              <div className="filter-block stone-type col-12 col-lg-6 col-md-12 col-sm-12"
              style={hideIfNotActive("stoneType")}
              >
                <div className="filter-title">STONE TYPE</div>
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
              </div>

              {/* Design */}
              <div className="filter-block col-12 col-lg-3 col-md-12 col-sm-12"
               style={hideIfNotActive("design")}
              >
                <div className="filter-title">DESIGN</div>
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
              </div>

              {/* Stone Shape */}
              <div className="filter-block diamond-shape-im col-12 col-lg-3 col-md-12 col-sm-12"
              style={hideIfNotActive("shape")}
              >
                <div className="filter-title">STONE SHAPE</div>
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
              </div>

              {/* Setting Style */}
              <div className="filter-block col-12 col-lg-3 col-md-12 col-sm-12"
              style={hideIfNotActive("settingStyle")}
              >
                <div className="filter-title">SETTING STYLE</div>
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
              </div>

              {/* Metal */}
              <div className="filter-block metal-icon col-12 col-lg-3 col-md-12 col-sm-12"
               style={hideIfNotActive("metal")}
              >
                <div className="filter-title">METAL</div>
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
              </div>

              {/* Stone Quality */}
              <div className="filter-block diamond-q col-12 col-lg-3 col-md-12 col-sm-12"
               style={hideIfNotActive("quality")}
              >
                <div className="filter-title">STONE QUALITY</div>
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
              </div>

              {/* Stone Size */}
              <div className="filter-block diamond-s col-12 col-lg-3 col-md-12 col-sm-12"
               style={hideIfNotActive("diamondSize")}
              >
                <div className="filter-title">STONE SIZE ({sizeUnit.toUpperCase()})</div>
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
              </div>

              {/* Ring Size */}
              {ringOptions.length > 0 && (
                <div className="filter-block col-12 col-lg-3 col-md-12 col-sm-12">
                  <div className="filter-title">CHOOSE RING SIZE</div>
                  <select
                    value={selected.ringSize || ""}
                    className="ring-size-select"
                    onChange={(e) => handleFilterChange("ringSize", Number(e.target.value))}
                  >
                    {ringOptions.map((opt) => (
                      <option key={opt.value_id} value={opt.value_id}>
                        {opt.value_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* PRODUCT DETAILS / ACTIONS */}
              {product ? (
                <>
                  <div className="product-details col-12 col-lg-6 col-md-12 col-sm-12 filter-block">
                    <div className="detail">
                      <div className="box-grey table-responsive">
                        <main className="wrap">
                          <section className="selection-card" role="region" aria-labelledby="ys-title">
                            <header className="card-head">
                              <h2 id="ys-title" className="card-title">
                                YOUR SELECTION
                              </h2>
                              <span className="order-no">#{product.products_style_no || "--"}</span>
                            </header>

                            <div className="pillbar" aria-label="Key attributes">
                              <div className="pill" aria-label="Color and clarity">
                                <strong>{product.dqg_alias || "--"}</strong>
                                <span className="sub">{product.center_stone_name || "--"}</span>
                              </div>
                              <div className="pill small" aria-label="Ring size">
                                <strong>Ring Size:</strong>
                                <span>
                                  {ringOptions.find((o) => o.value_id === selected.ringSize)
                                    ?.value_name || "--"}
                                </span>
                              </div>
                              <div className="pill" aria-label="Estimated carat weight">
                                <strong>Est. Carat Wt*</strong>
                                <span className="sub l-pill">
                                  {estCaratWt !== null
                                    ? Number(estCaratWt).toFixed(2)
                                    : product.total_carat_weight || "--"}{" "}
                                  CT [+/− 5%]
                                </span>
                              </div>
                              <div className="pill small" aria-label="Estimated diamond pieces">
                                <strong>Est. Diamond Pcs*:</strong>
                                <span>
                                  {estDiamondPcs !== null ? estDiamondPcs : product.estimated_pcs || "--"}
                                </span>
                              </div>
                              {/* PRICE (regular + tariff) */}
<div className="pill price" aria-label="Price">
  {(() => {
    // base price = your computed estPrice (includes ring-size option math)
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

    // tariff percent (from API, e.g. product.tariff_per)
    const tariffPer = Number(product?.tariff_per ?? 0);

    // Convert like your PHP ConverRelatedCurrencyPrice(...)
    const regularConverted = convertCurrency(base);

    if (tariffPer > 0) {
      const withTariff = Math.round(base * ((100 + tariffPer) / 100));
      const withTariffConverted = convertCurrency(withTariff);

      return (
        <div className="price-stack">
          <div className="price-row">
            <span className="label">Regular Price</span>
            <span className="value">${money0(regularConverted)}</span>
          </div>
          <div className="price-row tariff">
            <span className="label">With {money0(tariffPer)}% Tariff</span>
            <span className="value">${money0(withTariffConverted)}</span>
          </div>
        </div>
      );
    }

    // no tariff => show single price (your current behavior)
    return (
      <>
        $ {money0(regularConverted)}
      </>
    );
  })()}
</div>
                            </div>

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
                                    : product.diamond_size ||
                                      `${product.total_carat_weight || "--"} CT (Each)`}
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
                  </div>

                  <div className="col-12 col-lg-3 col-md-12 col-sm-12 filter-block">
                    <div className="band-heading-type">
                      <p className="product-description__title detail-three stud-para">
                        <a
                          id="product-title-link"
                          href={`https://www.amipi.com/${product.products_seo_url || ""}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ cursor: "pointer" }}
                        >
                          {product.products_name || "--"}
                        </a>
                      </p>
                      <p className="stud-subtitle">{product.products_description || "--"}</p>
                    </div>

                    <div className="d-flex c_flex_box">
                      <div className="col-xs-12 col-sm-12 product-description-variation-details-action stud-action-filter">
                        <ul className="action product-d-action">
                          <li className="common-btn svg-design">
                            <a
                              href={`https://www.amipi.com/${product.products_seo_url || ""}`}
                              target="_blank"
                              rel="noreferrer"
                              title="View Full Details"
                            >
                              <i className="fa fa-cog" aria-hidden="true"></i>
                            </a>
                          </li>

                          {/* SHARE */}
                          <li
                            className="common-btn"
                            style={{ cursor: "pointer" }}
                            title="Share With A Friend"
                            onClick={() => setShareOpen(true)}
                          >
                            <i className="fa fa-share-alt" aria-hidden="true"></i>
                          </li>

                          {/* Wishlist toggle */}
                          <li
                            className="common-btn"
                            title={isWishlisted ? "Remove From Wishlist" : "Add to Wishlist"}
                            style={{ cursor: wishLoading ? "wait" : "pointer" }}
                          >
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
                          </li>

                          {/* Compare toggle */}
                          <li
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
                          </li>

                          {/* Cart toggle */}
                          <li
                            className="hover-none"
                            title={isInCart ? "Remove From Cart" : "Add to Cart"}
                            style={{ cursor: cartLoading ? "wait" : "pointer" }}
                          >
                            <div className="band-cart-btn">
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
                                Add To Cart
                              </button>
                            </div>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ padding: 24, color: "#888" }}>No product found.</div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />

      {/* Share modal mounted at the end so it overlays everything */}
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
          authUser={null} // will read from localStorage if present
        />
      )}
    </div>
  );
};

export default Bracelets;
