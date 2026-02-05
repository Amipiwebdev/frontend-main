import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../common/Header";
import Footer from "../common/Footer";
import { api, apiSession } from "../../apiClient";
import { useAuth } from "../../auth.jsx";
import ShareProductModal from "../share/ShareProductModal.jsx";
import "./jewelryDetails.scss";

const SHAPE_ICONS = {
  Round: "src/assets/shapes/round.png",
  Oval: "src/assets/shapes/oval.svg",
  Emerald: "src/assets/shapes/emerald.svg",
  Princess: "src/assets/shapes/princess.svg",
};

const FALLBACK_MEDIA_IMAGE = `${import.meta.env.BASE_URL}images/image-not-availbale.jpg`;
const VIDEO_THUMB_ICON = `${import.meta.env.BASE_URL}images/videoplay.png`;

const PROMO_BADGE_RULES = [
  { keys: ["best", "best sellers"], file: "promotion-best.png", title: "Best Sellers" },
  { keys: ["cl", "closeouts/clearance"], file: "promotion-cl.png", title: "Closeouts/Clearance" },
  { keys: ["hot"], file: "promotion-hot.png", title: "Hot" },
  { keys: ["superdeal"], file: "superdeal.png", title: "Superdeal" },
  { keys: ["new"], file: "promotion-new.png", title: "New" },
  { keys: ["ltd"], file: "promotion-ltd.png", title: "Ltd" },
  { keys: ["sale"], file: "promotion-sale.png", title: "Sale" },
  { keys: ["aict"], file: "act_img.png", title: "Actual" },
];

const pickPromotionBadge = (product) => {
  if (!product) return null;

  const promo = (product.product_promotion ?? "").toString().trim();

  if (promo) {
    const tokens = promo
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    for (const token of tokens) {
      for (const rule of PROMO_BADGE_RULES) {
        if (rule.keys.includes(token)) return rule;
      }
    }
  }

  // fallback like old PHP
  if (Number(product.is_superdeals) === 1) {
    return { file: "superdeal.png", title: "Superdeal" };
  }
  if (Number(product.is_new) === 1) {
    return { file: "new.png", title: "New" };
  }
  return null;
};

const hasPromotionToken = (product, token) => {
  if (!product) return false;
  const promo = (product.product_promotion ?? "").toString().trim();
  if (!promo) return false;
  const target = token.toLowerCase();
  return promo
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .includes(target);
};

const CUSTOM_OPTIONS = [];

const FALLBACK_FILTER_VALUES = {
  diamond_weight_groups: [],
  shapes: [],
  metal_types: [],
  origins: [],
  diamond_qualities: [],
  ring_sizes: CUSTOM_OPTIONS.map((value) => ({ value_id: value, value_name: value })),
};

const FILTER_GROUPS = [
  { key: "shape", label: "Shape", sourceKey: "shapes" },
  { key: "diamondWeight", label: "Stone Weight", sourceKey: "diamond_weight_groups" },
  { key: "metalType", label: "Metal Type", sourceKey: "metal_types" },
  { key: "diamondOrigin", label: "Diamond Origin", sourceKey: "origins" },
  { key: "diamondQuality", label: "Quality", sourceKey: "diamond_qualities" },
];

const LOGIN_HOST_URL = "https://www.amipi.com/bands";
const buildLoginUrl = (returnUrl) =>
  `${LOGIN_HOST_URL}?redirect=${encodeURIComponent(returnUrl)}`;

const normalizeSeoPath = (seoUrl) => {
  if (!seoUrl) return "";
  let path = String(seoUrl).trim();
  if (!path) return "";
  path = path.replace(/^https?:\/\/[^/]+/i, "");
  path = path.split("?")[0].split("#")[0];
  path = path.replace(/^\/+/, "").replace(/\/+$/, "");
  if (path.toLowerCase().startsWith("details/")) {
    path = path.slice("details/".length);
  }
  if (!path) return "";
  return path.includes("/") ? path : `jewelry/${path}`;
};

const normalizeOptionText = (input) => {
  if (input === undefined || input === null) return "";
  if (typeof input === "string" || typeof input === "number" || typeof input === "boolean") {
    return String(input);
  }
  if (Array.isArray(input)) {
    for (const entry of input) {
      const text = normalizeOptionText(entry);
      if (text) return text;
    }
    return "";
  }
  if (typeof input === "object") {
    const candidates = [
      input.label,
      input.name,
      input.title,
      input.value_name,
      input.value,
      input.diamond_quality,
      input.quality,
      input.display_name,
      input.display,
      input.text,
    ];
    for (const candidate of candidates) {
      const text = normalizeOptionText(candidate);
      if (text) return text;
    }
    if ("min" in input || "max" in input || "from" in input || "to" in input) {
      const minText = normalizeOptionText(input.min ?? input.from);
      const maxText = normalizeOptionText(input.max ?? input.to);
      if (minText || maxText) return [minText, maxText].filter(Boolean).join(" - ");
    }
  }
  return "";
};

const normalizeOptionValue = (input) => {
  if (input === undefined || input === null) return undefined;
  if (typeof input === "string" || typeof input === "number") return input;
  if (Array.isArray(input)) {
    for (const entry of input) {
      const value = normalizeOptionValue(entry);
      if (value !== undefined && value !== "") return value;
    }
    return undefined;
  }
  if (typeof input === "object") {
    const candidate =
      input.value_id ??
      input.id ??
      input.diamond_quality_id ??
      input.quality_id ??
      input.key ??
      input.code ??
      input.value;
    const value = normalizeOptionValue(candidate);
    if (value !== undefined && value !== "") return value;
  }
  const text = normalizeOptionText(input);
  return text === "" ? undefined : text;
};

const toOptionList = (list, fallback = []) => {
  const src = Array.isArray(list) && list.length ? list : fallback;
  return src.map((item) => {
    if (item && typeof item === "object") {
      const value = normalizeOptionValue(
        item.value_id ??
          item.id ??
          item.diamond_quality_id ??
          item.quality_id ??
          item.value ??
          item.value_name ??
          item.label ??
          item.name ??
          item
      );
      const label =
        normalizeOptionText(
          item.value_name ??
            item.label ??
            item.name ??
            item.title ??
            item.diamond_quality ??
            item.quality
        ) ||
        normalizeOptionText(value) ||
        "";
      // Preserve extra fields (image for shapes, color_code/dmt_tooltip for metals, etc.)
      const meta = {
        image: item.image,
        color_code: item.color_code,
        dmt_tooltip: item.dmt_tooltip,
        tooltip: item.tooltip,
        options_symbol: item.options_symbol,
        estimated_weight: item.estimated_weight,
        estimated_symbol: item.estimated_symbol,
        options_price: item.options_price,
        id:
          normalizeOptionValue(
            item.id ??
              item.value_id ??
              item.diamond_quality_id ??
              item.quality_id ??
              item.value
          ) ?? value,
        value_id: item.value_id,
        diamond_type: item.diamond_type ?? item.diamondType,
        center_stone_name:
          item.center_stone_name ?? item.centerStoneName ?? item.diamond_type ?? item.diamondType,
      };
      return { value, label, ...meta };
    }
    const value = normalizeOptionValue(item);
    const label = normalizeOptionText(item) || (value !== undefined ? String(value) : "");
    return { value: value ?? item, label };
  });
};

const buildFilterOptions = (apiFilters) => ({
  diamond_weight_groups: toOptionList(
    apiFilters?.diamond_weight_groups,
    FALLBACK_FILTER_VALUES.diamond_weight_groups
  ),
  shapes: toOptionList(apiFilters?.shapes, FALLBACK_FILTER_VALUES.shapes),
  metal_types: toOptionList(apiFilters?.metal_types, FALLBACK_FILTER_VALUES.metal_types),
  origins: toOptionList(apiFilters?.origins, FALLBACK_FILTER_VALUES.origins),
  diamond_qualities: toOptionList(
    apiFilters?.diamond_qualities,
    FALLBACK_FILTER_VALUES.diamond_qualities
  ),
  ring_sizes: toOptionList(apiFilters?.ring_sizes, FALLBACK_FILTER_VALUES.ring_sizes),
});

const normalizeValueId = (value) => {
  if (value === undefined || value === null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object") {
    const candidate = value.value_id ?? value.id ?? value.value;
    if (candidate !== undefined && candidate !== null) return String(candidate);
  }
  return "";
};

const findOptionById = (productOptions = [], id) => {
  const target = normalizeValueId(id);
  return (
    (Array.isArray(productOptions) ? productOptions : []).find(
      (option) => normalizeValueId(option?.options_id) === target
    ) || null
  );
};

const getOptionValueMap = (option) => {
  const map = new Map();
  const values = Array.isArray(option?.values) ? option.values : [];
  for (const value of values) {
    const key = normalizeValueId(value?.value_id ?? value?.id ?? value?.value);
    if (key) map.set(key, value);
  }
  return map;
};

const autoHealOptionSelection = (prev = {}, productOptions = []) => {
  const next = {};
  const options = Array.isArray(productOptions) ? productOptions : [];

  for (const option of options) {
    const optionId = normalizeValueId(option?.options_id);
    if (!optionId || optionId === "2") continue;
    const optionType = Number(option?.options_type);
    const values = Array.isArray(option?.values) ? option.values : [];
    const hasSingleValue = values.length === 1;
    const isCompulsory = Number(option?.is_compulsory) === 1;

    if (optionType === 0 || optionType === 3) {
      const valueMap = getOptionValueMap(option);
      const selected = normalizeValueId(prev?.[optionId]);
      if (selected && valueMap.has(selected)) {
        next[optionId] = selected;
      } else if ((isCompulsory || hasSingleValue) && values.length) {
        next[optionId] = normalizeValueId(
          values[0]?.value_id ?? values[0]?.id ?? values[0]?.value
        );
      } else {
        next[optionId] = "";
      }
      continue;
    }

    if (optionType === 4) {
      const valueMap = getOptionValueMap(option);
      const selected = Array.isArray(prev?.[optionId]) ? prev[optionId] : [];
      next[optionId] = selected
        .map((value) => normalizeValueId(value))
        .filter((value) => value && valueMap.has(value));
      continue;
    }

    if (optionType === 1 || optionType === 2) {
      const current = prev?.[optionId];
      if (current === undefined || current === null) {
        next[optionId] = "";
      } else if (typeof current === "string") {
        next[optionId] = current;
      } else {
        next[optionId] = String(current);
      }
      continue;
    }

    if (prev?.[optionId] !== undefined) {
      next[optionId] = prev[optionId];
    }
  }

  return next;
};

const getRingSizeRow = (productOptions = [], filterOptions = {}, selection = {}) => {
  const selectionId = normalizeValueId(selection?.ringSize);
  const ringOption = findOptionById(productOptions, 2);
  const ringValues =
    ringOption &&
    Number(ringOption.options_type) === 0 &&
    Array.isArray(ringOption.values)
      ? ringOption.values
      : null;

  if (ringValues && ringValues.length) {
    const match =
      ringValues.find(
        (value) =>
          normalizeValueId(value?.value_id ?? value?.id ?? value?.value) === selectionId
      ) || null;
    if (!match) return null;
    const id = match?.value_id ?? match?.id ?? match?.value;
    const label = normalizeOptionText(
      match?.value_name ?? match?.label ?? match?.name ?? match?.value
    );
    return { ...match, value: id, label, id };
  }

  return (
    (filterOptions?.ring_sizes || []).find(
      (value) => normalizeValueId(value?.value) === selectionId
    ) || null
  );
};

