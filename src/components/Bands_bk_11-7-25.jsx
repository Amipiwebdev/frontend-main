import React, { useEffect, useState } from 'react';
import Header from './common/Header';
import Footer from './common/Footer';
import axios from 'axios';
import Topbar from './common/Topbar';

const Bands = () => {
  const seo_url = "bands-test";
  // All available options (for names/images)
  const [stoneTypes, setStoneTypes] = useState([]);
  const [styleGroups, setStyleGroups] = useState([]);
  const [styleCategories, setStyleCategories] = useState([]);
  const [shapes, setShapes] = useState([]);
  const [metals, setMetals] = useState([]);
  const [qualities, setQualities] = useState([]);
  // Only enabled/allowed option IDs from filter-options API
  const [enabled, setEnabled] = useState({
    stone_types: [],
    style_groups: [],
    style_categories: [],
    shapes: [],
    metals: [],
    qualities: [],
    diamond_sizes: [],
  });
  const [diamondSizes, setDiamondSizes] = useState([]);
  const [selected, setSelected] = useState({
    stone_type: null,
    style_group: null,
    style_category: null,
    shape: null,
    metal: null,
    quality: null,
    diamond_size: null,
  });
  const [product, setProduct] = useState(null);

  // For ring size dropdown
  const [ringOptions, setRingOptions] = useState([]);
  const [selectedRingOption, setSelectedRingOption] = useState(null);
  const [estDiamondPcs, setEstDiamondPcs] = useState(null);
  const [estCaratWt, setEstCaratWt] = useState(null);
  const [estPrice, setEstPrice] = useState(null);

  const [initDone, setInitDone] = useState(false); // To prevent double fetch on first render

  // Helpers
  const getImageUrl = file => file?.startsWith('http') ? file : `https://www.amipi.com/ampvd/product_images/${file}`;
  const getVideoUrl = file => file?.startsWith('http') ? file : `https://www.amipi.com/ampvd/product_video/${file}`;

  // 1. Fetch all available options for names/images + set initial defaults
 useEffect(() => {
  axios.get(`http://localhost:3001/api/catnav/${seo_url}`).then(async res => {
    const nav = res.data[0];

    // Fetch all available for display
    const [
      stoneTypesRes,
      styleGroupsRes,
      styleCategoriesRes,
      shapesRes,
      metalsRes,
      qualitiesRes,
    ] = await Promise.all([
      axios.get(`http://localhost:3001/api/productstonetype/byids/${nav.category_navigation_sub_stone_type}`),
      axios.get(`http://localhost:3001/api/stylegroup/byids/${nav.category_navigation_sub_category_group}`),
      axios.get(`http://localhost:3001/api/stylecategory/byids/${nav.category_navigation_sub_category}`),
      axios.get(`http://localhost:3001/api/shapes/byids/${nav.shap_display}`),
      axios.get(`http://localhost:3001/api/metaltype/byids/${nav.metal_type_display}`),
      axios.get(`http://localhost:3001/api/quality/byids/${nav.qualities_display}`),
    ]);

    setStoneTypes(stoneTypesRes.data);
    setStyleGroups(styleGroupsRes.data);
    setStyleCategories(styleCategoriesRes.data);
    setShapes(shapesRes.data);
    setMetals(metalsRes.data);
    setQualities(qualitiesRes.data);

    // Set initial defaults ONLY
    setSelected({
      stone_type: Number(nav.category_navigation_default_sub_stone_type),
      style_group: nav.category_navigation_default_sub_category_group
        ? Number(nav.category_navigation_default_sub_category_group)
        : Number((nav.category_navigation_sub_category_group || '').split(',')[0]),
      style_category: Number(nav.category_navigation_default_sub_category),
      shape: Number(nav.shap_default),
      metal: Number(nav.metal_type_default),
      quality: nav.qualities_default ? Number(nav.qualities_default) : null,
      diamond_size: null,
    });
  });
}, [seo_url]);

  // 2. Smart filtering: Get enabled IDs after each filter change
  useEffect(() => {
  // Only run if at least the main filters are set (skip on empty)
  if (!selected.stone_type || !selected.style_group || !selected.style_category || !selected.shape || !selected.metal || !selected.quality) return;

  axios.get('http://localhost:3001/api/filter-options', { params: selected }).then(res => {
    setEnabled(res.data);
    setDiamondSizes(res.data.diamond_sizes);

    // For each filter, only change selected if current value is NOT enabled.
    setSelected(prev => ({
      ...prev,
      stone_type: res.data.stone_types.includes(prev.stone_type) ? prev.stone_type : res.data.stone_types[0] || null,
      style_group: res.data.style_groups.includes(prev.style_group) ? prev.style_group : res.data.style_groups[0] || null,
      style_category: res.data.style_categories.includes(prev.style_category) ? prev.style_category : res.data.style_categories[0] || null,
      shape: res.data.shapes.includes(prev.shape) ? prev.shape : res.data.shapes[0] || null,
      metal: res.data.metals.includes(prev.metal) ? prev.metal : res.data.metals[0] || null,
      quality: res.data.qualities.includes(prev.quality) ? prev.quality : res.data.qualities[0] || null,
      diamond_size: res.data.diamond_sizes.includes(prev.diamond_size) ? prev.diamond_size : res.data.diamond_sizes[0] || null,
    }));
  });
}, [
  selected.stone_type,
  selected.style_group,
  selected.style_category,
  selected.shape,
  selected.metal,
  selected.quality,
]);


  // 3. Fetch product for current selection
  useEffect(() => {
    if (!selected.stone_type || !selected.style_group || !selected.style_category || !selected.shape || !selected.metal || !selected.quality || !selected.diamond_size) return;
    axios
      .get('http://localhost:3001/api/product', { params: selected })
      .then(r => setProduct(r.data))
      .catch(() => setProduct(null));
  }, [selected]);

  // 4. Fetch available options (ring sizes) for the loaded product
  useEffect(() => {
    if (!product?.products_id) {
      setRingOptions([]);
      setSelectedRingOption(null);
      return;
    }
    axios.get(`http://localhost:3001/api/product-options/${product.products_id}`)
      .then(r => {
        setRingOptions(r.data || []);
        if (r.data && r.data.length > 0) {
          setSelectedRingOption(r.data[0]);
        }
      })
      .catch(() => {
        setRingOptions([]);
        setSelectedRingOption(null);
      });
  }, [product?.products_id]);

  // 5. Calculate Est. Diamond Pcs, Est. Carat Wt, Price based on selected ring size option
  useEffect(() => {
    if (!product) return;
    let diamondPcs = Number(product.estimated_pcs || product.diamond_pics || 2);
    let caratWeight = Number(product.total_carat_weight || 0);
    let price = Number(product.products_price1 || product.products_price || 0);

    if (selectedRingOption) {
      // Diamond Pcs
      if (selectedRingOption.options_symbol && selectedRingOption.estimated_weight !== null) {
        const estW = Number(selectedRingOption.estimated_weight);
        switch (selectedRingOption.options_symbol) {
          case '+': diamondPcs += estW; break;
          case '-': diamondPcs -= estW; break;
          case '*': diamondPcs *= estW; break;
          case '/': diamondPcs /= estW; break;
          default: break;
        }
      }
      // Carat Weight
      if (selectedRingOption.estimated_symbol && selectedRingOption.estimated_weight !== null) {
        const estW = Number(selectedRingOption.estimated_weight);
        switch (selectedRingOption.estimated_symbol) {
          case '+': caratWeight += estW; break;
          case '-': caratWeight -= estW; break;
          case '*': caratWeight *= estW; break;
          case '/': caratWeight /= estW; break;
          default: break;
        }
      }
      // Price
      if (selectedRingOption.options_symbol && selectedRingOption.options_price !== null) {
        const optPrice = Number(selectedRingOption.options_price);
        switch (selectedRingOption.options_symbol) {
          case '+': price += optPrice; break;
          case '-': price -= optPrice; break;
          case '*': price *= optPrice; break;
          case '/': price /= optPrice; break;
          default: break;
        }
      }
    }

    setEstDiamondPcs(diamondPcs);
    setEstCaratWt(caratWeight);
    setEstPrice(price);
  }, [product, selectedRingOption]);

  function handleFilterChange(key, value) {
    setSelected(prev => ({ ...prev, [key]: value, ...(key !== "diamond_size" && { diamond_size: null }) }));
  }

  // Gallery logic
  let galleryMedia = [];
  if (product?.videos?.length > 0) {
    galleryMedia.push({ type: 'video', url: product.videos[0] });
  }
  if (product?.images?.length > 0) {
    product.images.slice(0, 4 - galleryMedia.length).forEach(url => {
      galleryMedia.push({ type: 'image', url });
    });
  }
  while (galleryMedia.length < 4) galleryMedia.push(null);

  return (
    <div>
      <Topbar />
      <Header />
      <div className="container">
        <div className="product-customizer-page">
          <div className="main-content" style={{ display: 'flex', gap: 40 }}>
            {/* LEFT GALLERY */}
            <div style={{ flex: '0 0 70%', maxWidth: '70%' }}>
              <div className="left-gallery-grid">
                {galleryMedia.map((item, i) => {
                  if (!item) {
                    return <div key={i} className="gallery-image-link" style={{ background: "#f5f5f8" }} />;
                  }
                  if (item.type === 'video') {
                    return (
                      <a key={i} href={getVideoUrl(item.url)} target="_blank" rel="noopener noreferrer" className="gallery-image-link" title="View video">
                        <video
                          src={getVideoUrl(item.url)}
                          className="gallery-image"
                          style={{ background: "#000" }}
                          autoPlay
                          muted
                          loop
                          controls
                          playsInline
                        />
                      </a>
                    );
                  }
                  return (
                    <a key={i} href={getImageUrl(item.url)} target="_blank" rel="noopener noreferrer" className="gallery-image-link" title="View image">
                      <img src={getImageUrl(item.url)} alt={`Product view ${i + 1}`} className="gallery-image" />
                    </a>
                  );
                })}
              </div>
            </div>
            {/* RIGHT FILTERS */}
            <div className="right-filters" style={{ flex: '0 0 30%', maxWidth: '30%' }}>
              <h4 className="filter-label">Stone Type</h4>
              <div className="filter-group">
                {stoneTypes.map(st => (
                  <button
                    key={st.pst_id}
                    className={'filter-btn' + (selected.stone_type === st.pst_id ? ' selected' : '')}
                    disabled={!enabled.stone_types.includes(st.pst_id)}
                    onClick={() => handleFilterChange('stone_type', st.pst_id)}
                  >
                    <img src={`https://www.amipi.com/images/stone_type/${st.pst_image}`} alt={st.pst_name} width={90} height={90} />
                    {st.pst_name}
                  </button>
                ))}
              </div>
              <h4 className="filter-label">Design</h4>
              <div className="filter-group">
                {styleGroups.map(st => (
                  <button
                    key={st.psg_id}
                    className={'filter-btn' + (selected.style_group === st.psg_id ? ' selected' : '')}
                    disabled={!enabled.style_groups.includes(st.psg_id)}
                    onClick={() => handleFilterChange('style_group', st.psg_id)}
                  >
                    <img src={`https://www.amipi.com/images/style_group/${st.psg_image}`} alt={st.psg_name} width={90} height={90} />
                    {st.psg_name}
                  </button>
                ))}
              </div>
              <h4 className="filter-label">Setting Style</h4>
              <div className="filter-group">
                {styleCategories.map(sc => (
                  <button
                    key={sc.psc_id}
                    className={'filter-btn' + (selected.style_category === sc.psc_id ? ' selected' : '')}
                    disabled={!enabled.style_categories.includes(sc.psc_id)}
                    onClick={() => handleFilterChange('style_category', sc.psc_id)}
                  >
                    <img src={`https://www.amipi.com/images/style_category/${sc.psc_image}`} alt={sc.psc_name} width={90} height={90} />
                    {sc.psc_name}
                  </button>
                ))}
              </div>
              <h4 className="filter-label">Diamond Shape</h4>
              <div className="filter-group">
                {shapes.map(sh => (
                  <button
                    key={sh.id}
                    className={'filter-btn' + (selected.shape === sh.id ? ' selected' : '')}
                    disabled={!enabled.shapes.includes(sh.id)}
                    onClick={() => handleFilterChange('shape', sh.id)}
                  >
                    <img src={`https://www.amipi.com/images/shape/${sh.image}`} alt={sh.name} width={90} height={90} />
                    {sh.name}
                  </button>
                ))}
              </div>
              <h4 className="filter-label">Metal</h4>
              <div className="filter-group">
                {metals.map(m => (
                  <button
                    key={m.dmt_id}
                    className={'filter-btn' + (selected.metal === m.dmt_id ? ' selected' : '')}
                    disabled={!enabled.metals.includes(m.dmt_id)}
                    onClick={() => handleFilterChange('metal', m.dmt_id)}
                    title={m.dmt_tooltip}
                  >
                    <div
                      style={{
                        width: 48, height: 48, borderRadius: '50%', background: m.color_code,
                        margin: '0 auto 8px auto', border: '2px solid #eee', boxShadow: '0 2px 10px #22305213'
                      }}
                    />
                    {m.dmt_name}
                  </button>
                ))}
              </div>
              <h4 className="filter-label">Diamond Quality</h4>
              <div className="quality-filter-group">
                {qualities.map(q => (
                  <button
                    key={q.dqg_id}
                    className={
                      'quality-btn' +
                      (selected.quality === q.dqg_id ? ' selected' : '')
                    }
                    disabled={!enabled.qualities.includes(q.dqg_id)}
                    onClick={() => handleFilterChange('quality', q.dqg_id)}
                  >
                    <div className="quality-alias">{q.dqg_alias}</div>
                    <div
                      className={
                        'quality-origin ' +
                        (q.dqg_origin === 'Lab Grown'
                          ? 'lab-grown'
                          : 'earth-mined')
                      }
                    >
                      {q.dqg_origin}
                    </div>
                  </button>
                ))}
              </div>
              <h4 className="filter-label">Diamond Size</h4>
              <div className="filter-group">
                {diamondSizes.map(size => (
                  <button
                    key={size}
                    className={"filter-btn" + (selected.diamond_size === size ? " selected" : "")}
                    disabled={!enabled.diamond_sizes.includes(size)}
                    onClick={() => handleFilterChange("diamond_size", size)}
                  >
                    {size} ct
                  </button>
                ))}
              </div>

              {/* Ring Size Dropdown */}
              {ringOptions.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <h4 className="filter-label">Choose Ring Size</h4>
                  <select
                    value={selectedRingOption?.value_id || ''}
                    style={{ width: "100%", padding: "10px", fontSize: "16px", borderRadius: 4 }}
                    onChange={e => {
                      const opt = ringOptions.find(o => o.value_id === Number(e.target.value));
                      setSelectedRingOption(opt || null);
                    }}
                  >
                    {ringOptions.map(opt =>
                      <option key={opt.value_id} value={opt.value_id}>{opt.value_name}</option>
                    )}
                  </select>
                </div>
              )}

            </div>
          </div>
          {/* ------ PRODUCT DETAILS ------ */}
          <div className="product-details">
            {product ? (
              <div style={{ borderRadius: 8, boxShadow: '0 4px 16px #0002', padding: 24, maxWidth: 500, background: "#fff" }}>
                {/* Top Section */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, justifyContent: 'space-between' }}>
                  <div>
                    <strong>YOUR SELECTION</strong>
                    <div style={{ fontSize: 14, marginTop: 6 }}>Size: <b>{selectedRingOption?.value_name || '--'}</b></div>
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#888', fontSize: 12 }}>
                    #{product.products_style_no || '--'}
                  </div>
                </div>
                {/* Banner Section */}
                <div style={{
                  background: '#223052',
                  color: '#fff',
                  borderRadius: 8,
                  padding: 14,
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: 20,
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{product.dqg_alias || '--'}</div>
                    <div style={{ fontSize: 13 }}>{product.center_stone_name || '--'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13 }}>Est. Carat Wt*</div>
                    <div style={{ fontSize: 22, fontWeight: 'bold', marginTop: 2 }}>
                      {estCaratWt !== null
                        ? Number(estCaratWt).toFixed(2)
                        : (product.total_carat_weight || '--')
                      } CT <span style={{ fontSize: 12 }}>[+/- 5%]</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 'bold' }}>
                    ${estPrice !== null
                      ? Number(estPrice).toFixed(0)
                      : (product.products_price1 || product.products_price || '--')}
                  </div>
                </div>
                {/* Meta Section */}
                <div style={{ display: 'flex', fontSize: 15, justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <div><b>Metal</b></div>
                    <div>{product.metal_name || '--'}</div>
                  </div>
                  <div>
                    <div><b>Design</b></div>
                    <div>{product.style_group_name || '--'}</div>
                  </div>
                  <div>
                    <div><b>Setting Style</b></div>
                    <div>{product.style_category_name || '--'}</div>
                  </div>
                </div>
                {/* More Details */}
                <div style={{ display: 'flex', fontSize: 15, justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <div><b>Diamond Shape</b></div>
                    <div>{product.diamond_shape_name || '--'}</div>
                  </div>
                  <div>
                    <div><b>Diamond Size</b></div>
                    <div>{product.diamond_size || `${product.total_carat_weight || '--'} CT (Each)`}</div>
                  </div>
                  <div>
                    <div><b>Est. Diamond Pcs*</b></div>
                    <div>{estDiamondPcs !== null ? estDiamondPcs : (product.estimated_pcs || '2')}</div>
                  </div>
                </div>
                {/* ...Rest unchanged... */}
                <div style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 4 }}>
                  {product.products_name || '--'}
                </div>
                <div style={{ fontSize: 15, color: '#444', marginBottom: 10 }}>
                  {product.products_description || '--'}
                </div>
                <div style={{ display: 'flex', gap: 24, margin: '10px 0 16px 0' }}>
                  <span>⚙️</span>
                  <span>🔗</span>
                  <span>❤️</span>
                  <span>🔄</span>
                </div>
                <button style={{
                  background: '#223052',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 5,
                  padding: '12px 24px',
                  fontWeight: 'bold',
                  fontSize: 18,
                  cursor: 'pointer',
                  float: 'right'
                }}>🛒 ADD TO CART</button>
                <div style={{
                  marginTop: 50,
                  background: "#f4f6f8",
                  borderRadius: 7,
                  padding: 14,
                  color: "#444"
                }}>
                  <div>HAVE QUESTIONS? OUR EXPERTS ARE AVAILABLE TO ASSIST YOU</div>
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
      <Footer />
    </div>
  );
};

export default Bands;
