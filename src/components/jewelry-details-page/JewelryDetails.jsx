import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../common/Header";
import Footer from "../common/Footer";
import { api } from "../../apiClient";
import "./jewelryDetails.scss";

// Data-driven filter groups keep the layout reusable and easy to extend.
const FILTER_GROUPS = [  
  { key: "diamondWeight", label: "Diamond Weight", options: ["1 1/2 ct", "2 ct", "3 ct", "4 ct"] },
  { key: "shape", label: "Shape", options: ["Round", "Oval", "Emerald", "Princess"] },
  { key: "metalType", label: "Metal Type", options: ["14K White Gold", "14K Yellow Gold", "14K Rose Gold"] },
  { key: "diamondQuality", label: "Diamond Quality", options: ["G-H / SI2-I1", "F-G / VS1", "D-F / VVS"] },
  { key: "diamondOrigin", label: "Diamond Origin", options: ["Earth Mined", "Lab Grown"] },
];

const CUSTOM_OPTIONS = ["6 inches", "6.5 inches", "7 inches", "7.5 inches"];

const PRODUCT_DETAILS = [
  {
    title: "Product Information",
    rows: [
      { key: "Style No.", value: "B401200-14WE-R-H" },
      { key: "Standard Size", value: "7 inches" },
      { key: "Metal Type", value: "14K White Gold" },
      { key: "Stone Type", value: "Halfway Rubies" },
      { key: "Shape", value: "Round" },
      { key: "Weight Group", value: "2 ct" },
    ],
  },
  {
    title: "Primary Stone Info",
    rows: [
      { key: "Type", value: "Diamond" },
      { key: "Origin", value: "Earth Mined" },
      { key: "Shape", value: "Round" },
      { key: "Quality", value: "G-H / SI2-I1" },
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
      { key: "Origin", value: "Earth Mined" },
      { key: "Shape", value: "Round" },
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
      { key: "Standard Size", value: "7 inches" },
      { key: "Standard Total Ct (W)", value: "2.03 ct" },
      { key: "Standard Pieces", value: "81" },
      { key: "Selected Size", value: "7 inches" },
      { key: "Est. Pieces", value: "81" },
      { key: "Est. Ct (W)", value: "2.03 ct" },
    ],
  },
];

const initialSelections = {
  
  diamondWeight: FILTER_GROUPS[0].options[0],
  shape: FILTER_GROUPS[1].options[1],
  metalType: FILTER_GROUPS[2].options[0],
  diamondQuality: FILTER_GROUPS[3].options[0],
  diamondOrigin: FILTER_GROUPS[4].options[0],
  customOption: CUSTOM_OPTIONS[2],
};

const FilterGroup = ({ group, value, onSelect }) => (
  <div className="jd-filter-block">
    <div className="jd-filter-label">{group.label}</div>
    <div className="jd-pill-row">
      {group.options.map((opt) => (
        <button
          key={`${group.key}-${opt}`}
          type="button"
          className={`jd-pill ${value === opt ? "is-active" : ""}`}
          onClick={() => onSelect(group.key, opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  </div>
);

const JewelryDetails = () => {
  const { sku } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selection, setSelection] = useState(initialSelections);
  const [quantity, setQuantity] = useState(1);

  const updateSelection = (key, value) => setSelection((prev) => ({ ...prev, [key]: value }));

  const handleQuantityChange = (e) => {
    const next = Math.max(1, Number(e.target.value) || 1);
    setQuantity(next);
  };

  // Pull SKU from the URL and fetch product details.
  useEffect(() => {
    if (!sku) return;
    let active = true;
    setLoading(true);
    setError("");
    api
      .get(`/product-details/jewelry/${sku}`)
      .then((res) => {
        if (!active) return;
        setProduct(res.data || null);
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

  const displaySku = sku || "B401200-14WE-R-H";
  const displayTitle =
    product?.title || product?.name || "4 Prong Timeless Dreams Tennis Bracelet with Half Diamonds and Half Rubies";
  const displayDescription =
    product?.description ||
    "14K White Gold 2 cttw 4 Prong Timeless Dreams Bracelet with G-H color and SI3-I1 clarity earthmined Half Diamonds and Half Rubies.";

  return (
    <>
      <Header />

      <main className="jewelry-details-page">
        <section className="jd-hero container">
          <div className="jd-upper">
            {/* Upper left: image / video placeholders */}
            <div className="jd-media">
              <div className="jd-media-primary">
                <span>Image / Video placeholder</span>
              </div>
              <div className="jd-media-thumbs">
                {["Image", "Video", "360 view", "Details"].map((label) => (
                  <button key={label} type="button" className="jd-thumb">
                    {label}
                  </button>
                ))}
              </div>
              <p className="jd-note">
                Note: Standard image displayed. Actual product image may vary based on selected options.
              </p>
            </div>

            {/* Upper right: filter & summary column */}
            <div className="jd-config">
              {loading ? <div className="jd-status">Loading product...</div> : null}
              {error ? <div className="jd-status jd-error">{error}</div> : null}
              <div className="jd-reset-row">
                <span className="jd-sku">#{displaySku}</span>
                <button type="button" className="jd-link-button">
                  Reset Filter
                </button>
              </div>

              <h1 className="jd-title">{displayTitle}</h1>
              <p className="jd-subtitle">{displayDescription}</p>

              {FILTER_GROUPS.map((group) => (
                <FilterGroup
                  key={group.key}
                  group={group}
                  value={selection[group.key]}
                  onSelect={updateSelection}
                />
              ))}

              <div className="jd-filter-block">
                <div className="jd-filter-label">Custom Options</div>
                <select
                  className="form-select jd-select"
                  value={selection.customOption}
                  onChange={(e) => updateSelection("customOption", e.target.value)}
                >
                  {CUSTOM_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="jd-quantity-row">
                <div className="jd-quantity">
                  <label htmlFor="jd-qty" className="jd-filter-label">
                    Quantity
                  </label>
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
                  <div className="jd-price">$1,572.00</div>
                  <button type="button" className="btn btn-primary jd-add">
                    Add to Cart
                  </button>
                  <div className="jd-availability">Availability: Made to Order</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Product details grid */}
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
            {PRODUCT_DETAILS.map((card) => (
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
