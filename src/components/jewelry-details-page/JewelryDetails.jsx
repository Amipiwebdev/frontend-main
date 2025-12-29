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


const CUSTOM_OPTIONS = ["6", "6.5", "7", "7.5"];

const FALLBACK_FILTER_VALUES = {
  diamond_weight_groups: ["1 1/2 ct", "2 ct", "3 ct", "4 ct"],
  shapes: ["Round", "Oval", "Emerald", "Princess"],
  metal_types: ["14W", "14Y", "14R"],
  origins: ["Earth Mined", "Lab Grown"],
  diamond_qualities: [
    { value: "G/H - VS1/VS2", label: "G/H - VS1/VS2", center_stone_name: "Earth Mined" },
    { value: "G/H - SI", label: "G/H - SI", center_stone_name: "Earth Mined" },
    { value: "G/H - SI3/I1", label: "G/H - SI3/I1", center_stone_name: "Earth Mined" },
    { value: "F+ VS+", label: "F+ VS+", center_stone_name: "Lab Grown" },
  ],
  ring_sizes: CUSTOM_OPTIONS.map((value) => ({ value_id: value, value_name: value })),
};

const FILTER_GROUPS = [
  { key: "shape", label: "Shape", sourceKey: "shapes" },
  { key: "diamondWeight", label: "Diamond Weight", sourceKey: "diamond_weight_groups" },
  { key: "metalType", label: "Metal Type", sourceKey: "metal_types" },
  { key: "diamondOrigin", label: "Diamond Origin", sourceKey: "origins" },
  { key: "diamondQuality", label: "Diamond Quality", sourceKey: "diamond_qualities" },
];

