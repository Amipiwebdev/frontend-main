import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../common/Header";
import Footer from "../common/Footer";
import { api } from "../../apiClient";
import "./jewelryDetails.scss";

const SHAPE_ICONS = {
  Round: "src/assets/shapes/round.png",
  Oval: "src/assets/shapes/oval.svg",
  Emerald: "src/assets/shapes/emerald.svg",
  Princess: "src/assets/shapes/princess.svg",
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
  { key: "diamondWeight", label: "Diamond Weight", sourceKey: "diamond_weight_groups" },
  { key: "metalType", label: "Metal Type", sourceKey: "metal_types" },
  { key: "diamondOrigin", label: "Diamond Origin", sourceKey: "origins" },
  { key: "diamondQuality", label: "Diamond Quality", sourceKey: "diamond_qualities" },
];

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
    const list = options[sourceKey] || [];
    const selVal = selection[selectionKey];
    const selValStr = selVal !== undefined && selVal !== null ? String(selVal) : "";
    const match = list.find(
      (opt) => String(opt.value) === selValStr || String(opt.label) === selValStr
    );
    const numericLike =
      selValStr && /^[0-9]+(\.[0-9]+)?$/.test(selValStr) ? Number(selValStr) : undefined;
    const paramVal =
      match?.id ??
      match?.value_id ??
      (Number.isFinite(match?.value) ? match.value : undefined) ??
      numericLike ??
      (selValStr || undefined);
    if (paramVal === 0) return 0;
    return paramVal || undefined;
  };

  const selectedOriginId =
    selection?.diamondOrigin?.id ??
    selection?.diamondOrigin?.value_id ??
    selection?.diamondOrigin?.value ??
    selection?.diamondOrigin;
  const resolvedOriginId =
    selectedOriginId !== undefined && selectedOriginId !== null && selectedOriginId !== ""
      ? selectedOriginId
      : resolve("origins", "diamondOrigin");
  const centerStoneTypeId =
    resolvedOriginId === 0 ? 0 : resolvedOriginId || "";

  return {
    diamond_weight_group_id: resolve("diamond_weight_groups", "diamondWeight"),
    shape_id: resolve("shapes", "shape"),
    metal_type_id: resolve("metal_types", "metalType"),
    sptmt_metal_type_id: resolve("metal_types", "metalType"),
    center_stone_type_id: centerStoneTypeId,
    diamond_quality_id: resolve("diamond_qualities", "diamondQuality"),
    ring_size_id: resolve("ring_sizes", "ringSize"),
    design_id: designId || undefined,
    related_design_id: relatedDesignId || undefined,
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
  const slug = String(title || "")
    .toLowerCase()
    .trim()
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
const FilterGroup = ({ group, options, value, onSelect }) => (
  <div className={`jd-filter-block jd-acc-${group.key}`}>
    <div className="jd-pill-row">
      {options.map((opt) => {
        const label = opt.label;
        const isShape = group.key === "shape";
        const isMetal = group.key === "metalType";
        const isDiamondQuality = group.key === "diamondQuality";
        const iconSrc = isShape ? opt.image || SHAPE_ICONS[label] : null;
        const metalStyle = isMetal && opt.color_code ? { background: opt.color_code } : undefined;
        const pillText = isMetal ? opt.dmt_tooltip || opt.tooltip || label : label;
        const centerStone = isDiamondQuality
          ? opt.center_stone_name || opt.centerStoneName || opt.diamond_type || opt.diamondType
          : "";
        const selectedValue = optionValue(opt);
        const isActive = String(value) === String(selectedValue);
        const diamondType = isDiamondQuality ? (opt.diamond_type || centerStone || "").trim() : "";
        const diamondTypeClass = diamondType
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
            {isDiamondQuality && centerStone ? (
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
  const { sku } = useParams();
  const [product, setProduct] = useState(null);
  const [filterOptions, setFilterOptions] = useState(DEFAULT_FILTER_OPTIONS);
  const [media, setMedia] = useState({ images: [], videos: [] });
  const [activeMedia, setActiveMedia] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selection, setSelection] = useState(DEFAULT_SELECTIONS);
  const [ringOptionSelected, setRingOptionSelected] = useState(null);
  const [estDiamondPcs, setEstDiamondPcs] = useState(null);
  const [estCaratWt, setEstCaratWt] = useState(null);
  const [estPrice, setEstPrice] = useState(null);
  const [designId, setDesignId] = useState("");
  const designIdRef = useRef("");
  const [relatedDesignId, setRelatedDesignId] = useState("");
  const relatedDesignIdRef = useRef("");
  const [quantity, setQuantity] = useState(1);
  const requestIdRef = useRef(0);
  const jewelryPriceLevel = getJewelryPriceLevel();

  const valueOrDash = (val) =>
    val === undefined || val === null || val === "" ? "-" : val;

  const getProductValue = (...keys) => {
    for (const key of keys) {
      const value = product?.[key];
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return null;
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

  const toNumberIfPresent = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  };

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
      .get(`/product-details/jewelry/${sku}`, { params: requestParams })
      .then((res) => {
        if (requestId !== requestIdRef.current) return;
        const data = res.data || {};
        const normalizedFilters = buildFilterOptions(data.filters);
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

        setProduct(data.product || null);
        setMedia(data.media || { images: [], videos: [] });
        setFilterOptions(normalizedFilters);
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
      (filterOptions.ring_sizes || []).find((opt) => String(opt.value) === String(targetValue)) ||
      null;
    const nextSelection = { ...selection, ringSize: option ? option.value : targetValue };
    setSelection(nextSelection);
    setRingOptionSelected(option);
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
    const next = Math.max(1, Number(e.target.value) || 1);
    setQuantity(next);
  };

  const handleResetFilters = () => {
    const resetSelection = buildInitialSelections(filterOptions);
    setSelection(resetSelection);
    setQuantity(1);
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

  useEffect(() => {
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
  }, [sku]);

  useEffect(() => {
    const nextOption =
      (filterOptions.ring_sizes || []).find(
        (opt) => String(opt.value) === String(selection.ringSize)
      ) || null;
    setRingOptionSelected((prev) => {
      if (!nextOption && !prev) return prev;
      if (
        nextOption &&
        prev &&
        String(prev.value) === String(nextOption.value) &&
        prev.options_symbol === nextOption.options_symbol &&
        prev.options_price === nextOption.options_price &&
        prev.estimated_symbol === nextOption.estimated_symbol &&
        prev.estimated_weight === nextOption.estimated_weight
      ) {
        return prev;
      }
      return nextOption;
    });
  }, [filterOptions.ring_sizes, selection.ringSize]);

  const displaySku = product?.products_style_no || sku || "";
  const displayTitle = product?.products_name || "";
  const displayDescription = product?.products_description || "";
  const diamondQualityOptions = filterDiamondQualities(
    filterOptions.diamond_qualities || [],
    selection.diamondOrigin,
    filterOptions.origins || []
  );

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
        const centerStone =
          option.center_stone_name || option.centerStoneName || option.diamond_type || option.diamondType;
        return [option.label, centerStone].filter(Boolean).join(" | ");
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
  const ringSizeLabel =
    (filterOptions.ring_sizes || []).find((opt) => opt.value === selection.ringSize)?.label ||
    selection.ringSize ||
    "";

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
    type: getProductValue("secondary_stone_type", "secondaryStoneType","pst_alias"),
    origin: getProductValue("secondary_origin", "secondary_stone_origin","center_stone_type"),
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
      getSelectedProductPrice(product, jewelryPriceLevel)
    );

    const diamondPcs = applySymbol(
      baseDiamondPcs,
      ringOptionSelected?.estimated_symbol,
      ringOptionSelected?.estimated_weight
    );
    const caratWeight = applySymbol(
      baseCaratWeight,
      ringOptionSelected?.options_symbol,
      ringOptionSelected?.estimated_weight
    );
    const price = applySymbol(
      basePrice,
      ringOptionSelected?.options_symbol,
      ringOptionSelected?.options_price
    );

    setEstDiamondPcs((prev) => (prev === diamondPcs ? prev : diamondPcs));
    setEstCaratWt((prev) => (prev === caratWeight ? prev : caratWeight));
    setEstPrice((prev) => (prev === price ? prev : price));
  }, [product, ringOptionSelected, jewelryPriceLevel]);

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

  const canAdjustPieces =
    ringOptionSelected?.estimated_symbol &&
    ringOptionSelected?.estimated_weight !== null &&
    ringOptionSelected?.estimated_weight !== undefined &&
    ringOptionSelected?.estimated_weight !== "";
  const canAdjustCarat =
    ringOptionSelected?.options_symbol &&
    ringOptionSelected?.estimated_weight !== null &&
    ringOptionSelected?.estimated_weight !== undefined &&
    ringOptionSelected?.estimated_weight !== "";
  const canAdjustPrice =
    ringOptionSelected?.options_symbol &&
    ringOptionSelected?.options_price !== null &&
    ringOptionSelected?.options_price !== undefined &&
    ringOptionSelected?.options_price !== "";

  const displayPrice =
    formatPrice(
      canAdjustPrice
        ? estPrice ?? getSelectedProductPrice(product, jewelryPriceLevel)
        : getSelectedProductPrice(product, jewelryPriceLevel)
    ) || "";

  const computedStandardPieces = canAdjustPieces
    ? applySymbol(
        selectionStats.standardPieces,
        ringOptionSelected?.estimated_symbol,
        ringOptionSelected?.estimated_weight
      )
    : selectionStats.standardPieces;
  const computedStandardTotalCt = canAdjustCarat
    ? applySymbol(
        selectionStats.standardTotalCt,
        ringOptionSelected?.options_symbol,
        ringOptionSelected?.estimated_weight
      )
    : selectionStats.standardTotalCt;
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

  const mediaItems = [
    ...(media.images || []).map((img) => ({ type: "image", src: buildMediaUrl(img, "image") })),
    ...(media.videos || []).map((vid) => ({ type: "video", src: buildMediaUrl(vid, "video") })),
  ].filter((item) => item.src);

  useEffect(() => {
    setActiveMedia(0);
  }, [sku, mediaItems.length]);

  const activeMediaItem = mediaItems[activeMedia] || null;

  const productDetails = [
    {
      title: "Product Information",
      rows: [
        { key: "Style No.", value: displaySku },
        { key: "Standard Size", value: ringSizeLabel },
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
    {
      title: "Your Selection",
      rows: [
        { key: "Standard Size", value: ringSizeLabel },
        { key: "Standard Total Ct (W)", value: formatCt(productEstTotalCt) },
        { key: "Standard Pieces", value: valueOrDash(productTotalPcs) },
        { key: "Selected Size", value: ringSizeLabel },
        { key: "Est. Pieces", value: valueOrDash(computedEstimatedPieces) },
        { key: "Est. Ct (W)", value: valueOrDash(computedEstimatedCt) },
      ],
    },
  ];

  return (
    <>
      <Header />

      <main className="jewelry-details-page">
        <section className="jd-hero container">
          <div className="jd-upper">

            {/* Media */}
            <div className="jd-media">
              <div className="jd-media-primary">
                {activeMediaItem ? (
                  activeMediaItem.type === "video" ? (
                    <video
                      src={activeMediaItem.src}
                      controls
                      loop
                      muted
                      playsInline
                      className="jd-media-player"
                      width={600}
                    />
                  ) : (
                    <img src={activeMediaItem.src} alt={displayTitle} className="jd-media-img" width={600} />
                  )
                ) : (
                  <span>Image / Video placeholder</span>
                )}
              </div>
              <div className="jd-media-thumbs">
                {mediaItems.length
                  ? mediaItems.map((item, idx) => (
                      <button
                        key={`${item.type}-${idx}`}
                        type="button"
                        className={`jd-thumb ${idx === activeMedia ? "is-active" : ""}`}
                        onClick={() => setActiveMedia(idx)}
                        title={item.type === "video" ? "Video" : "Image"}
                      >
                        {item.type === "video" ? (
                          <span>Video</span>
                        ) : (
                          <img
                            src={item.src}
                            alt={`${displayTitle} view ${idx + 1}`}
                            className="jd-thumb-img"
                            width={50}
                          />
                        )}
                      </button>
                    ))
                  : ["Image", "Video", "360 view", "Details"].map((label) => (
                      <button key={label} type="button" className="jd-thumb">
                        {label}
                      </button>
                    ))}
              </div>
              <p className="jd-note">
                Note: Standard image displayed. Actual product image may vary based on selected options.
              </p>
            </div>

            {/* Right Column */}
            <div className="jd-config">
              {loading && <div className="jd-status">Loading product...</div>}
              {error && <div className="jd-status jd-error">{error}</div>}

              <div className="jd-reset-row">
                <span className="jd-sku">#{displaySku}</span>
                <button type="button" className="jd-link-button" onClick={handleResetFilters}>Reset Filter</button>
              </div>

              <div className="jd-design-row">
                <div className="jd-design-inputs">
                  <input
                    id="jd-design-id"
                    type="text"
                    className="form-control jd-design-input"
                    value={designId}
                    onChange={handleDesignIdChange}
                    placeholder="Enter design id"
                  />
                  <input
                    id="jd-related-design-id"
                    type="text"
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
              {FILTER_GROUPS.map((group) => (
                <Accordion
                  key={group.key}
                  title={group.label}
                  value={getSelectedSummary(group.key) || selection[group.key]}
                >
                  <FilterGroup
                    group={group}
                    options={
                      group.key === "diamondQuality"
                        ? diamondQualityOptions
                        : filterOptions[group.sourceKey] || []
                    }
                    value={selection[group.key]}
                    onSelect={handleFilterSelect}
                  />
                </Accordion>
              ))}

              {/* Custom Options Accordion */}
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
                    {(filterOptions.ring_sizes || []).map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                </div>
              </div>

              {/* Quantity + Price */}
              <div className="jd-quantity-row">
                <div className="jd-quantity">
                  <label htmlFor="jd-qty" className="jd-filter-label">Quantity</label>
                  <input
                    id="jd-qty"
                    type="number"
                    min="1"
                    className="form-control jd-qty-input"
                    value={quantity}
                    onChange={handleQuantityChange}
                  />
                </div>

                <div className="jd-price-add">
                  <div className="jd-price">{displayPrice}</div>
                  <button type="button" className="btn btn-primary jd-add">
                    Add to Cart
                  </button>
                  <div className="jd-availability">Availability: Made to Order</div>
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
              <a href="tel:+18005302647">+1 (800) 530-2647</a>
              <a href="mailto:info@amipi.com">Email Us</a>
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
    </>
  );
};

export default JewelryDetails;