const getSelectedRows = (productOptions = [], optionSelection = {}) => {
  const rows = [];
  const options = Array.isArray(productOptions) ? productOptions : [];

  for (const option of options) {
    const optionId = normalizeValueId(option?.options_id);
    if (!optionId || optionId === "2") continue;
    const optionType = Number(option?.options_type);
    const valueMap = getOptionValueMap(option);

    if (optionType === 0 || optionType === 3) {
      const selected = normalizeValueId(optionSelection?.[optionId]);
      if (selected && valueMap.has(selected)) rows.push(valueMap.get(selected));
      continue;
    }

    if (optionType === 4) {
      const selectedValues = Array.isArray(optionSelection?.[optionId])
        ? optionSelection[optionId]
        : [];
      for (const value of selectedValues) {
        const key = normalizeValueId(value);
        if (key && valueMap.has(key)) rows.push(valueMap.get(key));
      }
    }
  }

  return rows;
};

const optionValue = (opt) =>
  normalizeOptionValue(opt?.id ?? opt?.value_id ?? opt?.value);

const getOptionDescriptor = (opt) =>
  normalizeOptionText(
    opt?.center_stone_name ??
      opt?.centerStoneName ??
      opt?.diamond_type ??
      opt?.diamondType ??
      opt?.label ??
      opt?.name ??
      opt?.value_name ??
      opt?.value ??
      opt
  );

const isLabGrownText = (value) => {
  const text = normalizeOptionText(value).toLowerCase();
  if (!text) return false;
  return (
    text.includes("lab grown") ||
    text.includes("lab-grown") ||
    text.includes("labgrown") ||
    text === "lab"
  );
};

const getOptionBySelection = (options = [], selectionValue) => {
  const selectionId =
    selectionValue?.id ??
    selectionValue?.value_id ??
    selectionValue?.value ??
    selectionValue;
  if (selectionId === undefined || selectionId === null || selectionId === "") return null;
  const selectionStr = String(selectionId);
  return (
    options.find((opt) => {
      const optValue = optionValue(opt);
      return (
        String(optValue) === selectionStr ||
        String(opt.id) === selectionStr ||
        String(opt.value_id) === selectionStr ||
        String(opt.label) === selectionStr
      );
    }) || null
  );
};

const isLabOriginSelected = (originSelection, origins = []) => {
  const originOpt = getOptionBySelection(origins, originSelection);
  const originText = getOptionDescriptor(originOpt || originSelection);
  return isLabGrownText(originText);
};

const filterDiamondQualities = (qualities = [], originSelection, origins = []) => {
  if (isLabOriginSelected(originSelection, origins)) return qualities;
  return qualities.filter((opt) => !isLabGrownText(getOptionDescriptor(opt)));
};

const hasPriceValue = (value) =>
  value === 0 || value === "0" || (value !== undefined && value !== null && value !== "");

const normalizePriceLevel = (rawLevel) => {
  const level = Number(rawLevel);
  if (!Number.isFinite(level)) return null;
  if (level < 1 || level > 4) return null;
  return level;
};

const getJewelryPriceLevel = () => {
  if (typeof window === "undefined") return null;
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("amipiUser") || "null");
  } catch {}
  const level = user?.pricing_ctx?.jewelry_level ?? user?.levels?.jewelry ?? null;
  return normalizePriceLevel(level);
};

const getSelectedProductPrice = (product, priceLevel) => {
  if (!product) return undefined;
  const levelPriceMap = {
    1: product.products_price1,
    2: product.products_price2,
    3: product.products_price3,
    4: product.products_price4,
  };
  if (priceLevel && hasPriceValue(levelPriceMap[priceLevel])) {
    return levelPriceMap[priceLevel];
  }
  if (hasPriceValue(product.products_price2)) return product.products_price2;
  return (
    product.products_price ??
    product.base_price ??
    product.products_price1 ??
    product.products_price3 ??
    product.products_price4 ??
    undefined
  );
};

const getClientIds = () => {
  let customers_id = 0;
  let parent_retailer_id = 0;

  try {
    const user = JSON.parse(localStorage.getItem("amipiUser") || "null");
    if (user && typeof user === "object") {
      customers_id =
        Number(
          user.customers_id ??
            user.customer_id ??
            user.retailerrid ??
            user.retailer_id ??
            user.id ??
            0
        ) || 0;

      parent_retailer_id = Number(user.parent_retailer_id ?? user.ParentRetailerID ?? 0) || 0;
    }
  } catch {}

  if (!customers_id || !parent_retailer_id) {
    try {
      const ls = JSON.parse(localStorage.getItem("amipi_auth") || "{}");
      customers_id = customers_id || (Number(ls.customers_id ?? ls.customer_id ?? 0) || 0);
      parent_retailer_id = parent_retailer_id || (Number(ls.parent_retailer_id ?? 0) || 0);
    } catch {}
  }

  if (!customers_id || !parent_retailer_id) {
    const g = window.AMIPI_FRONT || window.AMIPI || window.__AMIPI__ || {};
    customers_id = customers_id || (Number(g.CUST_ID ?? g.customers_id ?? g.customer_id ?? 0) || 0);
    parent_retailer_id =
      parent_retailer_id || (Number(g.ParentRetailerID ?? g.parent_retailer_id ?? 0) || 0);
  }

  return { customers_id, parent_retailer_id };
};

const getCartCheckState = (payload) => {
  if (!payload || typeof payload !== "object") return false;
  if (payload.in_cart !== undefined && payload.in_cart !== null) {
    return Boolean(payload.in_cart);
  }
  const added =
    payload.addedtocart ??
    payload.added_to_cart ??
    payload.addedToCart;
  if (added !== undefined && added !== null) {
    return Boolean(added);
  }
  return false;
};

const getPricingParams = () => {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("amipiUser") || "null");
  } catch {}

  const g = window.AMIPI_FRONT || window.AMIPI || window.__AMIPI__ || {};
  const { customers_id } = getClientIds();

  const AMIPI_FRONT_Retailer_Jewelry_Level =
    Number(g.AMIPI_FRONT_Retailer_Jewelry_Level ?? user?.retailer_level_id ?? 3) || 3;
  const AMIPI_FRONT_RetailerProductFlat = Number(g.AMIPI_FRONT_RetailerProductFlat ?? 0) || 0;
  const AMIPI_FRONT_RetailerProductPer = Number(g.AMIPI_FRONT_RetailerProductPer ?? 0) || 0;
  const AMIPI_FRONT_IS_REATILER =
    (g.AMIPI_FRONT_IS_REATILER ?? (user?.retailer_level_id > 0 ? "Yes" : "No")) === "Yes"
      ? "Yes"
      : "No";

  return {
    customers_id,
    AMIPI_FRONT_Retailer_Jewelry_Level,
    AMIPI_FRONT_RetailerProductFlat,
    AMIPI_FRONT_RetailerProductPer,
    AMIPI_FRONT_IS_REATILER,
  };
};

const buildInitialSelections = (options) => ({
  diamondWeight: optionValue(options.diamond_weight_groups[0]) || "",
  shape: optionValue(options.shapes[0]) || "",
  metalType: optionValue(options.metal_types[0]) || "",
  diamondOrigin: optionValue(options.origins[0]) || "",
  diamondQuality: optionValue(options.diamond_qualities[0]) || "",
  ringSize: optionValue(options.ring_sizes[0]) || "",
});

const syncSelectionWithOptions = (selection, options) => {
  const ensure = (key, list) => {
    const sel = selection[key];
    if (list.some((opt) => String(opt.value) === String(sel))) return sel;
    const matchByLabel = list.find((opt) => String(opt.label) === String(sel));
    if (matchByLabel) return matchByLabel.value;
    return list[0]?.value || "";
  };

  return {
    ...selection,
    diamondWeight: ensure("diamondWeight", options.diamond_weight_groups),
    shape: ensure("shape", options.shapes),
    metalType: ensure("metalType", options.metal_types),
    diamondOrigin: ensure("diamondOrigin", options.origins),
    diamondQuality: ensure("diamondQuality", options.diamond_qualities),
    ringSize: ensure("ringSize", options.ring_sizes),
  };
};

const DEFAULT_FILTER_OPTIONS = buildFilterOptions();
const DEFAULT_SELECTIONS = buildInitialSelections(DEFAULT_FILTER_OPTIONS);

const selectionFromProduct = (product = {}) => {
  const safeRingSize =
    product.default_size && product.default_size !== "0" ? product.default_size : "";

  return {
    diamondWeight: normalizeOptionValue(
      product.diamond_weight_group_id ?? product.diamondWeight
    ),
    shape: normalizeOptionValue(product.shape_id ?? product.shape),
    metalType: normalizeOptionValue(
      product.sptmt_metal_type_id ?? product.metal_type_id ?? product.metalType
    ),
    diamondOrigin: normalizeOptionValue(
      product.center_stone_type_id ?? product.diamondOrigin
    ),
    diamondQuality: normalizeOptionValue(
      product.diamond_quality_id ?? product.diamondQuality
    ),
    ringSize: safeRingSize,
  };
};

const buildSelectionParams = (selection = {}, options = {}, designId, relatedDesignId) => {
  const resolve = (sourceKey, selectionKey) => {
    const list = options?.[sourceKey] || [];
    const selVal = selection?.[selectionKey];
    const selValStr = selVal !== undefined && selVal !== null ? String(selVal) : "";

    const match = list.find(
      (opt) => String(opt?.value) === selValStr || String(opt?.label) === selValStr
    );

    const numericLike =
      selValStr && /^[0-9]+(\.[0-9]+)?$/.test(selValStr) ? Number(selValStr) : undefined;

    const paramVal =
      match?.id ??
      match?.value_id ??
      (Number.isFinite(match?.value) ? match.value : undefined) ??
      numericLike ??
      (selValStr || undefined);

    // allow 0 explicitly
    if (paramVal === 0) return 0;
    return paramVal || undefined;
  };

  // origin selection can be object or primitive
  const selectedOriginId =
    selection?.diamondOrigin?.id ??
    selection?.diamondOrigin?.value_id ??
    selection?.diamondOrigin?.value ??
    selection?.diamondOrigin;

  const resolvedOriginId =
    selectedOriginId !== undefined && selectedOriginId !== null && selectedOriginId !== ""
      ? selectedOriginId
      : resolve("origins", "diamondOrigin");

  const centerStoneTypeId = resolvedOriginId === 0 ? 0 : resolvedOriginId || undefined;

  // Correct keys (backend expects these)
  const diamondWeightId = resolve("diamond_weight_groups", "diamondWeight");
  const shapeId = resolve("shapes", "shape");
  const metalTypeId = resolve("metal_types", "metalType");
  const diamondQualityId = resolve("diamond_qualities", "diamondQuality");
  const ringSizeId = resolve("ring_sizes", "ringSize");

  return {
    // ✅ backend keys
    diamond_weight_group_id: diamondWeightId,
    shape_id: shapeId,
    metal_type_id: metalTypeId,
    center_stone_type_id: centerStoneTypeId,
    diamond_quality_id: diamondQualityId,
    ring_size_id: ringSizeId,

    design_id: designId || undefined,
    related_design_id: relatedDesignId || undefined,

    // ✅ backward-compatible aliases (safe: backend will ignore if not used)
    // keep these so other endpoints (like carttoggle) won't break if they were using old keys
    shape: shapeId,
    metal: metalTypeId,
    sptmt_metal_type_id: metalTypeId,
    ringSize: ringSizeId,
  };
};