const toOptionList = (list, fallback = []) => {
  const src = Array.isArray(list) && list.length ? list : fallback;
  return src.map((item) => {
    if (item && typeof item === "object") {
      const value =
        item.value_id ??
        item.id ??
        item.value ??
        item.value_name ??
        item.label ??
        item.name ??
        item;
      const label = item.value_name ?? item.label ?? item.name ?? item.title ?? String(value);
      // Preserve extra fields (image for shapes, color_code/dmt_tooltip for metals, etc.)
      const meta = {
        image: item.image,
        color_code: item.color_code,
        dmt_tooltip: item.dmt_tooltip,
        tooltip: item.tooltip,
        id: item.id ?? item.value_id ?? item.value,
        value_id: item.value_id,
        center_stone_name:
          item.center_stone_name ?? item.centerStoneName ?? item.diamond_type ?? item.diamondType,
      };
      return { value, label, ...meta };
    }
    return { value: item, label: String(item) };
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

const buildInitialSelections = (options) => ({
  diamondWeight: options.diamond_weight_groups[0]?.value || "",
  shape: options.shapes[0]?.value || "",
  metalType: options.metal_types[0]?.value || "",
  diamondOrigin: options.origins[0]?.value || "",
  diamondQuality: options.diamond_qualities[0]?.value || "",
  ringSize: options.ring_sizes[0]?.value || "",
});

const syncSelectionWithOptions = (selection, options) => {
  const ensure = (key, list) =>
    list.some((opt) => opt.value === selection[key]) ? selection[key] : list[0]?.value || "";

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
    diamondWeight: product.diamond_weight_group_id ?? product.diamondWeight,
    shape: product.shape_id ?? product.shape,
    metalType: product.sptmt_metal_type_id ?? product.metal_type_id ?? product.metalType,
    diamondOrigin: product.center_stone_type_id ?? product.diamondOrigin,
    diamondQuality: product.diamond_quality_id ?? product.diamondQuality,
    ringSize: safeRingSize,
  };
};

const buildSelectionParams = (selection = {}, options = {}, designId) => {
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

  return {
    diamond_weight_group_id: resolve("diamond_weight_groups", "diamondWeight"),
    shape_id: resolve("shapes", "shape"),
    metal_type_id: resolve("metal_types", "metalType"),
    sptmt_metal_type_id: resolve("metal_types", "metalType"),
    center_stone_type_id: resolve("origins", "diamondOrigin"),
    diamond_quality_id: resolve("diamond_qualities", "diamondQuality"),
    ring_size_id: resolve("ring_sizes", "ringSize"),
    design_id: designId || undefined,
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

        return (
          <button
            key={`${group.key}-${opt.value}`}
            type="button"
            className={`jd-pill ${isMetal ? "jd-metal-pill" : ""} ${isShape ? "jd-shape-pill" : ""} ${
              value === opt.value ? "is-active" : ""
            }`}
            style={metalStyle}
            onClick={() => onSelect(group.key, opt.value)}
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
                <span className="jd-pill-line jd-pill-sub">{centerStone}</span>
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
  const [designId, setDesignId] = useState("");
  const designIdRef = useRef("");
  const [quantity, setQuantity] = useState(1);
  const requestIdRef = useRef(0);

  const valueOrDash = (val) =>
    val === undefined || val === null || val === "" ? "-" : val;

  const getProductValue = (...keys) => {
    for (const key of keys) {
      const value = product?.[key];
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return null;
  };

  const formatCt = (val) => {
    if (val === undefined || val === null || val === "") return "-";
    const num = Number(val);
    if (Number.isNaN(num)) return valueOrDash(val);
    return `${num.toFixed(2)} CT`;
  };

  const fetchProductDetails = (
    nextSelection = selection,
    { resetSelection = false, designOverride } = {}
  ) => {
    if (!sku) return;
    const params = buildSelectionParams(
      nextSelection,
      filterOptions,
      designOverride || designIdRef.current || designId || product?.design_id || product?.designId
    );
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;

    setLoading(true);
    setError("");

    api
      .get(`/product-details/jewelry/${sku}`, { params })
      .then((res) => {
        if (requestId !== requestIdRef.current) return;
        const data = res.data || {};
        const normalizedFilters = buildFilterOptions(data.filters);

        setProduct(data.product || null);
        setMedia(data.media || { images: [], videos: [] });
        setFilterOptions(normalizedFilters);
        setSelection(
          deriveSelection(normalizedFilters, data.product, resetSelection ? {} : nextSelection, resetSelection)
        );
        const nextDesignId = data.product?.design_id || data.product?.designId || designIdRef.current || "";
        setDesignId(nextDesignId);
        designIdRef.current = nextDesignId;
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
    const nextSelection = { ...selection, [key]: value };
    setSelection(nextSelection);
    fetchProductDetails(nextSelection);
  };

  const handleRingSizeChange = (e) => {
    const targetValue = e.target.value;
    const option =
      (filterOptions.ring_sizes || []).find((opt) => String(opt.value) === String(targetValue)) ||
      null;
    const nextSelection = { ...selection, ringSize: option ? option.value : targetValue };
    setSelection(nextSelection);
    fetchProductDetails(nextSelection);
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
    });
  };

  useEffect(() => {
    if (!sku) return;
    fetchProductDetails(buildInitialSelections(filterOptions), {
      resetSelection: true,
      designOverride: designIdRef.current || designId || product?.design_id || product?.designId,
    });
  }, [sku]);

  const displaySku = product?.products_style_no || sku || "B401200-14WE-R-H";
  const displayTitle =
    product?.products_name ||
    "4 Prong Timeless Dreams Tennis Bracelet with Half Diamonds and Half Rubies";
  const displayDescription =
    product?.products_description ||
    "14K White Gold 2 cttw 4 Prong Timeless Dreams Bracelet with G-H color and SI3-I1 clarity earthmined Half Diamonds and Half Rubies.";

  const getSelectedOption = (selectionKey) => {
    const group = FILTER_GROUPS.find((g) => g.key === selectionKey);
    const sourceKey = group?.sourceKey;
    const options = sourceKey ? filterOptions[sourceKey] || [] : [];
    return options.find((opt) => opt.value === selection[selectionKey]) || null;
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

  const selectedShape = getSelectedLabel("shape") || "Round";
  const selectedWeight = getSelectedLabel("diamondWeight") || "2 ct";
  const selectedMetal = getSelectedLabel("metalType") || "14K White Gold";
  const selectedOrigin = getSelectedLabel("diamondOrigin") || "Earth Mined";
  const selectedQuality =
    getSelectedLabel("diamondQuality") ||
    filterOptions?.diamond_qualities?.[0]?.label ||
    "G/H - VS1/VS2";
  const ringSizeLabel =
    (filterOptions.ring_sizes || []).find((opt) => opt.value === selection.ringSize)?.label ||
    selection.ringSize ||
    "7";

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

  const displayPrice =
    formatPrice(
      product?.products_price4 ??
        product?.products_price3 ??
        product?.products_price2 ??
        product?.products_price1 ??
        product?.products_msrp
    ) || "$1,572.00";

  const buildMediaUrl = (filename, type = "image") => {
    if (!filename) return "";
    if (/^https?:\/\//i.test(filename)) return filename;
    const vendorPath = (product?.products_vendor_path || "ampvd")
      .replace(/(^\/+)/g, "")
      .replace(/(\/+$)/g, "");
    const folder = type === "video" ? "product_video" : "product_images";
    return `https://www.amipi.com/${vendorPath}/${folder}/${filename}`.replace(
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
        { key: "Standard Total Ct (W)", value: valueOrDash(selectionStats.standardTotalCt) },
        { key: "Standard Pieces", value: valueOrDash(selectionStats.standardPieces) },
        { key: "Selected Size", value: ringSizeLabel },
        { key: "Est. Pieces", value: valueOrDash(selectionStats.estimatedPieces) },
        { key: "Est. Ct (W)", value: valueOrDash(selectionStats.estimatedCt) },
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
                    options={filterOptions[group.sourceKey] || []}
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
