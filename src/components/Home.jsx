import React, { useEffect, useMemo, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

import Header from "./common/Header";
import Footer from "./common/Footer";
import Topbar from "./common/Topbar";

import SliderOneImg from "../images/banner/banner_1.jpg";
import SliderTwoImg from "../images/banner/banner_2.jpg";

import { api } from "../apiClient";

const FALLBACK_HERO_SLIDES = [
  { id: "local-1", image: SliderOneImg, link: null },
  { id: "local-2", image: SliderTwoImg, link: null },
];

const CATEGORY_COPY = {
  "WEDDING BANDS": "Wedding bands, your way—solid gold, diamonds and everything in between.",
  "ONE-OF-A-KINDS": "Featuring unique and hand-sourced gemstones from all over the world.",
  "BEST SELLERS": "From solid gold staples to diamond jewelry, browse our most-loved pieces.",
  "ENGAGEMENT RINGS": "From lab-grown to antique diamonds, explore our unique engagement designs.",
  EARRINGS: "From studs to statement earrings—find your next favorite pair.",
  "BRACELETS & BANGLES": "Stackable classics and bold pieces for every day.",
  STUDS: "Diamond studs for every style—classic, bold, and timeless.",
};

const StarRating = ({ value }) => (
  <div className="star-rating" aria-label={`Rated ${value} out of 5`}>
    {Array.from({ length: 5 }).map((_, index) => (
      <i
        key={index}
        className={`${index < value ? "fas" : "far"} fa-star`}
        aria-hidden="true"
      />
    ))}
  </div>
);

function normalizeLink(link) {
  if (!link) return null;
  const l = String(link).trim();
  if (!l) return null;
  if (l.startsWith("http://") || l.startsWith("https://")) return l;
  return l.startsWith("/") ? l : `/${l}`;
}

function initialsFromName(name) {
  const n = (name || "").trim();
  if (!n) return "??";
  return n
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const toTitleCase = (str = "") =>
  str
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");

const safeHref = (obj) => obj?.url || obj?.link || "#";

const formatMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
};

const Home = () => {
  const [heroSlides, setHeroSlides] = useState(FALLBACK_HERO_SLIDES);
  const [categories, setCategories] = useState([]);
  const [jewelleryTabs, setJewelleryTabs] = useState([]);
  const [activeJewelleryTab, setActiveJewelleryTab] = useState(0);
  const [diamondDeals, setDiamondDeals] = useState([]);
  const [testimonials, setTestimonials] = useState([]);

  const device = useMemo(
    () => (window.innerWidth < 768 ? "mobile" : "desktop"),
    []
  );

  useEffect(() => {
    const retailerId = localStorage.getItem("parentRetailerId") || 0;

    api
      .get("/home", { params: { retailer_id: retailerId, device } })
      .then((res) => {
        const blocks = res?.data?.blocks || [];

        // HERO SLIDER
        const sliderBlock = blocks.find((b) => b?.key === "slider");
        const slides = Array.isArray(sliderBlock?.data) ? sliderBlock.data : [];

        if (slides.length) {
          const mappedSlides = slides
            .filter((s) => s?.image)
            .map((s) => ({
              id: s.id,
              image: s.image,
              link: normalizeLink(s.link),
            }));
          setHeroSlides(mappedSlides.length ? mappedSlides : FALLBACK_HERO_SLIDES);
        } else {
          setHeroSlides(FALLBACK_HERO_SLIDES);
        }

        // CATEGORIES
        const catBlock = blocks.find((b) => b?.key === "categories");
        const catRows = Array.isArray(catBlock?.data) ? catBlock.data : [];

        setCategories(
          catRows
            .filter((c) => c?.title)
            .map((c) => ({
              id: c.id,
              title: c.title,
              image: c.image,
              thumb: c.thumb,
              link: normalizeLink(c.link),
              url: normalizeLink(c.url),
            }))
        );

        // JEWELLERY SUPER DEALS
        const jewelleryBlock = blocks.find((b) => b?.key === "super_deal_jewellery");
        const jewelleryRows = Array.isArray(jewelleryBlock?.data) ? jewelleryBlock.data : [];

        const mappedJewelleryTabs = jewelleryRows.map((tab) => ({
          categoryId: tab.category_id,
          categoryName: tab.category_name || "Category",
          categorySlug: tab.category_slug || "",
          shopAllLink: normalizeLink(tab.shop_all_link),
          items: Array.isArray(tab.items)
            ? tab.items.map((item) => ({
                id: item.id,
                name: item.name || item.model || "Product",
                model: item.model || null,
                image: item.thumb || item.image || "https://amipi.com/images/image-not-availbale.jpg",
                link: normalizeLink(item.url || item.link),
                promotion: item.product_promotion || null,
                price: item.price,
                showPrice: Number(item.show_price || 0) === 1,
                isNew: Number(item.is_new || 0) === 1,
                loginRequiredForPrice: Number(item.login_required_for_price || 0) === 1,
              }))
            : [],
        }));

        setJewelleryTabs(mappedJewelleryTabs);
        setActiveJewelleryTab(0);

        // DIAMOND SUPER DEALS
        const dealBlock = blocks.find((b) => b?.key === "super_deal_diamond");
        const dealRows = Array.isArray(dealBlock?.data) ? dealBlock.data : [];

        setDiamondDeals(
          dealRows
            .filter((d) => d?.id)
            .map((d) => ({
              id: d.id,
              link: normalizeLink(d.url || d.link),
              image: d.thumb || d.image,
              shape: d.shape_name,
              carat: d.carat_weight,
              color: d.color_name,
              clarity: d.clarity_name,
              cut: d.cut_name,
              polish: d.polish,
              symmetry: d.symmetry,
              fluorescence: d.fluorescence,
              certificate: d.certificate_company,
              certificateNo: d.certificate_number,
              stockNo: d.stock_no,
              isNew: Number(d.is_new_diamond || 0) === 1,
              discount: d.discount_percent,
              showPrice: Number(d.show_price || 0) === 1,
              price: d.price ?? null,
              pricePerCarat: d.price_per_carat ?? null,
              diamondType: d.diamond_type ?? null,
            }))
        );

        // TESTIMONIALS
        const testiBlock = blocks.find((b) => b?.key === "testimonials");
        const testiRows = Array.isArray(testiBlock?.data) ? testiBlock.data : [];

        if (testiRows.length) {
          setTestimonials(
            testiRows.map((t) => ({
              id: t.id,
              name: t.name || "Customer",
              title: t.review_title || t.company_name || "",
              message: t.message || "",
              rating: Number(t.rating || 0),
              image: t.image || null,
            }))
          );
        } else {
          setTestimonials([]);
        }
      })
      .catch(() => {
        setHeroSlides(FALLBACK_HERO_SLIDES);
        setCategories([]);
        setJewelleryTabs([]);
        setActiveJewelleryTab(0);
        setDiamondDeals([]);
        setTestimonials([]);
      });
  }, [device]);

  const activeJewelleryItems =
    jewelleryTabs[activeJewelleryTab] && Array.isArray(jewelleryTabs[activeJewelleryTab].items)
      ? jewelleryTabs[activeJewelleryTab].items
      : [];

  return (
    <div className="home-page">
      <Topbar />
      <Header />

      {/* HERO */}
      <section className="hero-section">
        <Swiper
          spaceBetween={0}
          slidesPerView={1}
          loop={heroSlides.length > 1}
          modules={[Autoplay, Pagination]}
          pagination={{ clickable: true }}
          autoplay={
            heroSlides.length > 1
              ? { delay: 6500, disableOnInteraction: false }
              : false
          }
        >
          {heroSlides.map((slide) => (
            <SwiperSlide key={slide.id}>
              <div
                className="hero-slide"
                style={{
                  backgroundImage: `url("${slide.image}")`,
                  cursor: slide.link ? "pointer" : "default",
                }}
                onClick={() => {
                  if (slide.link) window.location.href = slide.link;
                }}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </section>

      {/* CATEGORIES */}
      <section className="home-categories-v2">
        <div className="custom-container">
          <div className="section-head">
            <h2 className="section-title">
              Shop <span className="text-highlight">Categories</span>
            </h2>
          </div>

          <div className="home-categories-v2__grid">
            {categories.map((cat) => {
              const href = safeHref(cat);
              const clickable = href && href !== "#";
              const title = toTitleCase(cat.title || "Category");
              const desc =
                CATEGORY_COPY[(cat.title || "").toUpperCase()] ||
                "Explore our curated selection.";
              const imgSrc = cat.image || cat.thumb;

              return (
                <a
                  key={cat.id}
                  href={href}
                  className={`home-categories-v2__card ${clickable ? "" : "is-disabled"}`}
                  onClick={(e) => {
                    if (!clickable) e.preventDefault();
                  }}
                  aria-disabled={!clickable}
                >
                  <div className="home-categories-v2__media">
                    <img src={imgSrc} alt={title} loading="lazy" decoding="async" />
                  </div>
                  <h3 className="home-categories-v2__title">{title}</h3>
                  <p className="home-categories-v2__desc">{desc}</p>
                </a>
              );
            })}
          </div>

          {!categories.length && (
            <div className="empty-state">No categories available.</div>
          )}
        </div>
      </section>

      {/* JEWELLERY SUPER DEALS */}
      <section className="jewellery-superdeals">
        <div className="custom-container">
          <div className="section-head">
            <h2 className="section-title">
              Jewellery <span className="text-highlight">Superdeals</span>
            </h2>

            {jewelleryTabs[activeJewelleryTab]?.shopAllLink ? (
              <a
                className="view-all-link"
                href={jewelleryTabs[activeJewelleryTab].shopAllLink}
              >
                Shop all
              </a>
            ) : null}
          </div>

          {!!jewelleryTabs.length && (
            <div className="jewellery-tabs">
              {jewelleryTabs.map((tab, index) => (
                <button
                  key={tab.categoryId || tab.categorySlug || index}
                  type="button"
                  className={`jewellery-tab-btn ${
                    activeJewelleryTab === index ? "is-active" : ""
                  }`}
                  onClick={() => setActiveJewelleryTab(index)}
                >
                  {tab.categoryName}
                </button>
              ))}
            </div>
          )}

          {!!activeJewelleryItems.length && (
            <Swiper
              className="jewellery-superdeals-swiper"
              spaceBetween={18}
              slidesPerView={1}
              loop={activeJewelleryItems.length > 1}
              modules={[Autoplay, Pagination]}
              pagination={{ clickable: true }}
              autoplay={
                activeJewelleryItems.length > 1
                  ? { delay: 5500, disableOnInteraction: false }
                  : false
              }
              breakpoints={{
                576: { slidesPerView: 2 },
                992: { slidesPerView: 3 },
                1200: { slidesPerView: 4 },
              }}
            >
              {activeJewelleryItems.map((item) => {
                const href = item.link || "#";
                const clickable = href !== "#";

                return (
                  <SwiperSlide key={item.id}>
                    <a
                      href={href}
                      className={`jsd-card ${clickable ? "" : "is-disabled"}`}
                      onClick={(e) => {
                        if (!clickable) e.preventDefault();
                      }}
                      aria-disabled={!clickable}
                    >
                      <div className="jsd-card__img">
                        <img src={item.image} alt={item.name} loading="lazy" />
                        {item.isNew ? <span className="jsd-badge">NEW</span> : null}
                      </div>

                      <div className="jsd-card__body">
                        <div className="jsd-card__title">{item.name}</div>

                        {item.promotion ? (
                          <div className="jsd-card__promo">{item.promotion}</div>
                        ) : null}

                        <div className="jsd-card__price">
                          {item.showPrice && item.price !== null
                            ? formatMoney(item.price)
                            : item.loginRequiredForPrice
                            ? "Login to view price"
                            : "Call for price"}
                        </div>
                      </div>
                    </a>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          )}

          {!jewelleryTabs.length && (
            <div className="empty-state">No jewellery superdeals available.</div>
          )}
        </div>
      </section>

      {/* DIAMOND SUPER DEALS */}
      <section className="diamond-superdeals">
        <div className="custom-container">
          <div className="section-head">
            <h2 className="section-title">
              Diamond <span className="text-highlight">Superdeals</span>
            </h2>
            <a className="view-all-link" href="/diamonds/?Is_Superdeal=1">
              View all
            </a>
          </div>

          <Swiper
            spaceBetween={18}
            slidesPerView={1}
            loop={diamondDeals.length > 1}
            modules={[Autoplay, Pagination]}
            pagination={{ clickable: true }}
            autoplay={
              diamondDeals.length > 1
                ? { delay: 6000, disableOnInteraction: false }
                : false
            }
            breakpoints={{
              576: { slidesPerView: 2 },
              992: { slidesPerView: 3 },
              1200: { slidesPerView: 4 },
            }}
          >
            {diamondDeals.map((d) => {
              const href = d.link || "#";
              const clickable = href !== "#";

              const title = `${d.shape || ""} ${(Number(d.carat) || 0).toFixed(2)}ct ${
                d.color || ""
              } ${d.clarity || ""}`.trim();

              const showMoney = d.showPrice && d.price !== null;

              return (
                <SwiperSlide key={d.id}>
                  <a
                    className={`ds-card ${clickable ? "" : "is-disabled"}`}
                    href={href}
                    onClick={(e) => {
                      if (!clickable) e.preventDefault();
                    }}
                    aria-disabled={!clickable}
                  >
                    <div className="ds-card__img">
                      <img src={d.image} alt={title} loading="lazy" />
                      {d.isNew ? <span className="ds-badge">NEW</span> : null}
                      {typeof d.discount === "number" ? (
                        <span className="ds-discount">
                          {Number(d.discount).toFixed(2)}%
                        </span>
                      ) : null}
                    </div>

                    <div className="ds-card__body">
                      <div className="ds-card__title">{title}</div>

                      <div className="ds-card__meta">
                        {[d.cut, d.polish, d.symmetry, d.fluorescence]
                          .filter(Boolean)
                          .join(" • ")}
                      </div>

                      <div className="ds-card__meta2">
                        {d.certificate ? <span>{d.certificate}</span> : null}
                        {d.certificateNo ? <span>#{d.certificateNo}</span> : null}
                        {d.stockNo ? <span>Stock: {d.stockNo}</span> : null}
                      </div>

                      <div className="ds-card__price">
                        {showMoney ? formatMoney(d.price) : "Call for price"}
                      </div>
                    </div>
                  </a>
                </SwiperSlide>
              );
            })}
          </Swiper>

          {!diamondDeals.length && (
            <div className="empty-state">No diamond superdeals available.</div>
          )}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonial-section">
        <div className="custom-container">
          <div className="testimonial-head">
            <div>
              <p className="section-kicker">Testimonials</p>
              <h2 className="section-title">
                Customers <span className="text-highlight">Love Working</span> With Us
              </h2>
            </div>
            <div className="testimonial-nav-note">
              Slide through to see what partners are saying.
            </div>
          </div>

          <Swiper
            spaceBetween={24}
            slidesPerView={1}
            loop={testimonials.length > 1}
            modules={[Autoplay, Pagination]}
            pagination={{ clickable: true }}
            autoplay={
              testimonials.length > 1
                ? { delay: 7000, disableOnInteraction: false }
                : false
            }
            breakpoints={{
              768: { slidesPerView: 2 },
              1200: { slidesPerView: 3 },
            }}
          >
            {testimonials.map((item) => (
              <SwiperSlide key={item.id || item.name}>
                <div className="testimonial-card">
                  {item.image ? (
                    <div className="testimonial-avatar has-image" aria-hidden="true">
                      <img src={item.image} alt={item.name} />
                    </div>
                  ) : (
                    <div className="testimonial-avatar" aria-hidden="true">
                      {initialsFromName(item.name)}
                    </div>
                  )}

                  <p className="testimonial-message">“{item.message}”</p>
                  <StarRating value={item.rating} />

                  <div className="testimonial-author">
                    <div className="author-name">{item.name}</div>
                    <div className="author-title">{item.title}</div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {!testimonials.length && (
            <div className="empty-state">No testimonials available.</div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;