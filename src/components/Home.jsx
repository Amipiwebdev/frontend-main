// src/components/Home.jsx

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

// ✅ category copy (TOP LEVEL - NOT inside useEffect)
const CATEGORY_COPY = {
  "WEDDING BANDS": "Wedding bands, your way—solid gold, diamonds and everything in between.",
  "ONE-OF-A-KINDS": "Featuring unique and hand-sourced gemstones from all over the world.",
  "BEST SELLERS": "From solid gold staples to diamond jewelry, browse our most-loved pieces.",
  "ENGAGEMENT RINGS": "From lab-grown to antique diamonds, explore our unique engagement designs.",
  "EARRINGS": "From studs to statement earrings—find your next favorite pair.",
  "BRACELETS & BANGLES": "Stackable classics and bold pieces for every day.",
  "STUDS": "Diamond studs for every style—classic, bold, and timeless.",
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

const safeHref = (cat) => cat?.url || cat?.link || "#";

const Home = () => {
  const [heroSlides, setHeroSlides] = useState(FALLBACK_HERO_SLIDES);
  const [categories, setCategories] = useState([]);
  const [testimonials, setTestimonials] = useState([]);

  const device = useMemo(() => (window.innerWidth < 768 ? "mobile" : "desktop"), []);

  useEffect(() => {
    const retailerId = localStorage.getItem("parentRetailerId") || 0;

    api
      .get("/home", { params: { retailer_id: retailerId, device } })
      .then((res) => {
        const blocks = res?.data?.blocks || [];

        // ✅ Slider
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

        // ✅ Categories
        const catBlock = blocks.find((b) => b?.key === "categories");
        const catRows = Array.isArray(catBlock?.data) ? catBlock.data : [];

        setCategories(
          catRows
            .filter((c) => c?.title)
            .map((c) => ({
              id: c.id,
              title: c.title,
              image: c.image,      // API image (bigger)
              thumb: c.thumb,      // API thumb
              link: normalizeLink(c.link),
              url: normalizeLink(c.url),
            }))
        );

        // ✅ Testimonials
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
        setTestimonials([]);
      });
  }, [device]);

  return (
    <div className="home-page">
      <Topbar />
      <Header />

      {/* ✅ HERO SLIDER (ONLY IMAGE) */}
      <section className="hero-section">
        <Swiper
          spaceBetween={0}
          slidesPerView={1}
          loop={heroSlides.length > 1}
          modules={[Autoplay, Pagination]}
          pagination={{ clickable: true }}
          autoplay={heroSlides.length > 1 ? { delay: 6500, disableOnInteraction: false } : false}
        >
          {heroSlides.map((slide) => (
            <SwiperSlide key={slide.id}>
              <div
                className="hero-slide"
                style={{
                  backgroundImage: `url("${encodeURI(slide.image)}")`,
                  cursor: slide.link ? "pointer" : "default",
                }}
                onClick={() => slide.link && (window.location.href = slide.link)}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </section>

      {/* ✅ CATEGORIES (Image Cards like screenshot) */}
      <section className="home-categories-v2">
        <div className="custom-container">
          <div className="home-categories-v2__grid">
            {categories.map((cat) => {
              const href = safeHref(cat);
              const clickable = href && href !== "#";
              const title = toTitleCase(cat.title || "Category");
              const desc = CATEGORY_COPY[(cat.title || "").toUpperCase()] || "Explore our curated selection.";
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
                  {/* <p className="home-categories-v2__desc">{desc}</p> */}
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* ✅ TESTIMONIALS SLIDER */}
      <section className="testimonial-section">
        <div className="custom-container">
          <div className="testimonial-head">
            <div>
              <p className="section-kicker">Testimonials</p>
              <h2 className="section-title">
                Customers <span className="text-highlight">Love Working</span> With Us
              </h2>
            </div>
            <div className="testimonial-nav-note">Slide through to see what partners are saying.</div>
          </div>

          <Swiper
            spaceBetween={24}
            slidesPerView={1}
            loop={testimonials.length > 1}
            modules={[Autoplay, Pagination]}
            pagination={{ clickable: true }}
            autoplay={testimonials.length > 1 ? { delay: 7000, disableOnInteraction: false } : false}
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
            <div style={{ opacity: 0.7, marginTop: 10, fontSize: 14 }}>
              No testimonials available.
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;