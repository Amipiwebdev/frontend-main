import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../common/Header";
import Footer from "../common/Footer";
import { api } from "../../apiClient";
import "./jewelryDetails.scss";

const CUSTOM_OPTIONS = ["6", "6.5", "7", "7.5"];

const FALLBACK_FILTER_VALUES = {
  diamond_weight_groups: ["1 1/2 ct", "2 ct", "3 ct", "4 ct"],
  shapes: ["Round", "Oval", "Emerald", "Princess"],
  metal_types: ["14K White Gold", "14K Yellow Gold", "14K Rose Gold"],
  origins: ["Earth Mined", "Lab Grown"],
  diamond_qualities: ["G-H / SI2-I1", "F-G / VS1", "D-F / VVS"],
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
      return { value, label };
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

// ---------------------- ACCORDION COMPONENT ----------------------
const Accordion = ({ title, value, children }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="jd-accordion">
      <button
        type="button"
        className={`jd-acc-header ${open ? "open" : ""}`}
        onClick={() => setOpen(!open)}
      >
        
        {/* LEFT GROUP — Title + Value */}
        <div className="jd-acc-left">
          <span className="jd-acc-title">{title}</span>
          <span className="jd-acc-value">{value}</span>
        </div>

        {/* RIGHT — Filled Arrow Icon */}
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
  <div className="jd-filter-block">
    {/* <div className="jd-filter-label">{group.label}</div> */}
    <div className="jd-pill-row">
      {options.map((opt) => (
        <button
          key={`${group.key}-${opt.value}`}
          type="button"
          className={`jd-pill ${value === opt.value ? "is-active" : ""}`}
          onClick={() => onSelect(group.key, opt.value)}
        >
          {opt.label}
        </button>
      ))}
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
  const [quantity, setQuantity] = useState(1);

  const updateSelection = (key, value) =>
    setSelection((prev) => ({ ...prev, [key]: value }));

  const handleQuantityChange = (e) => {
    const next = Math.max(1, Number(e.target.value) || 1);
    setQuantity(next);
  };

  useEffect(() => {
    if (!sku) return;
    let active = true;
    setLoading(true);
    setError("");

    api
      .get(`/product-details/jewelry/${sku}`)
      .then((res) => {
        if (!active) return;
        const data = res.data || {};
        setProduct(data.product || null);
        setMedia(data.media || { images: [], videos: [] });

        const normalizedFilters = buildFilterOptions(data.filters);
        setFilterOptions(normalizedFilters);
        setSelection((prev) => syncSelectionWithOptions(prev, normalizedFilters));
        setActiveMedia(0);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.response?.data?.message || "Unable to load product details.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [sku]);

  const displaySku = product?.products_style_no || sku || "B401200-14WE-R-H";
  const displayTitle =
    product?.products_name ||
    "4 Prong Timeless Dreams Tennis Bracelet with Half Diamonds and Half Rubies";
  const displayDescription =
    product?.products_description ||
    "14K White Gold 2 cttw 4 Prong Timeless Dreams Bracelet with G-H color and SI3-I1 clarity earthmined Half Diamonds and Half Rubies.";

  const getSelectedLabel = (selectionKey) => {
    const group = FILTER_GROUPS.find((g) => g.key === selectionKey);
    const sourceKey = group?.sourceKey;
    const options = sourceKey ? filterOptions[sourceKey] || [] : [];
    const match = options.find((opt) => opt.value === selection[selectionKey]);
    return match?.label || "";
  };

  const selectedShape = getSelectedLabel("shape") || "Round";
  const selectedWeight = getSelectedLabel("diamondWeight") || "2 ct";
  const selectedMetal = getSelectedLabel("metalType") || "14K White Gold";
  const selectedOrigin = getSelectedLabel("diamondOrigin") || "Earth Mined";
  const selectedQuality = getSelectedLabel("diamondQuality") || "G-H / SI2-I1";
  const ringSizeLabel =
    (filterOptions.ring_sizes || []).find((opt) => opt.value === selection.ringSize)?.label ||
    selection.ringSize ||
    "7";

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
        { key: "Stone Type", value: "Halfway Rubies" },
        { key: "Shape", value: selectedShape },
        { key: "Weight Group", value: selectedWeight },
      ],
    },
    {
      title: "Primary Stone Info",
      rows: [
        { key: "Type", value: "Diamond" },
        { key: "Origin", value: selectedOrigin },
        { key: "Shape", value: selectedShape },
        { key: "Quality", value: selectedQuality },
        { key: "Total Ct (W)", value: "1.03 ct" },
        { key: "Stone Size", value: "0.03 ct" },
        { key: "MM", value: "1.80 mm" },
        { key: "Pieces", value: "41" },
        { key: "Breakdown", value: "41-0.03 RD, actual weight may vary" },
      ],
    },
    {
      title: "Secondary Stone Info",
      rows: [
        { key: "Type", value: "Rubies" },
        { key: "Origin", value: selectedOrigin },
        { key: "Shape", value: selectedShape },
        { key: "Quality", value: "AA Quality" },
        { key: "Total Ct (W)", value: "1.00 ct" },
        { key: "Stone Size", value: "0.03 ct" },
        { key: "MM", value: "1.80 mm" },
        { key: "Pieces", value: "40" },
        { key: "Breakdown", value: "40-1.80 mm RD, actual weight may vary" },
      ],
    },
    {
      title: "Your Selection",
      rows: [
        { key: "Standard Size", value: ringSizeLabel },
        { key: "Standard Total Ct (W)", value: "2.03 ct" },
        { key: "Standard Pieces", value: "81" },
        { key: "Selected Size", value: ringSizeLabel },
        { key: "Est. Pieces", value: "81" },
        { key: "Est. Ct (W)", value: "2.03 ct" },
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
                    />
                  ) : (
                    <img src={activeMediaItem.src} alt={displayTitle} className="jd-media-img" />
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
                <button type="button" className="jd-link-button">Reset Filter</button>
              </div>

              <h1 className="jd-title">{displayTitle}</h1>
              <p className="jd-subtitle">{displayDescription}</p>

              {/* FILTER ACCORDIONS */}
              {FILTER_GROUPS.map((group) => (
                <Accordion
                  key={group.key}
                  title={group.label}
                  value={getSelectedLabel(group.key) || selection[group.key]}
                >
                  <FilterGroup
                    group={group}
                    options={filterOptions[group.sourceKey] || []}
                    value={selection[group.key]}
                    onSelect={updateSelection}
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
                    onChange={(e) => {
                      const targetValue = e.target.value;
                      const option =
                        (filterOptions.ring_sizes || []).find(
                          (opt) => String(opt.value) === String(targetValue)
                        ) || null;
                      updateSelection("ringSize", option ? option.value : targetValue);
                    }}
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

          <p className="jd-footnote">*Actual pieces & weight may vary up to 5%.</p>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default JewelryDetails;
