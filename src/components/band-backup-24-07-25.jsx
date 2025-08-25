import React, { useEffect, useState } from "react";
import Header from "./common/Header";
import Footer from "./common/Footer";
import axios from "axios";
import Topbar from "./common/Topbar";

const API = "http://localhost:3001/api";
const SEO_URL = "bands-test";

function pickFirstAvailable(val, allowed) {
  if (!allowed || !allowed.length) return null;
  if (val && allowed.includes(val)) return val;
  return allowed[0];
}

const FILTER_ORDER = [
  "stoneType",
  "design",
  "shape",         // diamond shape
  "settingStyle",  // setting style
  "metal",
  "quality",
  "diamondSize",
  "ringSize",
];

const Bands = () => {
  // Allowed IDs from catnav
  const [allowed, setAllowed] = useState({
    stoneTypes: [],
    designs: [],
    shapes: [],
    settingStyles: [],
    metals: [],
    qualities: [],
    diamondSizes: [],
  });

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

  // Helpers for images
  const getImageUrl = (file, folder) =>
    file?.startsWith("http")
      ? file
      : `https://www.amipi.com/images/${folder}/${file}`;
  const getGalleryImage = (file) =>
    file?.startsWith("http")
      ? file
      : `https://www.amipi.com/ampvd/product_images/${file}`;
  const getGalleryVideo = (file) =>
    file?.startsWith("http")
      ? file
      : `https://www.amipi.com/ampvd/product_video/${file}`;

  // 1. On mount: get allowed ids + initial defaults from catnav
  useEffect(() => {
    axios.get(`${API}/catnav/${SEO_URL}`).then(async (res) => {
      const nav = res.data[0];

      // All allowed IDs as arrays
      const stoneTypeIds = nav.category_navigation_sub_stone_type
        .split(",")
        .map(Number)
        .filter(Boolean);
      const designIds = nav.category_navigation_sub_category_group
        .split(",")
        .map(Number)
        .filter(Boolean);
      const settingStyleIds = nav.category_navigation_sub_category
        .split(",")
        .map(Number)
        .filter(Boolean);
      const shapeIds = nav.shap_display
        .split(",")
        .map(Number)
        .filter(Boolean);
      const metalIds = nav.metal_type_display
        .split(",")
        .map(Number)
        .filter(Boolean);
      const qualityIds = nav.qualities_display
        .split(",")
        .map(Number)
        .filter(Boolean);

      setAllowed({
        stoneTypes: stoneTypeIds,
        designs: designIds,
        shapes: shapeIds,
        settingStyles: settingStyleIds,
        metals: metalIds,
        qualities: qualityIds,
        diamondSizes: [], // set after other filters!
      });

      // Fetch display data for allowed
      const [
        stoneTypesRes,
        designsRes,
        shapesRes,
        settingStylesRes,       
        metalsRes,
        qualitiesRes,
      ] = await Promise.all([
        axios.get(`${API}/productstonetype/byids/${stoneTypeIds.join(",")}`),
        axios.get(`${API}/stylegroup/byids/${designIds.join(",")}`),
        axios.get(`${API}/shapes/byids/${shapeIds.join(",")}`),
        axios.get(`${API}/stylecategory/byids/${settingStyleIds.join(",")}`),        
        axios.get(`${API}/metaltype/byids/${metalIds.join(",")}`),
        axios.get(`${API}/quality/byids/${qualityIds.join(",")}`),
      ]);

      setData({
        stoneTypes: stoneTypesRes.data,
        designs: designsRes.data,
        shapes: shapesRes.data,
        settingStyles: settingStylesRes.data,
        metals: metalsRes.data,
        qualities: qualitiesRes.data,
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

  // 2. StoneType => filter Designs
  useEffect(() => {
    if (!selected.stoneType) return;
    axios
      .get(`${API}/designs`, { params: { stoneType: selected.stoneType } })
      .then((res) => {
        const allowedIds = allowed.designs;
        const filtered = res.data.filter((d) => allowedIds.includes(d.id));
        setData((d) => ({ ...d, designs: filtered }));
        setSelected((sel) => ({
          ...sel,
          design: pickFirstAvailable(sel.design, filtered.map((x) => x.id)),
        }));
      });
  }, [selected.stoneType, allowed.designs]);

  // 3. Design => Diamond Shape
  useEffect(() => {
    if (!selected.stoneType || !selected.design) return;
    axios
      .get(`${API}/shapesnew`, {
        params: { stoneType: selected.stoneType, design: selected.design },
      })
      .then((res) => {
        const allowedIds = allowed.shapes;
        const filtered = res.data.filter((d) => allowedIds.includes(d.id));
        setData((d) => ({ ...d, shapes: filtered }));
        setSelected((sel) => ({
          ...sel,
          shape: pickFirstAvailable(sel.shape, filtered.map((x) => x.id)),
        }));
      });
  }, [selected.stoneType, selected.design, allowed.shapes]);

  // 4. Diamond Shape => Setting Style
  useEffect(() => {
    if (!selected.stoneType || !selected.design || !selected.shape) return;
    axios
      .get(`${API}/setting-styles`, {
        params: {
          stoneType: selected.stoneType,
          design: selected.design,
          shape: selected.shape,
        },
      })
      .then((res) => {
        const allowedIds = allowed.settingStyles;
        const filtered = res.data.filter((d) => allowedIds.includes(d.id));
        setData((d) => ({ ...d, settingStyles: filtered }));
        setSelected((sel) => ({
          ...sel,
          settingStyle: pickFirstAvailable(sel.settingStyle, filtered.map((x) => x.id)),
        }));
      });
  }, [selected.stoneType, selected.design, selected.shape, allowed.settingStyles]);

  // 5. Setting Style => Metal
  useEffect(() => {
    if (
      !selected.stoneType ||
      !selected.design ||
      !selected.shape ||
      !selected.settingStyle
    )
      return;
    axios
      .get(`${API}/metals`, {
        params: {
          stoneType: selected.stoneType,
          design: selected.design,
          shape: selected.shape,
          settingStyle: selected.settingStyle,
        },
      })
      .then((res) => {
        const allowedIds = allowed.metals;
        const filtered = res.data.filter((d) => allowedIds.includes(d.id));
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

  // 6. Metal => Quality
  useEffect(() => {
    if (
      !selected.stoneType ||
      !selected.design ||
      !selected.shape ||
      !selected.settingStyle ||
      !selected.metal
    )
      return;
    axios
      .get(`${API}/qualities`, {
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
        const filtered = res.data.filter((d) => allowedIds.includes(d.id));
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

  // 7. Quality => Diamond Size
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
    axios
      .get(`${API}/diamond-sizesnew`, {
        params: {
          stoneType: selected.stoneType,
          design: selected.design,
          shape: selected.shape,
          settingStyle: selected.settingStyle,
          metal: selected.metal,
          quality: selected.quality,
        },
      })
      .then((res) => {
        const sizes = res.data.map((sz) =>
          typeof sz === "object" ? sz.size : sz
        );
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
  ]);

  // 8. Diamond Size => Product
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
    axios
      .get(`${API}/productnew`, {
        params: {
          stoneType: selected.stoneType,
          design: selected.design,
          shape: selected.shape,
          settingStyle: selected.settingStyle,
          metal: selected.metal,
          quality: selected.quality,
          diamondSize: selected.diamondSize,
        },
      })
      .then((res) => setProduct(res.data));
  }, [
    selected.stoneType,
    selected.design,
    selected.shape,
    selected.settingStyle,
    selected.metal,
    selected.quality,
    selected.diamondSize,
  ]);

 // 9. Product => ring size options
useEffect(() => {
  if (!product?.products_id) {
    setRingOptions([]);
    setSelected((sel) => ({ ...sel, ringSize: null }));
    return;
  }
  axios
    .get(`${API}/product-options/${product.products_id}`)
    .then((res) => {
      setRingOptions(res.data || []);
      setSelected((sel) => {
        // Try to keep same value, else pick first
        const found = res.data?.find((x) => x.value_id === sel.ringSize);
        return {
          ...sel,
          ringSize: found ? found.value_id : res.data?.[0]?.value_id || null,
        };
      });
    });
}, [product?.products_id]);


  // 10. Product/ring size => estimated values
  useEffect(() => {
    if (!product) return;
    let diamondPcs = Number(product.estimated_pcs || product.diamond_pics || 2);
    let caratWeight = Number(product.total_carat_weight || 0);
    let price = Number(product.products_price1 || product.products_price || 0);
    const selectedRingOption = ringOptions.find(
      (o) => o.value_id === selected.ringSize
    );
    if (selectedRingOption) {
      if (
        selectedRingOption.options_symbol &&
        selectedRingOption.estimated_weight !== null
      ) {
        const estW = Number(selectedRingOption.estimated_weight);
        switch (selectedRingOption.options_symbol) {
          case "+":
            diamondPcs += estW;
            break;
          case "-":
            diamondPcs -= estW;
            break;
          case "*":
            diamondPcs *= estW;
            break;
          case "/":
            diamondPcs /= estW;
            break;
          default:
            break;
        }
      }
      if (
        selectedRingOption.estimated_symbol &&
        selectedRingOption.estimated_weight !== null
      ) {
        const estW = Number(selectedRingOption.estimated_weight);
        switch (selectedRingOption.estimated_symbol) {
          case "+":
            caratWeight += estW;
            break;
          case "-":
            caratWeight -= estW;
            break;
          case "*":
            caratWeight *= estW;
            break;
          case "/":
            caratWeight /= estW;
            break;
          default:
            break;
        }
      }
      if (
        selectedRingOption.options_symbol &&
        selectedRingOption.options_price !== null
      ) {
        const optPrice = Number(selectedRingOption.options_price);
        switch (selectedRingOption.options_symbol) {
          case "+":
            price += optPrice;
            break;
          case "-":
            price -= optPrice;
            break;
          case "*":
            price *= optPrice;
            break;
          case "/":
            price /= optPrice;
            break;
          default:
            break;
        }
      }
    }
    setEstDiamondPcs(diamondPcs);
    setEstCaratWt(caratWeight);
    setEstPrice(price);
  }, [product, ringOptions, selected.ringSize]);

  // Filter click handler
  function handleFilterChange(key, value) {
    const idx = FILTER_ORDER.indexOf(key);
    const cleared = FILTER_ORDER.slice(idx + 1).reduce((acc, k) => ({ ...acc, [k]: null }), {});
    setSelected((prev) => ({ ...prev, [key]: value, ...cleared }));
  }

  // GALLERY
  let galleryMedia = [];
  if (product?.videos?.length > 0) galleryMedia.push({ type: "video", url: product.videos[0] });
  if (product?.images?.length > 0) product.images.forEach((url) => galleryMedia.push({ type: "image", url }));

  // RENDER
  return (
    <div>
      <Topbar />
      <Header />
      <div className="custom-container">
        <div className="row">
          <div className="main-content" style={{ display: "flex", gap: 40 }}>
            {/* GALLERY */}
            <div class="left-gallery-band">
              <div className="left-gallery-grid">
                {galleryMedia.length === 0 && (
                  <div className="gallery-image-link" style={{ background: "#f5f5f8", minHeight: 300 }} />
                )}
                {galleryMedia.map((item, i) =>
                  item.type === "video" ? (
                    <a key={i} href={getGalleryVideo(item.url)} target="_blank" rel="noopener noreferrer" className="gallery-image-link" title="View video">
                      <video
                        src={getGalleryVideo(item.url)}
                        className="gallery-image"
                        style={{ background: "#000" }}
                        autoPlay
                        muted
                        loop
                        controls
                        playsInline
                      />
                    </a>
                  ) : (
                    <a key={i} href={getGalleryImage(item.url)} target="_blank" rel="noopener noreferrer" className="gallery-image-link" title="View image">
                      <img src={getGalleryImage(item.url)} alt={`Product view ${i + 1}`} className="gallery-image" />
                    </a>
                  )
                )}
              </div>
            </div>
            {/* FILTERS */}
            <div className="right-filters">
              {/* Stone Type */}
              <div className="filter-block">
                <div className="filter-title">Stone Type</div>
                <div className="filter-options">
                  {data.stoneTypes.map((st) => (
                    <button
                      key={st.pst_id || st.id}
                      type="button"
                      className={
                        "filter-card" +
                        (selected.stoneType === st.pst_id || selected.stoneType === st.id ? " selected" : "")
                      }
                      onClick={() => handleFilterChange("stoneType", st.pst_id || st.id)}
                    >
                      <img src={getImageUrl(st.pst_image || st.image, "stone_type")} alt={st.pst_name || st.name} />
                      <span className="filter-label">{st.pst_description || st.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Design */}
              <div className="filter-block">
                <div className="filter-title">Design</div>
                <div className="filter-options">
                  {data.designs.map((d) => (
                    <button
                      key={d.psg_id || d.id}
                      type="button"
                      className={
                        "filter-card" +
                        (selected.design === d.psg_id || selected.design === d.id ? " selected" : "")
                      }
                      onClick={() => handleFilterChange("design", d.psg_id || d.id)}
                    >
                      <img src={getImageUrl(d.psg_image || d.image, "style_group")} alt={d.psg_name || d.name} />
                      <span className="filter-label">{d.psg_name || d.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Diamond Shape */}
              <div className="filter-block">
                <div className="filter-title">Stone Shape</div>
                <div className="filter-options">
                  {data.shapes.map((sh) => (
                    <button
                      key={sh.id}
                      type="button"
                      className={"filter-card" + (selected.shape === sh.id ? " selected" : "")}
                      onClick={() => handleFilterChange("shape", sh.id)}
                    >
                      <img src={getImageUrl(sh.image, "shape")} alt={sh.name} />
                      <span className="filter-label">{sh.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Setting Style */}
              <div className="filter-block">
                <div className="filter-title">Setting Style</div>
                <div className="filter-options">
                  {data.settingStyles.map((sc) => (
                    <button
                      key={sc.psc_id || sc.id}
                      type="button"
                      className={
                        "filter-card" +
                        (selected.settingStyle === sc.psc_id || selected.settingStyle === sc.id ? " selected" : "")
                      }
                      onClick={() => handleFilterChange("settingStyle", sc.psc_id || sc.id)}
                    >
                      <img src={getImageUrl(sc.psc_image || sc.image, "style_category")} alt={sc.psc_name || sc.name} />
                      <span className="filter-label">{sc.psc_name || sc.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Metal */}
              <div className="filter-block metal-icon">
                <div className="filter-title">Metal</div>
                <div className="filter-options">
                  {data.metals.map((m) => (
                    <button
                      key={m.dmt_id || m.id}
                      type="button"
                      className={
                        "filter-card" +
                        (selected.metal === m.dmt_id || selected.metal === m.id ? " selected" : "")
                      }
                      onClick={() => handleFilterChange("metal", m.dmt_id || m.id)}
                      title={m.dmt_name}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          background: m.color_code,
                          margin: "8px auto 8px auto",
                          // border: "2px solid #eee",
                          boxShadow: "0 2px 10px #22305213",
                        }}
                      >
                      <span className="filter-label">{m.dmt_tooltip || m.dmt_tooltip}</span></div>
                    </button>
                  ))}
                </div>
              </div>
              {/* Diamond Quality */}
              <div className="filter-block diamond-q">
                <div className="filter-title">Stone Quality</div>
                <div className="filter-options" style={{ display: "flex", flexWrap: "wrap" }}>
                  {data.qualities.map((q) => (
                    <button
                      key={q.dqg_id || q.id}
                      type="button"
                      className={
                        "filter-card" +
                        (selected.quality === q.dqg_id || selected.quality === q.id ? " selected" : "")
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
              {/* Diamond Size */}
              <div className="filter-block diamond-s">
                <div className="filter-title">Stone Size</div>
                <div className="filter-options diamond-size">
                  {data.diamondSizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={
                        "filter-card" + (selected.diamondSize === size ? " selected" : "")
                      }
                      onClick={() => handleFilterChange("diamondSize", size)}
                    >
                      {size} ct
                    </button>
                  ))}
                </div>
              </div>
              {/* Ring Size Dropdown */}
              {ringOptions.length > 0 && (
                <div className="filter-block">
                  <div className="filter-title">Choose Ring Size</div>
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
               {/* PRODUCT DETAILS */}
          <div
            className="product-details"
          >
            
            {product ? (
              <div>
                {/* Top Section */}
                <div style={{ display: "flex", alignItems: "center", marginBottom: 24, justifyContent: "space-between" }}>
                  <div>
                    <strong>YOUR SELECTION</strong>
                    <div style={{ fontSize: 14, marginTop: 6 }}>
                      Size: <b>{ringOptions.find((o) => o.value_id === selected.ringSize)?.value_name || "--"}</b>
                    </div>
                  </div>
                  <div style={{ fontWeight: "bold", color: "#888", fontSize: 14 }}>
                    #{product.products_style_no || "--"}
                  </div>
                </div>
                {/* Banner Section */}
                <div className="product-info"
                >
                  <div>
                    <div style={{ fontWeight: "bold" }}>{product.dqg_alias || "--"}</div>
                    <div style={{ fontSize: 13 }}>{product.center_stone_name || "--"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13 }}>Est. Carat Wt*</div>
                    <div style={{ fontSize: 22, fontWeight: "bold", marginTop: 2 }}>
                      {estCaratWt !== null
                        ? Number(estCaratWt).toFixed(2)
                        : product.total_carat_weight || "--"}{" "}
                      CT <span style={{ fontSize: 12 }}>[+/- 5%]</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: "bold" }}>
                    $
                    {estPrice !== null
                      ? Number(estPrice).toFixed(0)
                      : product.products_price1 || product.products_price || "--"}
                  </div>
                </div>
                {/* Meta Section */}
                <div className="product-info-meta">
                    <div className="col-info">
                      <label>Metal</label>
                      <p>{product.metal_name || "--"}</p>
                    </div>
                    <div className="col-info">
                      <label>Design</label>
                      <p>{product.style_group_name || "--"}</p>
                    </div>
                    <div className="col-info">
                      <label>Setting Style</label>
                      <p>{product.style_category_name || "--"}</p>
                    </div>
                    <div className="col-info">
                      <label>Stone Type</label>
                      <p>{product.stone_type_name || "--"}</p>
                    </div>
                    <div className="col-info">
                      <label>Stone Shape</label>
                      <p>{product.diamond_shape_name || "--"}</p>
                    </div>
                    <div className="col-info">
                      <label>Stone Size</label>
                      <p>{product.diamond_size || `${product.total_carat_weight || "--"} CT (Each)`}</p>
                    </div>
                    <div className="col-info">
                      <label>Est. Stone Pcs*</label>
                      <p>{estDiamondPcs !== null ? estDiamondPcs : product.estimated_pcs || "--"}</p>
                    </div>
                </div>
                <div className="product-title">
                  {product.products_name || "--"}
                </div>
                <div className="product-description">
                  {product.products_description || "--"}
                </div>
                <div style={{ display: "none", gap: 24, margin: "14px 0 20px 0" }}>
                  <span>⚙️</span>
                  <span>🔗</span>
                  <span>❤️</span>
                  <span>🔄</span>
                </div>
                <button className="ad-cart">
                  <i class="fa fa-shopping-cart"></i> ADD TO CART
                </button>
                <div className="expert-info">
                  <p>HAVE QUESTIONS? OUR EXPERTS ARE AVAILABLE TO ASSIST YOU</p>
                  <div style={{ marginTop: 8 }}>
                    <span style={{ marginRight: 18 }}>📞 +1 (800) 530-2647</span>
                    <span>✉️ EMAIL US</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: 24, color: "#888" }}>No product found.</div>
            )}
          </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Bands;