const deriveSelection = (options, product, currentSelection = {}, preferProductValues = false) => {
  const base = buildInitialSelections(options);
  const fromProduct = Object.fromEntries(
    Object.entries(selectionFromProduct(product)).filter(
      ([, v]) => v !== undefined && v !== null && v !== "" && v !== "0"
    )
  );
  const merged = preferProductValues
    ? { ...base, ...currentSelection, ...fromProduct }
    : { ...base, ...fromProduct, ...currentSelection };

  return syncSelectionWithOptions(merged, options);
};

// ---------------------- ACCORDION COMPONENT ----------------------
const Accordion = ({ title, value, children }) => {
  const [open, setOpen] = useState(false);

  // ✅ title text se class banegi
  const normalizedTitle = String(title || "").trim();
  const slugOverride =
    normalizedTitle.toLowerCase() === "quality" ? "diamond-quality" : "";
  const slug =
    slugOverride ||
    normalizedTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  return (
    <div className={`jd-accordion jd-acc-${slug}`}>
      <button
        type="button"
        className={`jd-acc-header ${open ? "open" : ""}`}
        onClick={() => setOpen(!open)}
      >
        <div className="jd-acc-left">
          <span className="jd-acc-title">{title}</span>
          <span className="jd-acc-value">{value}</span>
        </div>

        <span className="jd-acc-icon">
          {open ? (
            <svg width="14" height="14" viewBox="0 0 20 20" fill="#2c3b5c">
              <path d="M5 12l5-5 5 5" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 20 20" fill="#2c3b5c">
              <path d="M5 8l5 5 5-5" />
            </svg>
          )}
        </span>
      </button>

      {open && <div className="jd-acc-body">{children}</div>}
    </div>
  );
};


// ---------------------- FILTER GROUP COMPONENT ----------------------
const FilterGroup = ({ group, options, value, onSelect, label, showDiamondType = false }) => (
  <div className={`jd-filter-block jd-acc-${group.key}`}>
    {label ? <span className="jd-filter-label">{label}</span> : null}
    <div className="jd-pill-row">
      {options.map((opt) => {
        const label = opt.label;
        const isShape = group.key === "shape";
        const isMetal = group.key === "metalType";
        const isDiamondQuality = group.key === "diamondQuality";
        const iconSrc = isShape ? opt.image || SHAPE_ICONS[label] : null;
        const metalStyle = isMetal && opt.color_code ? { background: opt.color_code } : undefined;
        const pillText = isMetal ? opt.dmt_tooltip || opt.tooltip || label : label;
        const centerStone =
          showDiamondType && isDiamondQuality
            ? opt.center_stone_name || opt.centerStoneName || opt.diamond_type || opt.diamondType
            : "";
        const selectedValue = optionValue(opt);
        const isActive = String(value) === String(selectedValue);
        const diamondType =
          showDiamondType && isDiamondQuality ? (opt.diamond_type || centerStone || "").trim() : "";
        const diamondTypeClass =
          diamondType
            ? diamondType.toLowerCase().includes("lab")
              ? "jd-pill-lab"
              : diamondType.toLowerCase().includes("earth")
              ? "jd-pill-earth"
              : ""
            : "";

        return (
          <button
            key={`${group.key}-${selectedValue}`}
            type="button"
            className={`jd-pill ${isMetal ? "jd-metal-pill" : ""} ${isShape ? "jd-shape-pill" : ""} ${
              isActive ? "is-active" : ""
            }`}
            style={metalStyle}
            onClick={() => onSelect(group.key, selectedValue)}
          >
            {iconSrc ? (
              <img
                className="jd-pill-icon"
                src={iconSrc}
                alt={label}
                onError={(e) => {
                  const fallback = SHAPE_ICONS[label] || "";
                  if (fallback && e.target.src !== fallback) {
                    e.target.src = fallback;
                  }
                }}
              />
            ) : null}
            {showDiamondType && isDiamondQuality && centerStone ? (
              <span className="jd-pill-text jd-pill-text-dual">
                <span className="jd-pill-line jd-pill-primary">{pillText}</span>
                <span className={`jd-pill-line jd-pill-sub ${diamondTypeClass}`}>{centerStone}</span>
              </span>
            ) : (
              <span className="jd-pill-text">{pillText}</span>
            )}
          </button>
        );
      })}
    </div>
  </div>
);

// ---------------------- MAIN COMPONENT ----------------------
const JewelryDetails = () => {
  const { sku, productid } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [filterOptions, setFilterOptions] = useState(DEFAULT_FILTER_OPTIONS);
  const [productOptions, setProductOptions] = useState([]);
  const [media, setMedia] = useState({ images: [], videos: [], video_link: [] });
  const [activeMedia, setActiveMedia] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [availability, setAvailability] = useState(null);
  const [selection, setSelection] = useState(DEFAULT_SELECTIONS);
  const [optionSelection, setOptionSelection] = useState({});
  const [ringOptionSelected, setRingOptionSelected] = useState(null);
  const [estDiamondPcs, setEstDiamondPcs] = useState(null);
  const [estCaratWt, setEstCaratWt] = useState(null);
  const [estPrice, setEstPrice] = useState(null);
  const [designId, setDesignId] = useState("");
  const designIdRef = useRef("");
  const [relatedDesignId, setRelatedDesignId] = useState("");
  const relatedDesignIdRef = useRef("");
  const [quantity, setQuantity] = useState(1);
  const [quantityError, setQuantityError] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishLoading, setWishLoading] = useState(false);
  const [isCompared, setIsCompared] = useState(false);
  const [comparLoading, setComparLoading] = useState(false);
  const [isInCart, setIsInCart] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [couponBanner, setCouponBanner] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(null);
  const [couponTotal, setCouponTotal] = useState(null);
  const [couponApplied, setCouponApplied] = useState(false);
  const requestIdRef = useRef(0);
  const skipNextSkuFetchRef = useRef(false);
  const jewelryPriceLevel = getJewelryPriceLevel();
  const { user: authUser } = useAuth();
  const isAuthenticated = Boolean(authUser);
  const authJewelryLevel = normalizePriceLevel(
    authUser?.pricing_ctx?.jewelry_level ?? authUser?.levels?.jewelry
  );
  const effectiveJewelryPriceLevel = authJewelryLevel ?? jewelryPriceLevel;
  const redirectToLogin = useCallback((replace = false) => {
    if (typeof window === "undefined") return;
    const loginUrl = buildLoginUrl(window.location.href);
    if (replace) window.location.replace(loginUrl);
    else window.location.href = loginUrl;
  }, []);

  const valueOrDash = (val) =>
    val === undefined || val === null || val === "" ? "-" : val;

  const getProductValue = (...keys) => {
    for (const key of keys) {
      const value = product?.[key];
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return null;
  };

  const formatShipDateLong = (dateStr) => {
    if (!dateStr) return "";
    const trimmed = String(dateStr).trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    const parsed = match
      ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      : new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return trimmed;
    return parsed.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "2-digit",
    });
  };

  const buildAvailabilityView = (availabilityObj) => {
    if (!availabilityObj || availabilityObj.is_display_delivery_days !== 1) {
      return { type: "fallback" };
    }

    const rows = [];
    const bySize = Array.isArray(availabilityObj.by_size) ? availabilityObj.by_size : [];
    for (const row of bySize) {
      const size = row?.size;
      const sizeLabel =
        size === undefined || size === null || size === "" || size === 0 || size === "0"
          ? "All Sizes"
          : String(size);
      const onHand = Number(row?.on_hand ?? 0) || 0;
      const memoOut = Number(row?.memo_out ?? 0) || 0;
      if (onHand > 0) rows.push({ status: "on_hand", sizeLabel, count: onHand });
      if (memoOut > 0) rows.push({ status: "memo_out", sizeLabel, count: memoOut });
    }

    if (rows.length) return { type: "by_size", rows };

    const totals = availabilityObj.totals || {};
    const totalOnHand = Number(totals.on_hand ?? 0) || 0;
    const totalMemoOut = Number(totals.memo_out ?? 0) || 0;
    if (totalOnHand > 0 || totalMemoOut > 0) {
      if (totalOnHand > 0) {
        rows.push({ status: "on_hand", sizeLabel: "All Sizes", count: totalOnHand });
      }
      if (totalMemoOut > 0) {
        rows.push({ status: "memo_out", sizeLabel: "All Sizes", count: totalMemoOut });
      }
      return { type: "by_size", rows };
    }

    return {
      type: "made_to_order",
      madeToOrderShipDate: availabilityObj.made_to_order_ship_date || "",
    };
  };

  const resolveIdsWithAuthFallback = (baseIds = {}) => {
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
  };

  const getFilterType = (key) => {
    const group = FILTER_GROUPS.find((entry) => entry.key === key);
    if (group?.label) return group.label.replace(/\s+/g, "");
    if (!key) return "";
    return `${key.charAt(0).toUpperCase()}${key.slice(1)}`;
  };

  const addParamIfPresent = (target, key, value) => {
    if (value === 0 || value === "0") {
      target[key] = value;
      return;
    }
    if (value === undefined || value === null || value === "") return;
    target[key] = value;
  };

  const buildTrackingParams = (filterMeta = {}) => {
    const params = {};
    addParamIfPresent(
      params,
      "AttributesString",
      getProductValue("AttributesString", "attributesString", "attributes_string")
    );
    addParamIfPresent(
      params,
      "products_blurb",
      getProductValue("products_blurb", "productsBlurb", "product_blurb")
    );
    addParamIfPresent(params, "pid", getProductValue("pid", "products_id", "product_id"));
    addParamIfPresent(
      params,
      "cid",
      getProductValue(
        "cid",
        "categories_id",
        "category_id",
        "master_categories_id",
        "categories_id_path"
      )
    );

    const filterType = filterMeta.filterType ?? filterMeta.filter_type;
    if (filterType) {
      params.filter_status = filterMeta.filter_status ?? "Yes";
      params.filter_type = filterType;
      addParamIfPresent(params, "filter_id", filterMeta.filterId ?? filterMeta.filter_id);
    }

    return params;
  };

  const formatCt = (val) => {
    if (val === undefined || val === null || val === "") return "-";
    const num = Number(val);
    if (Number.isNaN(num)) return valueOrDash(val);
    return `${num.toFixed(2)} CT`;
  };
  const formatPieces = (val) => {
    if (val === undefined || val === null || val === "") return "-";
    const num = Number(val);
    if (Number.isNaN(num)) return valueOrDash(val);
    return String(Math.round(num));
  };

  const toNumberIfPresent = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  };

  const maxQuantityValue = toNumberIfPresent(
    getProductValue("products_quantity", "product_quantity", "quantity", "qty")
  );
  const maxQuantity = Number.isFinite(maxQuantityValue)
    ? Math.max(0, Math.floor(maxQuantityValue))
    : null;
  const hasMaxQuantity = maxQuantity !== null && maxQuantity >= 1;
  const isOutOfStock = maxQuantity === 0;

  const applySymbol = (baseValue, symbol, deltaValue) => {
    if (baseValue === undefined || baseValue === null || baseValue === "") return baseValue;
    const baseNum = Number(baseValue);
    if (Number.isNaN(baseNum)) return baseValue;
    if (!symbol || deltaValue === null || deltaValue === undefined || deltaValue === "") return baseNum;
    const deltaNum = Number(deltaValue);
    if (Number.isNaN(deltaNum)) return baseNum;
    switch (symbol) {
      case "+":
        return baseNum + deltaNum;
      case "-":
        return baseNum - deltaNum;
      case "*":
        return baseNum * deltaNum;
      case "/":
        return baseNum / deltaNum;
      default:
        return baseNum;
    }
  };

  const applyAdjustments = (baseValue, rows, symbolKey, deltaKey) => {
    let adjusted = baseValue;
    for (const row of rows) {
      adjusted = applySymbol(adjusted, row?.[symbolKey], row?.[deltaKey]);
    }
    return adjusted;
  };

  const replaceDetailsUrl = (nextProduct) => {
    if (typeof window === "undefined") return;
    const seoPath = normalizeSeoPath(nextProduct?.products_seo_url);
    if (!seoPath) return;
    let nextPath = `/details/${seoPath}`;
    if (productid && !nextPath.endsWith(`/${productid}`)) {
      nextPath = `${nextPath}/${productid}`;
    }
    if (window.location.pathname === nextPath) return;
    skipNextSkuFetchRef.current = true;
    navigate(
      {
        pathname: nextPath,
        search: window.location.search,
        hash: window.location.hash,
      },
      { replace: true }
    );
  };

  const fetchProductDetails = (
    nextSelection = selection,
    { resetSelection = false, designOverride, relatedDesignOverride, filterMeta } = {}
  ) => {
    if (!sku) return;
    const resolvedDesignId =
      designOverride || designIdRef.current || designId || product?.design_id || product?.designId;
    const resolvedRelatedDesignId =
      relatedDesignOverride ||
      relatedDesignIdRef.current ||
      relatedDesignId ||
      product?.related_design_id ||
      product?.relatedDesignId;
    const params = buildSelectionParams(
      nextSelection,
      filterOptions,
      resolvedDesignId,
      resolvedRelatedDesignId
    );
    const requestParams = { ...params, ...buildTrackingParams(filterMeta) };
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;

    setLoading(true);
    setError("");

    api
      .get(`/product-details/jewelry/${sku}${productid ? `/${productid}` : ""}`, { params: requestParams })
      .then((res) => {
        if (requestId !== requestIdRef.current) return;
        const data = res.data || {};
        const normalizedFilters = buildFilterOptions(data.filters);
        const nextProductOptions = Array.isArray(data.filters?.product_options)
          ? data.filters.product_options
          : [];
        const originOptions = normalizedFilters.origins || [];
        const selectionSeed = resetSelection ? {} : nextSelection;
        const baseSelection = deriveSelection(
          normalizedFilters,
          data.product,
          selectionSeed,
          resetSelection
        );
        const keepOriginOption =
          (resetSelection ? null : getOptionBySelection(originOptions, selectionSeed.diamondOrigin)) ||
          getOptionBySelection(originOptions, baseSelection.diamondOrigin) ||
          originOptions[0] ||
          null;
        const keepOriginValue =
          keepOriginOption ? optionValue(keepOriginOption) : baseSelection.diamondOrigin || "";
        const filteredQualities = filterDiamondQualities(
          normalizedFilters.diamond_qualities,
          keepOriginValue,
          originOptions
        );
        const selectionOptions = { ...normalizedFilters, diamond_qualities: filteredQualities };
        const nextSelectionState = syncSelectionWithOptions(
          { ...baseSelection, diamondOrigin: keepOriginValue },
          selectionOptions
        );

        const nextProduct = data.product || null;
        setProduct(nextProduct);
        replaceDetailsUrl(nextProduct);
        const bannerProductId = data.product?.products_id;
        if (bannerProductId) {
          const { customers_id } = getClientIds();
          const { AMIPI_FRONT_IS_REATILER } = getPricingParams();
          apiSession
            .get("/api/coupon/banner", {
              params: {
                products_id: bannerProductId,
                customers_id,
                AMIPI_FRONT_IS_REATILER,
              },
            })
            .then((res) => {
              const banner = res?.data?.coupon ?? null;
              setCouponBanner(banner || null);
            })
            .catch(() => setCouponBanner(null));
        } else {
          setCouponBanner(null);
        }
        setMedia(data.media || { images: [], videos: [], video_link: [] });
        setAvailability(data.availability || null);
        setFilterOptions(normalizedFilters);
        setProductOptions(nextProductOptions);
        setOptionSelection((prev) => autoHealOptionSelection(prev, nextProductOptions));
        setSelection(nextSelectionState);
        const nextDesignId = data.product?.design_id || data.product?.designId || designIdRef.current || "";
        const nextRelatedDesignId =
          data.product?.related_design_id ||
          data.product?.relatedDesignId ||
          relatedDesignIdRef.current ||
          "";
        setDesignId(nextDesignId || "");
        designIdRef.current = nextDesignId || "";
        setRelatedDesignId(nextRelatedDesignId || "");
        relatedDesignIdRef.current = nextRelatedDesignId || "";
        setActiveMedia(0);
      })
      .catch((err) => {
        if (requestId !== requestIdRef.current) return;
        setError(err?.response?.data?.message || "Unable to load product details.");
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false);
      });
  };

  const handleFilterSelect = (key, value) => {
    if (selection[key] === value) return;
    let nextSelection = { ...selection, [key]: value };
    if (key === "diamondOrigin") {
      nextSelection = { ...selection, diamondOrigin: value, diamondQuality: null };
    }
    setSelection(nextSelection);
    fetchProductDetails(nextSelection, {
      designOverride: designIdRef.current || designId || product?.design_id || product?.designId,
      relatedDesignOverride:
        relatedDesignIdRef.current ||
        relatedDesignId ||
        product?.related_design_id ||
        product?.relatedDesignId,
      filterMeta: {
        filterType: getFilterType(key),
        filterId: value,
      },
    });
  };

  const handleRingSizeChange = (e) => {
    const targetValue = e.target.value;
    const option =
      (ringSizeOptions || []).find(
        (opt) => normalizeValueId(opt.value ?? opt.id) === normalizeValueId(targetValue)
      ) || null;
    const nextSelection = {
      ...selection,
      ringSize: option ? option.value ?? option.id : targetValue,
    };
    setSelection(nextSelection);
    setRingOptionSelected(option);
  };

  const handleOptionSelectionChange = (optionId, value) => {
    setOptionSelection((prev) => ({
      ...prev,
      [optionId]: value,
    }));
  };

  const handleOptionToggle = (optionId, valueId) => {
    setOptionSelection((prev) => {
      const current = Array.isArray(prev?.[optionId]) ? prev[optionId] : [];
      const nextValues = current.includes(valueId)
        ? current.filter((id) => id !== valueId)
        : [...current, valueId];
      return {
        ...prev,
        [optionId]: nextValues,
      };
    });
  };

  const handleDesignIdChange = (e) => {
    const nextId = e.target.value;
    setDesignId(nextId);
    designIdRef.current = nextId;
  };

  const handleRelatedDesignIdChange = (e) => {
    const nextId = e.target.value;
    setRelatedDesignId(nextId);
    relatedDesignIdRef.current = nextId;
  };

  const handleDesignIdApply = () => {
    fetchProductDetails(selection, {
      designOverride: designIdRef.current || designId,
      relatedDesignOverride: relatedDesignIdRef.current || relatedDesignId,
    });
  };

  const handleQuantityChange = (e) => {
    const rawValue = e.target.value;
    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue)) {
      setQuantity(1);
      if (quantityError) setQuantityError("");
      return;
    }
    const nextValue = Math.max(1, Math.floor(numericValue));
    if (hasMaxQuantity && nextValue > maxQuantity) {
      setQuantity(maxQuantity);
      setQuantityError(`Maximum available quantity is ${maxQuantity}.`);
      return;
    }
    setQuantity(nextValue);
    if (quantityError) setQuantityError("");
  };

  const handleResetFilters = () => {
    const resetSelection = buildInitialSelections(filterOptions);
    setSelection(resetSelection);
    setQuantity(1);
    setQuantityError("");
    fetchProductDetails(resetSelection, {
      resetSelection: true,
      designOverride: designIdRef.current || designId || product?.design_id || product?.designId,
      relatedDesignOverride:
        relatedDesignIdRef.current ||
        relatedDesignId ||
        product?.related_design_id ||
        product?.relatedDesignId,
    });
  };

  const handleWishlistToggle = async () => {
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
  };

  const handleCompareToggle = async () => {
    if (!product?.products_id || comparLoading) return;
    const pricing = getPricingParams();
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
  };

  const handleCartToggle = async () => {
    if (!product?.products_id || cartLoading || isAddToCartDisabled) return;
    if (!isAuthenticated) {
      redirectToLogin();
      return;
    }

    const { customers_id, parent_retailer_id } = getClientIds();
    const pricing = getPricingParams();
    const selectionParams = buildSelectionParams(
      selection,
      filterOptions,
      designIdRef.current || designId,
      relatedDesignIdRef.current || relatedDesignId
    );

    const payload = {
      products_id: product.products_id,
      customers_id,
      parent_retailer_id,
      ...selectionParams,
      product_quantity: quantity,
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
  };

  useEffect(() => {
    apiSession.get("/api/csrf").catch(() => {});
  }, []);

  useEffect(() => {
    if (hasMaxQuantity && quantity > maxQuantity) {
      setQuantity(maxQuantity);
    }
    if (quantityError) setQuantityError("");
  }, [maxQuantity]);

  useEffect(() => {
    if (skipNextSkuFetchRef.current) {
      skipNextSkuFetchRef.current = false;
      return;
    }
    if (!sku) return;
    fetchProductDetails(buildInitialSelections(filterOptions), {
      resetSelection: true,
      designOverride: designIdRef.current || designId || product?.design_id || product?.designId,
      relatedDesignOverride:
        relatedDesignIdRef.current ||
        relatedDesignId ||
        product?.related_design_id ||
        product?.relatedDesignId,
    });
  }, [sku, productid]);

  useEffect(() => {
    const nextOption = getRingSizeRow(productOptions, filterOptions, {
      ringSize: selection.ringSize,
    });
    setRingOptionSelected((prev) => {
      if (!nextOption && !prev) return prev;
      if (
        nextOption &&
        prev &&
        normalizeValueId(prev.value ?? prev.value_id ?? prev.id) ===
          normalizeValueId(nextOption.value ?? nextOption.value_id ?? nextOption.id) &&
        prev.options_symbol === nextOption.options_symbol &&
        prev.options_price === nextOption.options_price &&
        prev.estimated_symbol === nextOption.estimated_symbol &&
        prev.estimated_weight === nextOption.estimated_weight
      ) {
        return prev;
      }
      return nextOption;
    });
  }, [productOptions, filterOptions.ring_sizes, selection.ringSize]);

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
      .then((res) => setIsInCart(getCartCheckState(res.data)))
      .catch(() => setIsInCart(false));
  }, [product?.products_id, isAuthenticated]);

  const displaySku = product?.products_style_no || sku || "";
  const displayTitle = product?.products_name || "";
  const displayDescription = product?.products_description || "";
  const diamondQualityOptions = filterDiamondQualities(
    filterOptions.diamond_qualities || [],
    selection.diamondOrigin,
    filterOptions.origins || []
  );
  const ringOption = findOptionById(productOptions, 2);
  const ringOptionValues =
    ringOption &&
    Number(ringOption.options_type) === 0 &&
    Array.isArray(ringOption.values)
      ? ringOption.values
      : null;
  const ringSizeOptions =
    ringOptionValues && ringOptionValues.length
      ? ringOptionValues.map((value) => {
          const id = value?.value_id ?? value?.id ?? value?.value;
          const name = normalizeOptionText(
            value?.value_name ?? value?.label ?? value?.name ?? value?.value
          );
          return {
            id,
            name,
            value: id,
            label: name,
            options_symbol: value?.options_symbol,
            estimated_weight: value?.estimated_weight,
            estimated_symbol: value?.estimated_symbol,
            options_price: value?.options_price,
          };
        })
      : filterOptions.ring_sizes || [];
  const hasRingSizeOptions = ringSizeOptions.length > 0;

  const getSelectedOption = (selectionKey) => {
    const group = FILTER_GROUPS.find((g) => g.key === selectionKey);
    const sourceKey = group?.sourceKey;
    const options = sourceKey ? filterOptions[sourceKey] || [] : [];
    return (
      options.find(
        (opt) => String(opt.value) === String(selection[selectionKey])
      ) || null
    );
  };

  const getSelectedLabel = (selectionKey) => getSelectedOption(selectionKey)?.label || "";

  const getSelectedSummary = (selectionKey) => {
    if (selectionKey === "diamondQuality") {
      const option = getSelectedOption(selectionKey);
      if (option) {
        const originLabel = getSelectedLabel("diamondOrigin");
        return [option.label, originLabel].filter(Boolean).join(" | ");
      }
    }
    return getSelectedLabel(selectionKey) || selection[selectionKey];
  };

  const selectedShape = getSelectedLabel("shape") || selection.shape || "";
  const selectedWeight = getSelectedLabel("diamondWeight") || selection.diamondWeight || "";
  const selectedMetal = getSelectedLabel("metalType") || selection.metalType || "";
  const selectedOrigin = getSelectedLabel("diamondOrigin") || selection.diamondOrigin || "";
  const selectedQuality =
    getSelectedLabel("diamondQuality") ||
    diamondQualityOptions[0]?.label ||
    selection.diamondQuality ||
    "";
  const ringSizeLabel = hasRingSizeOptions
    ? ringSizeOptions.find(
        (opt) => normalizeValueId(opt.value ?? opt.id) === normalizeValueId(selection.ringSize)
      )?.label ||
      selection.ringSize ||
      ""
    : "";
  const formatInches = (val) => {
    if (val === undefined || val === null || val === "") return "";
    const text = String(val).trim();
    if (!text || text === "-") return text;
    if (/\b(inches|inch|in\.)\b/i.test(text) || text.includes('"')) return text;
    return `${text} inches`;
  };
  const isTruthyFlag = (val) =>
    val === true ||
    val === 1 ||
    val === "1" ||
    String(val).toLowerCase() === "true" ||
    String(val).toLowerCase() === "yes" ||
    String(val).toLowerCase() === "y";
  const getOptionValueLabel = (values, target) => {
    const targetId = normalizeValueId(
      target?.value_id ?? target?.id ?? target?.value ?? target
    );
    if (!targetId) return "";
    const match = (Array.isArray(values) ? values : []).find(
      (value) =>
        normalizeValueId(value?.value_id ?? value?.id ?? value?.value) === targetId
    );
    if (!match) return String(targetId);
    return (
      normalizeOptionText(
        match?.value_name ?? match?.label ?? match?.name ?? match?.value
      ) || String(targetId)
    );
  };
  const sizeOption = (Array.isArray(productOptions) ? productOptions : []).find(
    (option) => normalizeValueId(option?.options_id) === "1"
  );
  const sizeOptionId = normalizeValueId(sizeOption?.options_id);
  const sizeOptionValues = Array.isArray(sizeOption?.values) ? sizeOption.values : [];
  const hasCustomSizeOption = sizeOptionId === "1";
  const sizeOptionSelectedId =
    sizeOptionId && optionSelection?.[sizeOptionId] !== undefined
      ? optionSelection[sizeOptionId]
      : "";
  const sizeOptionSelectedLabel =
    getOptionValueLabel(sizeOptionValues, sizeOptionSelectedId) ||
    normalizeOptionText(sizeOptionSelectedId);
  const sizeOptionDefaultValue =
    sizeOptionValues.length
      ? sizeOptionValues.find((value) =>
          isTruthyFlag(
            value?.is_default ??
              value?.isDefault ??
              value?.default ??
              value?.default_value ??
              value?.defaultValue
          )
        ) ||
        sizeOptionValues.find((value) => isTruthyFlag(value?.is_compulsory)) ||
        sizeOptionValues[0] ||
        null
      : null;
  const sizeOptionStandardLabel = sizeOptionValues.length
    ? getOptionValueLabel(sizeOptionValues, sizeOptionDefaultValue)
    : sizeOptionSelectedLabel;
  const standardRingSizeValue =
    product?.default_size && String(product.default_size) !== "0"
      ? product.default_size
      : ringSizeOptions[0]?.value ?? ringSizeOptions[0]?.id ?? "";
  const standardRingSizeLabel = hasRingSizeOptions
    ? ringSizeOptions.find(
        (opt) =>
          normalizeValueId(opt.value ?? opt.id) === normalizeValueId(standardRingSizeValue)
      )?.label ||
      standardRingSizeValue ||
      ""
    : "";
  const sizeDisplay = hasCustomSizeOption
    ? {
        standard: formatInches(sizeOptionStandardLabel),
        selected: formatInches(sizeOptionSelectedLabel || sizeOptionStandardLabel),
      }
    : { standard: standardRingSizeLabel, selected: ringSizeLabel };
  const showSizeRows = hasCustomSizeOption || hasRingSizeOptions;
  const customOptions = (Array.isArray(productOptions) ? productOptions : []).filter((option) => {
    const optionId = normalizeValueId(option?.options_id);
    return optionId && optionId !== "2";
  });
  const inlineCustomOption =
    customOptions.find((option) => {
      const optionId = normalizeValueId(option?.options_id);
      return optionId === "1" && Number(option?.options_type) === 0;
    }) || null;
  const customOptionsRest = inlineCustomOption
    ? customOptions.filter((option) => {
        const optionId = normalizeValueId(option?.options_id);
        return !(optionId === "1" && Number(option?.options_type) === 0);
      })
    : customOptions;

  const getCustomOptionMeta = (option) => {
    const optionId = normalizeValueId(option?.options_id);
    if (!optionId) return null;
    const optionLabel =
      normalizeOptionText(
        option?.options_name ??
          option?.option_name ??
          option?.name ??
          option?.title ??
          option?.label
      ) || `Option ${optionId}`;
    const optionType = Number(option?.options_type);
    const optionValues = Array.isArray(option?.values) ? option.values : [];
    const isCompulsory = Number(option?.is_compulsory) === 1;
    const selectedValue =
      typeof optionSelection?.[optionId] === "string" ? optionSelection[optionId] : "";
    const selectedValues = Array.isArray(optionSelection?.[optionId])
      ? optionSelection[optionId]
      : [];

    return {
      optionId,
      optionLabel,
      optionType,
      optionValues,
      isCompulsory,
      selectedValue,
      selectedValues,
    };
  };

  const inlineCustomOptionMeta = inlineCustomOption
    ? getCustomOptionMeta(inlineCustomOption)
    : null;

  const renderCustomOption = (option) => {
    const meta = getCustomOptionMeta(option);
    if (!meta) return null;
    const {
      optionId,
      optionLabel,
      optionType,
      optionValues,
      isCompulsory,
      selectedValue,
      selectedValues,
    } = meta;
    const isBackOption = optionId === "7" && optionType === 3;
    const showBlankOption = !isCompulsory && optionValues.length > 1;

    return (
      <div
        key={`custom-option-${optionId}`}
        className={`jd-custom-option ${isBackOption ? "jd-custom-option-back" : ""}`}
      >
        {/* <div className="jd-custom-option-title">
          {optionLabel}
          {!isCompulsory ? null : <span className="jd-required"> *</span>}
        </div> */}
        <div className="jd-custom-option-control">
          {optionType === 0 ? (
            <select
              className="jd-acc-select"
              value={selectedValue}
              onChange={(e) =>
                handleOptionSelectionChange(optionId, normalizeValueId(e.target.value))
              }
            >
              {showBlankOption ? <option value="">Select</option> : null}
              {optionValues.map((value) => {
                const valueId = normalizeValueId(value?.value_id ?? value?.id ?? value?.value);
                const valueLabel = normalizeOptionText(
                  value?.value_name ?? value?.label ?? value?.name ?? value?.value
                );
                return (
                  <option key={`${optionId}-${valueId}`} value={valueId}>
                    {valueLabel}
                  </option>
                );
              })}
            </select>
          ) : optionType === 3 ? (
            <div className={`jd-option-list ${isBackOption ? "jd-option-list-cards" : ""}`}>
              {showBlankOption ? (
                <label className="jd-option-item">
                  <input
                    type="radio"
                    name={`option-${optionId}`}
                    value=""
                    checked={!selectedValue}
                    onChange={() => handleOptionSelectionChange(optionId, "")}
                  />
                  <span>Select</span>
                </label>
              ) : null}
              {optionValues.map((value) => {
                const valueId = normalizeValueId(value?.value_id ?? value?.id ?? value?.value);
                const valueLabel = normalizeOptionText(
                  value?.value_name ?? value?.label ?? value?.name ?? value?.value
                );
                const optionImage = value?.option_image ?? value?.optionImage ?? value?.image;
                if (isBackOption) {
                  return (
                    <label key={`${optionId}-${valueId}`} className="jd-option-item jd-option-card-item">
                      <input
                        type="radio"
                        name={`option-${optionId}`}
                        value={valueId}
                        checked={selectedValue === valueId}
                        onChange={() => handleOptionSelectionChange(optionId, valueId)}
                      />
                      <div className="jd-option-card">
                        {optionImage ? (
                          <img
                            width={130}
                            src={`https://www.amipi.com/ampvd/product_images/${optionImage}`}
                            alt={valueLabel}
                            className="jd-option-image"
                          />
                        ) : null}
                        <span className="jd-option-card-label">{valueLabel}</span>
                      </div>
                    </label>
                  );
                }
                return (
                  <label key={`${optionId}-${valueId}`} className="jd-option-item">
                    <input
                      type="radio"
                      name={`option-${optionId}`}
                      value={valueId}
                      checked={selectedValue === valueId}
                      onChange={() => handleOptionSelectionChange(optionId, valueId)}
                    />
                    {optionImage ? (
                      <img
                        width={130}
                        src={`https://www.amipi.com/ampvd/product_images/${optionImage}`}
                        alt={valueLabel}
                        className="jd-option-image"
                      />
                    ) : null}
                    <span>{valueLabel}</span>
                  </label>
                );
              })}
            </div>
          ) : optionType === 4 ? (
            <div className="jd-option-list">
              {optionValues.map((value) => {
                const valueId = normalizeValueId(value?.value_id ?? value?.id ?? value?.value);
                const valueLabel = normalizeOptionText(
                  value?.value_name ?? value?.label ?? value?.name ?? value?.value
                );
                const inputId = `option-${optionId}-${valueId}`;
                return (
                  <label key={inputId} className="jd-option-item">
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={selectedValues.includes(valueId)}
                      onChange={() => handleOptionToggle(optionId, valueId)}
                    />
                    <span>{valueLabel}</span>
                  </label>
                );
              })}
            </div>
          ) : optionType === 1 ? (
            <input
              type="text"
              className="form-control"
              value={selectedValue}
              onChange={(e) => handleOptionSelectionChange(optionId, e.target.value)}
            />
          ) : optionType === 2 ? (
            <textarea
              className="form-control"
              rows={3}
              value={selectedValue}
              onChange={(e) => handleOptionSelectionChange(optionId, e.target.value)}
            />
          ) : null}
        </div>
      </div>
    );
  };

  const productStoneType = getProductValue(
    "stone_type",
    "stoneType",
    "primary_stone_type",
    "primaryStoneType",
    "pstonetype1",
    "total_carat_weight",
    "diamond_pics"
  );

  const primaryStone = {
    type: getProductValue(
      "prmry_dcst_type",
      "primaryStoneType",
      "stone_type",
      "stoneType"
    ),
    origin: getProductValue("primary_origin", "primary_stone_origin", "stone_origin"),
    shape: getProductValue("primary_shape", "primary_stone_shape","shapename"),
    quality: getProductValue("primary_quality", "primary_stone_quality"),
    totalCt: getProductValue(
      "primary_total_ct_w",
      "primary_total_ct",
      "primary_total_carat_weight",
      "primary_total_carat",
      "stn1_tw"
    ),
    stoneSize: getProductValue("primary_stone_size", "primary_stone_carat", "primary_stone_weight","center_stone_weight"),
    mm: getProductValue("primary_mm", "primary_millimeter", "primary_size_mm","center_stone_mm"),
    pieces: getProductValue("primary_pieces", "primary_piece_count","stn1_pcs"),
    breakdown: getProductValue("primary_breakdown", "primary_stone_breakdown","side_diamond_breakdown"),
  };

  const secondaryStone = {
    type: getProductValue("secondary_stone_type", "secondaryStoneType","pst_alias","stn2_dcst_type"),
    origin: getProductValue("secondary_origin", "secondary_stone_origin","center_stone_type","stn2_origin_name","primary_stone_origin","primary_origin"),
    shape: getProductValue("secondary_shape", "secondary_stone_shape","shapename2"),
    quality: getProductValue("secondary_quality", "secondary_stone_quality","stn_diamond_quality"),
    totalCt: getProductValue(
      "secondary_total_ct_w",
      "secondary_total_ct",
      "secondary_total_carat_weight",
      "secondary_total_carat",
      "stn2_cttw"
    ),
    stoneSize: getProductValue(
      "secondary_stone_size",
      "secondary_stone_carat",
      "secondary_stone_weight",
      "stn2_wt_per_pc"
    ),
    mm: getProductValue("secondary_mm", "secondary_millimeter", "secondary_size_mm","stn2_mm"),
    pieces: getProductValue("secondary_pieces", "secondary_piece_count","stn2_pcs"),
    breakdown: getProductValue("secondary_breakdown", "secondary_stone_breakdown","col_stn_breakdown"),
  };
  const secondaryTypeRaw = getProductValue(
    "stn2_type",
    "secondary_stone_type",
    "secondaryStoneType",
    "pst_alias",
    "stn2_dcst_type"
  );
  const secondaryPcsRaw = getProductValue("stn2_pcs", "secondary_pieces", "secondary_piece_count");
  const hasSecondaryStone =
    secondaryTypeRaw !== undefined &&
    secondaryTypeRaw !== null &&
    String(secondaryTypeRaw).trim() !== "" &&
    secondaryPcsRaw !== undefined &&
    secondaryPcsRaw !== null &&
    String(secondaryPcsRaw).trim() !== "";

  const selectionStats = {
    standardTotalCt: getProductValue("standard_total_ct_w", "standard_total_ct", "total_ct_w"),
    standardPieces: getProductValue("standard_pieces", "standard_piece_count"),
    estimatedPieces: getProductValue("estimated_pieces", "estimated_piece_count"),
    estimatedCt: getProductValue(
      "estimated_ct_w",
      "estimated_total_ct_w",
      "estimated_total_carat_weight"
    ),
  };

  const selectedRows = getSelectedRows(productOptions, optionSelection);
  const adjustmentRows = ringOptionSelected
    ? [ringOptionSelected, ...selectedRows]
    : selectedRows;

  useEffect(() => {
    if (!product) {
      setEstDiamondPcs(null);
      setEstCaratWt(null);
      setEstPrice(null);
      return;
    }

    const baseDiamondPcs = toNumberIfPresent(
      getProductValue("estimated_pieces", "estimated_piece_count", "estimated_pcs", "diamond_pics")
    );
    const baseCaratWeight = toNumberIfPresent(
      getProductValue(
        "estimated_ct_w",
        "estimated_total_ct_w",
        "estimated_total_carat_weight",
        "total_carat_weight",
        "total_carat",
        "total_ct_w"
      )
    );
    const basePrice = toNumberIfPresent(
      getSelectedProductPrice(product, effectiveJewelryPriceLevel)
    );

    const diamondPcs = applyAdjustments(
      baseDiamondPcs,
      adjustmentRows,
      "estimated_symbol",
      "estimated_weight"
    );
    const caratWeight = applyAdjustments(
      baseCaratWeight,
      adjustmentRows,
      "options_symbol",
      "estimated_weight"
    );
    const price = applyAdjustments(basePrice, adjustmentRows, "options_symbol", "options_price");

    setEstDiamondPcs((prev) => (prev === diamondPcs ? prev : diamondPcs));
    setEstCaratWt((prev) => (prev === caratWeight ? prev : caratWeight));
    setEstPrice((prev) => (prev === price ? prev : price));
  }, [product, ringOptionSelected, productOptions, optionSelection, effectiveJewelryPriceLevel]);

  const productEstTotalCt = getProductValue("total_carat_weight", "total_carat", "total_ct_w");
  const productTotalPcs = getProductValue("diamond_pics", "stn1_pcs", "stn2_pcs");

  const formatPrice = (val) => {
    const num = Number(val);
    if (!num) return "";
    return num.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    });
  };

  const hasAdjustmentValue = (value) =>
    value !== null && value !== undefined && value !== "";
  const canAdjustPieces = adjustmentRows.some(
    (row) => row?.estimated_symbol && hasAdjustmentValue(row?.estimated_weight)
  );
  const canAdjustCarat = adjustmentRows.some(
    (row) => row?.options_symbol && hasAdjustmentValue(row?.estimated_weight)
  );
  const canAdjustPrice = adjustmentRows.some(
    (row) => row?.options_symbol && hasAdjustmentValue(row?.options_price)
  );

  const unitPrice = canAdjustPrice
    ? estPrice ?? getSelectedProductPrice(product, effectiveJewelryPriceLevel)
    : getSelectedProductPrice(product, effectiveJewelryPriceLevel);
  const unitPriceValue = toNumberIfPresent(unitPrice);
  const totalPriceValue = unitPriceValue !== null ? unitPriceValue * quantity : null;
  const displayPrice = totalPriceValue !== null ? formatPrice(totalPriceValue) : "";
  const basePriceLevel3 = toNumberIfPresent(product?.products_price3);
  const crossUnitPrice = basePriceLevel3 !== null
    ? applyAdjustments(basePriceLevel3, adjustmentRows, "options_symbol", "options_price")
    : null;
  const crossUnitPriceValue = toNumberIfPresent(crossUnitPrice);
  const crossTotalPriceValue = crossUnitPriceValue !== null ? crossUnitPriceValue * quantity : null;
  const crossPrice = crossTotalPriceValue !== null ? formatPrice(crossTotalPriceValue) : "";
  const showCrossPrice =
    effectiveJewelryPriceLevel !== null &&
    effectiveJewelryPriceLevel !== 3 &&
    crossTotalPriceValue !== null &&
    crossPrice !== "";
  const couponAdjustedTotal =
    couponApplied && couponTotal !== null ? couponTotal : totalPriceValue;
  const couponDisplayPrice =
    couponAdjustedTotal !== null ? formatPrice(couponAdjustedTotal) : "";
  const availabilityView = buildAvailabilityView(availability);

  const quantityMessage = isOutOfStock ? "Out of stock." : quantityError;
  const isAddToCartDisabled = isOutOfStock || Boolean(quantityError);
  const cartButtonDisabled = isAddToCartDisabled || cartLoading;

  const handleCouponApply = async () => {
    if (!couponCode || !couponCode.trim()) {
      setCouponError("Please enter a coupon code.");
      setCouponSuccess("");
      setCouponApplied(false);
      setCouponDiscount(null);
      setCouponTotal(null);
      return;
    }
    if (!product?.products_id || couponLoading) return;

    const { customers_id, parent_retailer_id } = getClientIds();
    const { AMIPI_FRONT_IS_REATILER } = getPricingParams();
    const payload = {
      CouponCode: couponCode.trim(),
      products_id: product.products_id,
      customers_id,
      parent_retailer_id,
      AMIPI_FRONT_IS_REATILER,
      total_price: totalPriceValue !== null ? totalPriceValue : unitPriceValue,
      product_quantity: quantity,
    };

    try {
      setCouponLoading(true);
      const { data } = await apiSession.post("/api/coupon/apply", payload);
      const discountValue = toNumberIfPresent(
        data?.coupon_discount ??
          data?.discount ??
          data?.couponDiscount ??
          data?.discount_amount ??
          data?.discountAmount
      );
      const totalValue = toNumberIfPresent(
        data?.coupon_total ??
          data?.total ??
          data?.total_price ??
          data?.couponTotal ??
          data?.grand_total ??
          data?.grandTotal
      );
      const resolvedTotal =
        totalValue !== null
          ? totalValue
          : totalPriceValue !== null && discountValue !== null
          ? totalPriceValue - discountValue
          : null;
      const resolvedDiscount =
        discountValue !== null
          ? discountValue
          : totalPriceValue !== null && resolvedTotal !== null
          ? totalPriceValue - resolvedTotal
          : null;
      const discountText = resolvedDiscount !== null ? formatPrice(resolvedDiscount) : "";

      setCouponApplied(true);
      setCouponDiscount(resolvedDiscount);
      setCouponTotal(resolvedTotal);
      setCouponSuccess(
        `Yay! You saved ${discountText || "$0.00"} with this coupon.`
      );
      setCouponError("");
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Unable to apply coupon.";
      setCouponError(message);
      setCouponSuccess("");
      setCouponApplied(false);
      setCouponDiscount(null);
      setCouponTotal(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleCouponClear = async () => {
    try {
      await apiSession.post("/api/coupon/clear");
    } catch {}
    setCouponApplied(false);
    setCouponDiscount(null);
    setCouponTotal(null);
    setCouponSuccess("");
    setCouponError("");
  };

  const computedEstimatedPieces = canAdjustPieces
    ? estDiamondPcs !== null && estDiamondPcs !== undefined
      ? estDiamondPcs
      : selectionStats.estimatedPieces
    : selectionStats.estimatedPieces;
  const computedEstimatedCt = canAdjustCarat
    ? estCaratWt !== null && estCaratWt !== undefined
      ? estCaratWt
      : selectionStats.estimatedCt
    : selectionStats.estimatedCt;
  const standardTotalCtValue =
    selectionStats.standardTotalCt !== undefined &&
    selectionStats.standardTotalCt !== null &&
    selectionStats.standardTotalCt !== ""
      ? selectionStats.standardTotalCt
      : productEstTotalCt;
  const standardPiecesValue =
    selectionStats.standardPieces !== undefined &&
    selectionStats.standardPieces !== null &&
    selectionStats.standardPieces !== ""
      ? selectionStats.standardPieces
      : productTotalPcs;

  const buildMediaUrl = (filename, type = "image") => {
    if (!filename) return "";
    if (/^https?:\/\//i.test(filename)) return filename;
    const vendorPath = (product?.products_vendor_path || "ampvd")
      .replace(/(^\/+)/g, "")
      .replace(/(\/+$)/g, "");
    const folder = type === "video" ? "product_video" : "product_images";
    return `https://www.amipi.com/ampvd/${folder}/${filename}`.replace(
      /([^:]\/)\/+/g,
      "$1"
    );
  };

  const videoLinkItems = Array.isArray(media?.video_link)
    ? media.video_link
    : media?.video_link
    ? [media.video_link]
    : [];

  const mediaItems = [
    ...(media.videos || []).map((vid) => ({ type: "video", src: buildMediaUrl(vid, "video") })),
    ...videoLinkItems.map((link) => ({ type: "video_link", src: buildMediaUrl(link, "video") })),
    ...(media.images || []).map((img) => ({ type: "image", src: buildMediaUrl(img, "image") })),
  ].filter((item) => item.src);

  useEffect(() => {
    setActiveMedia(0);
  }, [sku, mediaItems.length]);

  const activeMediaItem = mediaItems[activeMedia] || null;
  const shareUrl = product?.products_seo_url
    ? `https://www.amipi.com/${product.products_seo_url}`
    : typeof window !== "undefined"
    ? window.location.href
    : "";
  const shareImage = mediaItems.find((item) => item.type === "image")?.src || "";

  const productDetails = [
    {
      title: "Product Information",
      rows: [
        { key: "Style No.", value: displaySku },
        ...(showSizeRows
          ? [{ key: "Standard Size", value: sizeDisplay.standard }]
          : []),
        { key: "Metal Type", value: selectedMetal },
        { key: "Stone Type", value: valueOrDash(productStoneType) },
        { key: "Shape", value: selectedShape },
        { key: "Weight Group", value: selectedWeight },
        { key: "Est Total Ct (W)", value: formatCt(productEstTotalCt) },
        { key: "Total Pcs", value: valueOrDash(productTotalPcs) },
      ],
    },
    {
      title: "Primary Stone Info",
      rows: [
        { key: "Type", value: valueOrDash(primaryStone.type) },
        { key: "Origin", value: valueOrDash(primaryStone.origin ?? selectedOrigin) },
        { key: "Shape", value: valueOrDash(primaryStone.shape ?? selectedShape) },
        { key: "Quality", value: valueOrDash(primaryStone.quality ?? selectedQuality) },
        { key: "Total Ct (W)", value: valueOrDash(primaryStone.totalCt) },
        { key: "Stone Size", value: valueOrDash(primaryStone.stoneSize) },
        { key: "MM", value: valueOrDash(primaryStone.mm) },
        { key: "Pieces", value: valueOrDash(primaryStone.pieces) },
        { key: "Breakdown", value: valueOrDash(primaryStone.breakdown) },
      ],
    },
    ...(hasSecondaryStone
      ? [
          {
            title: "Secondary Stone Info",
            rows: [
              { key: "Type", value: valueOrDash(secondaryStone.type) },
              { key: "Origin", value: valueOrDash(secondaryStone.origin) },
              { key: "Shape", value: valueOrDash(secondaryStone.shape || selectedShape) },
              { key: "Quality", value: valueOrDash(secondaryStone.quality) },
              { key: "Total Ct (W)", value: valueOrDash(secondaryStone.totalCt) },
              { key: "Stone Size", value: valueOrDash(secondaryStone.stoneSize) },
              { key: "MM", value: valueOrDash(secondaryStone.mm) },
              { key: "Pieces", value: valueOrDash(secondaryStone.pieces) },
              { key: "Breakdown", value: valueOrDash(secondaryStone.breakdown) },
            ],
          },
        ]
      : []),
    {
      title: "Your Selection",
      rows: [
        ...(showSizeRows
          ? [
              { key: "Standard Size", value: sizeDisplay.standard },
              { key: "Selected Size", value: sizeDisplay.selected },
            ]
          : []),
        { key: "Standard Total Ct (W)", value: formatCt(standardTotalCtValue) },
        { key: "Est. Ct (W)", value: formatCt(computedEstimatedCt) },
        { key: "Standard Pieces", value: valueOrDash(standardPiecesValue) },        
        { key: "Est. Pieces", value: formatPieces(computedEstimatedPieces) },        
      ],
    },
  ];

  const promotionBadge = pickPromotionBadge(product);
  const hideStandardImageNote = hasPromotionToken(product, "aict");

  return (
    <>
      <Header />

      <main className="jewelry-details-page">
        <section className="jd-hero container">
          <div className="jd-upper">

            {/* Media */}
            <div className="jd-media">
              <div className="jd-media-primary" style={{ position: "relative" }}>
                {promotionBadge?.file ? (
                  <img
                    src={`${import.meta.env.BASE_URL}images/${promotionBadge.file}`}
                    alt={promotionBadge.title || "Promotion"}
                    title={promotionBadge.title || "Promotion"}
                    style={{
                      position: "absolute",
                      top: 12,
                      left: 12,
                      zIndex: 3,
                      height: 48,
                      width: "auto",
                      pointerEvents: "none",
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : null}
                {activeMediaItem ? (
                  activeMediaItem.type === "video" ? (
                    <video
                      src={activeMediaItem.src}
                      autoPlay
                      controls
                      loop
                      muted
                      playsInline
                      className="jd-media-player"
                      width={600}
                    />
                  ) : activeMediaItem.type === "video_link" ? (
                    <iframe
                      src={activeMediaItem.src}
                      title={displayTitle}
                      className="jd-media-player"
                      width={600}
                      height={420}
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <img src={activeMediaItem.src} alt={displayTitle} className="jd-media-img" width={600} />
                  )
                ) : (
                  <div className="jd-media-placeholder">
                    <img
                      src={FALLBACK_MEDIA_IMAGE}
                      alt="Image Not Found"
                      className="jd-media-placeholder-img"
                      width={600}
                    />
                    <span className="jd-media-placeholder-text">Image Not Found</span>
                  </div>
                )}
              </div>
              {mediaItems.length ? (
                <div className="jd-media-thumbs">
                  {mediaItems.map((item, idx) => {
                    const isVideoThumb = item.type === "video" || item.type === "video_link";
                    return (
                      <button
                        key={`${item.type}-${idx}`}
                        type="button"
                        className={`jd-thumb ${idx === activeMedia ? "is-active" : ""} ${
                          isVideoThumb ? "jd-thumb-video" : ""
                        }`}
                        onClick={() => setActiveMedia(idx)}
                        title={isVideoThumb ? "Video" : "Image"}
                      >
                        {isVideoThumb ? (
                          <img
                            src={VIDEO_THUMB_ICON}
                            alt="Video"
                            className="jd-thumb-video-img"
                            width={28}
                            height={28}
                          />
                        ) : (
                          <img
                            src={item.src}
                            alt={`${displayTitle} view ${idx + 1}`}
                            className="jd-thumb-img"
                            width={50}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {!hideStandardImageNote ? (
                        <p className="jd-note">
                          Note: Standard image displayed. Actual product image may vary based on selected options.
                        </p>
                      ) : null}

              
              {/* <p className="jd-note">
                Note: Standard image displayed. Actual product image may vary based on selected options.
              </p> */}
            </div>

            {/* Right Column */}
            <div className="jd-config">
              <div className="jd-reset-row">
                <span className="jd-sku">#{displaySku}</span>
                <button type="button" className="jd-link-button" onClick={handleResetFilters}>Reset Filter</button>
              </div>

              <div className="jd-design-row">
                <div className="jd-design-inputs">
                  <input
                    id="jd-design-id"
                    type="hidden"
                    className="form-control jd-design-input"
                    value={designId}
                    onChange={handleDesignIdChange}
                    placeholder="Enter design id"
                  />
                  <input
                    id="jd-related-design-id"
                    type="hidden"
                    className="form-control jd-design-input"
                    value={relatedDesignId}
                    onChange={handleRelatedDesignIdChange}
                    placeholder="Enter related design id"
                  />
                </div>
               
              </div>

              <h1 className="jd-title">{displayTitle}</h1>
              <p className="jd-subtitle">{displayDescription}</p>

              {/* FILTER ACCORDIONS */}
              {FILTER_GROUPS.map((group) => {
                if (group.key === "diamondOrigin") return null;
                const groupOptions =
                  group.key === "diamondQuality"
                    ? diamondQualityOptions
                    : filterOptions[group.sourceKey] || [];
                const originOptions = group.key === "diamondQuality" ? filterOptions.origins || [] : [];
                const showOriginOptions = group.key === "diamondQuality" && originOptions.length > 1;
                const showQualityOptions =
                  group.key === "diamondQuality" ? groupOptions.length > 0 : groupOptions.length > 1;
                if (group.key === "diamondQuality") {
                  if (!originOptions.length && !groupOptions.length) return null;
                } else if (groupOptions.length <= 1) {
                  return null;
                }
                return (
                  <Accordion
                    key={group.key}
                    title={group.label}
                    value={getSelectedSummary(group.key) || selection[group.key]}
                  >
                    {group.key === "diamondQuality" ? (
                      <>
                        {showOriginOptions ? (
                          <FilterGroup
                            group={{ key: "diamondOrigin" }}
                            label=""
                            options={originOptions}
                            value={selection.diamondOrigin}
                            onSelect={handleFilterSelect}
                          />
                        ) : null}
                        {showQualityOptions ? (
                          <FilterGroup
                            group={group}
                            options={groupOptions}
                            value={selection[group.key]}
                            onSelect={handleFilterSelect}
                          />
                        ) : null}
                      </>
                    ) : (
                      <FilterGroup
                        group={group}
                        options={groupOptions}
                        value={selection[group.key]}
                        onSelect={handleFilterSelect}
                      />
                    )}
                  </Accordion>
                );
              })}

              {/* Custom Options Accordion */}
              {hasRingSizeOptions ? (
                <div className="jd-accordion jd-static-accordion">
                  <div className="jd-acc-header open">
                    {/* LEFT TITLE */}
                    <span className="jd-acc-title">Ring Size</span>

                    {/* RIGHT DROPDOWN */}
                    <select
                      className="jd-acc-select"
                      value={selection.ringSize}
                      onChange={handleRingSizeChange}
                    >
                      {(ringSizeOptions || []).map((opt) => {
                        const optValue = opt.value ?? opt.id;
                        const optLabel = opt.label ?? opt.name ?? String(optValue ?? "");
                        return (
                          <option key={normalizeValueId(optValue)} value={optValue}>
                            {optLabel}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              ) : null}

              {customOptions.length ? (
                inlineCustomOptionMeta ? (
                  <div className="jd-accordion jd-static-accordion">
                    <div className="jd-acc-header open">
                      <div className="jd-acc-left">
                        <span className="jd-acc-title">
                          Custom Options
                          {!inlineCustomOptionMeta.isCompulsory ? null : (
                            <span className="jd-required"> *</span>
                          )}
                        </span>
                        <span className="jd-acc-value jd-acc-value-select">
                          <select
                            className="jd-acc-select"
                            value={inlineCustomOptionMeta.selectedValue}
                            onChange={(e) =>
                              handleOptionSelectionChange(
                                inlineCustomOptionMeta.optionId,
                                normalizeValueId(e.target.value)
                              )
                            }
                          >
                            {!inlineCustomOptionMeta.isCompulsory &&
                            inlineCustomOptionMeta.optionValues.length > 1 ? (
                              <option value="">Select</option>
                            ) : null}
                            {inlineCustomOptionMeta.optionValues.map((value) => {
                              const valueId = normalizeValueId(
                                value?.value_id ?? value?.id ?? value?.value
                              );
                              const valueLabel = normalizeOptionText(
                                value?.value_name ?? value?.label ?? value?.name ?? value?.value
                              );
                              return (
                                <option
                                  key={`${inlineCustomOptionMeta.optionId}-${valueId}`}
                                  value={valueId}
                                >
                                  {valueLabel}
                                </option>
                              );
                            })}
                          </select>
                        </span>
                      </div>
                    </div>
                    {customOptionsRest.length ? (
                      <div className="jd-acc-body">
                        <div className="jd-custom-options">
                          {customOptionsRest.map((option) => renderCustomOption(option))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <Accordion title="Custom Options" value="">
                    <div className="jd-custom-options">
                      {customOptions.map((option) => renderCustomOption(option))}
                    </div>
                  </Accordion>
                )
              ) : null}

              {/* Quantity + Price */}
               <div className="jd-quantity-row">
                <div className="jd-quantity">
                  <div className="jd-quantity-col">
                    <label htmlFor="jd-qty" className="jd-filter-label">Quantity</label>
                    <input
                      id="jd-qty"
                      type="number"
                      min="1"
                      max={hasMaxQuantity ? maxQuantity : undefined}
                      step="1"
                      className="form-control jd-qty-input"
                      value={quantity}
                      onChange={handleQuantityChange}
                    />
                    {quantityMessage ? (
                      <span className="jd-qty-error">{quantityMessage}</span>
                    ) : null}
                  </div>
                  <div className="jd-price">
                    {showCrossPrice ? (
                      <span className="price-cross">
                        <del>{crossPrice}</del>
                      </span>
                    ) : null}
                    <span className="jd-price-current">
                      {couponApplied ? (
                        <>
                          <del>{displayPrice}</del>
                          <span className="price-cross">{couponDisplayPrice}</span>
                        </>
                      ) : (
                        displayPrice
                      )}
                    </span>
                  </div>
                  <ul className="jd-actions">
                <li>
                  <button
                    type="button"
                    className="jd-action-btn"
                    title="Share With A Friend"
                    onClick={() => setShareOpen(true)}
                  >
                    <i className="fa fa-share-alt" aria-hidden="true" />
                  </button>
                </li>
                <li>
                  {isAuthenticated ? (
                    <button
                      type="button"
                      onClick={handleWishlistToggle}
                      disabled={wishLoading}
                      className={`jd-action-btn ${isWishlisted ? "is-active" : ""}`}
                      aria-pressed={isWishlisted}
                      aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                      title={isWishlisted ? "Remove From Wishlist" : "Add to Wishlist"}
                    >
                      <i className="fa fa-heart" aria-hidden="true" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => redirectToLogin()}
                      disabled={wishLoading}
                      className="jd-action-btn"
                      aria-label="Add to wishlist"
                      title="Add to Wishlist"
                    >
                      <i className="fa fa-heart" aria-hidden="true" />
                    </button>
                  )}
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handleCompareToggle}
                    disabled={comparLoading}
                    className={`jd-action-btn ${isCompared ? "is-active" : ""}`}
                    aria-pressed={isCompared}
                    aria-label={isCompared ? "Remove from compare" : "Add to compare"}
                    title={isCompared ? "Remove From Compare" : "Add to Compare"}
                  >
                    <i className="fa fa-compress" aria-hidden="true" />
                  </button>
                </li>
              </ul>
                  {isAuthenticated ? (
                    <button
                      type="button"
                      className=" btn-primary jd-add common-btn band-cart"
                      onClick={handleCartToggle}
                      disabled={cartButtonDisabled}
                      aria-disabled={cartButtonDisabled}
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
                  ) : (
                    <button
                      type="button"
                      className=" btn-primary jd-add common-btn band-cart"
                      onClick={() => redirectToLogin()}
                      disabled={cartButtonDisabled}
                      aria-disabled={cartButtonDisabled}
                    >
                      <i className="fa fa-shopping-cart" aria-hidden="true" /> Add To Cart
                    </button>
                  )}
                </div>

              {Boolean(couponBanner?.coupon_id ?? couponBanner) ? (
                <div className="coupon-box" data-discount={couponDiscount ?? ""}>
                  {couponBanner ? (
                    <div className="border" id="coupon_amt_div">
                      <p className="cpn-title">{couponBanner.coupon_name}</p>
                      <p className="cpn-border">{couponBanner.coupon_description}</p>
                    </div>
                  ) : null}
                  <input
                    type="text"
                    className="bg"
                    placeholder="Enter Coupon Code"
                    id="CouponCode"
                    name="CouponCode"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                  />
                  <input
                    type="button"
                    className="common-btn redeem-button"
                    value={couponLoading ? "APPLY..." : "APPLY"}
                    onClick={handleCouponApply}
                    disabled={couponLoading}
                  />
                  {couponApplied ? (
                    <button
                      type="button"
                      className="jd-link-button"
                      onClick={handleCouponClear}
                    >
                      Clear
                    </button>
                  ) : null}
                  <div
                    id="CheckOut_Error"
                    className="alert alert-block alert-danger fade in"
                    style={{ display: couponError ? "block" : "none" }}
                    role="alert"
                  >
                    {couponError}
                  </div>
                  <div
                    id="CheckOut_Success"
                    className="alert alert-block alert-success fade in"
                    style={{ display: couponSuccess ? "block" : "none" }}
                    role="alert"
                  >
                    {couponSuccess}
                  </div>
                </div>
              ) : null}

                <div className="jd-price-add">
                  
                  
                  {availabilityView.type === "fallback" ? (
                    <div className="jd-availability">Availability: Made to Order</div>
                  ) : availabilityView.type === "by_size" ? (
                    <div className="jd-availability">
                      <div className="ship m-0">
                        <i className="fa fa-truck" aria-hidden="true" />
                        <span>AVAILABILITY</span>
                      </div>
                      {availabilityView.rows.map((row, index) => (
                        <div
                          key={`${row.status}-${row.sizeLabel}-${index}`}
                          className={
                            row.status === "on_hand"
                              ? "product-detail-green-do tool-dot-gt"
                              : "product-detail-red-dot tool-dot-r"
                          }
                        >
                          {`Size ${row.sizeLabel} - ${row.count} pc(s) - ${
                            row.status === "on_hand" ? "Available" : "Call for Status"
                          }`}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="jd-availability">
                      <div className="product-detail-gray-do tool-dot-gt">Made to Order</div>
                      <div className="product-detail-gray-do">
                        Expected to Ship by {formatShipDateLong(availabilityView.madeToOrderShipDate)}
                      </div>
                      <div className="product-detail-gray-do">
                        Please contact us for any rush order requirements.
                      </div>
                      
                    </div>
                  )}
                  <div className="jd-status-slot" aria-live="polite">
                    {loading ? (
                      <div className="jd-status">Loading product...</div>
                    ) : error ? (
                      <div className="jd-status jd-error">{error}</div>
                    ) : (
                      <div className="jd-status jd-status-placeholder" aria-hidden="true" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* DETAILS GRID */}
        <section className="jd-product-details container">
          <div className="jd-details-head">
            <h2>Product Details</h2>
            <div className="jd-help">
              <span>Have questions? Our experts are available to assist you.</span>
              <a href="tel:+18005302647"><svg fill="none" height="512" viewBox="0 0 24 24" width="512" xmlns="http://www.w3.org/2000/svg" id="fi_7794620"><path d="m9.50289 4.25722-.92848.37139zm1.05431 2.63566.9284-.37139zm-.3206 2.02315.7683.64018zm-.56735.68087.76825.6402zm.12223 2.6946-.70711.7071zm1.91702 1.917.7071-.7071zm2.6946.1222-.6402-.7682zm.6809-.5673.6402.7682zm2.0231-.3206-.3714.9285zm2.6357 1.0543.3714-.9285zm-14.84806-10.4971h2.75119v-2h-2.75119zm3.67967.62861 1.05426 2.63566 1.85693-.74278-1.0542-2.63566zm.89401 3.64724-.56739.68087 1.53647 1.28038.5674-.68089zm-.38405 4.72275 1.91703 1.917 1.4142-1.4142-1.917-1.917zm5.95893 2.1004.6809-.5674-1.2804-1.5365-.6809.5674zm1.6924-.7277 2.6357 1.0543.7428-1.857-2.6357-1.0542zm3.2643 1.9828v2.7512h2v-2.7512zm-.8947 3.6459c-8.3424 0-15.1053-6.7629-15.1053-15.10526h-2c0 9.44696 7.65829 17.10526 17.1053 17.10526zm.8947-.8947c0 .4941-.4006.8947-.8947.8947v2c1.5987 0 2.8947-1.296 2.8947-2.8947zm-.6286-3.6797c.3796.1519.6286.5196.6286.9285h2c0-1.2267-.7469-2.3299-1.8858-2.7855zm-3.6472-.894c.2821-.2352.6705-.2967 1.0115-.1603l.7428-1.8569c-1.0231-.4093-2.1882-.2247-3.0347.4807zm-4.7228.384c1.0972 1.0972 2.8499 1.1767 4.0419.1834l-1.2804-1.5365c-.3973.3311-.9816.3046-1.3473-.0611zm-2.10037-5.95888c-.99332 1.19198-.91381 2.94468.18334 4.04188l1.41423-1.4142c-.3657-.3657-.3922-.95-.0611-1.3473zm.72764-1.69245c.13642.34103.07489.7294-.16025 1.01158l1.53648 1.28036c.7054-.84651.89-2.01162.4807-3.03472zm-1.98274-3.26427c.40891 0 .77662.24895.92848.62861l1.85699-.74278c-.45563-1.13898-1.55875-1.88583-2.78547-1.88583zm-2.75119-2c-1.59872 0-2.89474 1.29602-2.89474 2.89474h2c0-.49415.40059-.89474.89474-.89474z" fill="rgb(0,0,0)"></path></svg> +1 (800) 530-2647</a>
              <a href="mailto:info@amipi.com"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" id="fi_10421464"><g id="Layer_2" data-name="Layer 2"><path d="m19 20.5h-14a4.00427 4.00427 0 0 1 -4-4v-9a4.00427 4.00427 0 0 1 4-4h14a4.00427 4.00427 0 0 1 4 4v9a4.00427 4.00427 0 0 1 -4 4zm-14-15a2.00229 2.00229 0 0 0 -2 2v9a2.00229 2.00229 0 0 0 2 2h14a2.00229 2.00229 0 0 0 2-2v-9a2.00229 2.00229 0 0 0 -2-2z"></path><path d="m12 13.43359a4.99283 4.99283 0 0 1 -3.07031-1.0542l-6.544-5.08984a1.00035 1.00035 0 0 1 1.22852-1.5791l6.54394 5.08984a2.99531 2.99531 0 0 0 3.6836 0l6.54394-5.08984a1.00035 1.00035 0 0 1 1.22852 1.5791l-6.544 5.08984a4.99587 4.99587 0 0 1 -3.07021 1.0542z"></path></g></svg> Email Us</a>
            </div>
 
          </div>

          <div className="jd-details-grid">
            {productDetails.map((card) => (
              <article key={card.title} className="jd-detail-card">
                <div className="jd-card-title">{card.title}</div>
                <dl className="jd-detail-list">
                  {card.rows.map((row) => (
                    <div key={`${card.title}-${row.key}`} className="jd-detail-row">
                      <dt>{row.key}</dt>
                      <dd>{row.value}</dd>                                          
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>

          <p className="jd-footnote">*Customization may cause some variation in final product. Actual pieces & weight may vary up to 5%.</p>
        </section>
      </main>

      <Footer />

      {shareOpen && (
        <ShareProductModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          productId={product?.products_id}
          optionId={selection.ringSize}
          productTitle={displayTitle}
          productUrl={shareUrl}
          productImage={shareImage}
          authUser={authUser}
        />
      )}
    </>
  );
};

export default JewelryDetails;
