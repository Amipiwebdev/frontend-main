// src/components/Home.jsx
// ✅ Hero slider API + ✅ Testimonials slider API
// ✅ No hardcoded hero text/overlay
// ✅ Existing functionality safe (fallbacks included)

import React, { useEffect, useMemo, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

import SliderOneImg from "../images/banner/banner_1.jpg";
import SliderTwoImg from "../images/banner/banner_2.jpg";

import Header from "./common/Header";
import Footer from "./common/Footer";
import Topbar from "./common/Topbar";

import { api } from "../apiClient";

// ✅ fallback hero slides (only image)
const FALLBACK_HERO_SLIDES = [
  { id: "local-1", image: SliderOneImg, link: null },
  { id: "local-2", image: SliderTwoImg, link: null },
];

// ✅ fallback testimonials (optional)
const FALLBACK_TESTIMONIALS = [];

// ------- Your existing data (unchanged) -------
const searchFilters = [
  {
    label: "Shape",
    icon: "fa-gem",
    options: ["Round", "Cushion", "Emerald", "Princess", "Radiant", "Oval", "Pear", "Asscher", "Heart"],
  },
  {
    label: "Carat Weight",
    icon: "fa-balance-scale",
    options: ["0.50", "0.75", "1.00", "1.25", "1.50", "2.00", "3.00"],
  },
  {
    label: "Cut",
    icon: "fa-cut",
    options: ["EX", "VG", "G", "F"],
  },
  {
    label: "Color",
    icon: "fa-palette",
    options: ["D", "E", "F", "G", "H", "I", "J", "K", "L"],
  },
  {
    label: "Clarity",
    icon: "fa-star",
    options: ["FL", "IF", "VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2"],
  },
];

const tradeShowHighlight = {
  title: "RJO",
  location: "Sheraton Downtown Phoenix",
  date: "February 20 - 23, 2026",
  booth: "Booth TBD",
};

const philosophyPoints = [
  {
    title: "It is the Amipi way",
    description: "We show up for the retailer: no hidden fees, no surprises & we work as an extension of your team.",
    icon: "fa-hand-holding-heart",
  },
  {
    title: "We say it like it is",
    description: "You get only the essential, useful information to help you buy and sell quickly.",
    icon: "fa-bullhorn",
  },
  {
    title: "Transparent fixed pricing",
    description: "No need to haggle. Honest, consistent pricing across every order.",
    icon: "fa-scale-balanced",
  },
  {
    title: "Clear terms & conditions",
    description: "Expect clarity on policies, shipping and returns every single time.",
    icon: "fa-file-lines",
  },
  {
    title: "We know how to say sorry",
    description: "If we make a mistake, we fix it fast, apologize and make the situation right.",
    icon: "fa-face-smile",
  },
  {
    title: "No bull",
    description: "We stand for what we sell. We treat partners with respect and never waste your time.",
    icon: "fa-shield-halved",
  },
];

const sellSteps = [
  {
    step: 1,
    title: "Shop it around",
    description: "Get a feel for the market and what you want for your diamond or jewelry.",
    icon: "fa-magnifying-glass-dollar",
  },
  {
    step: 2,
    title: "Offer us your final price",
    description: "Share your number. We respond quickly with our best, no-bull offer.",
    icon: "fa-hand-holding-dollar",
  },
  {
    step: 3,
    title: "Ship and get paid",
    description: "Send it in with prepaid, insured labels. We pay fast once inspected.",
    icon: "fa-truck-fast",
  },
];

// ------- helpers -------
const StarRating = ({ value }) => (
  <div className="star-rating" aria-label={`Rated ${value} out of 5`}>
    {Array.from({ length: 5 }).map((_, index) => (
      <i key={index} className={`${index < value ? "fas" : "far"} fa-star`} aria-hidden="true"></i>
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

// ------- Component -------
const Home = () => {
  const [heroSlides, setHeroSlides] = useState(FALLBACK_HERO_SLIDES);
  const [testimonials, setTestimonials] = useState(FALLBACK_TESTIMONIALS);

  const device = useMemo(() => (window.innerWidth < 768 ? "mobile" : "desktop"), []);

  useEffect(() => {
    const retailerId = localStorage.getItem("parentRetailerId") || 0;

    api
      .get("/home", { params: { retailer_id: retailerId, device } })
      .then((res) => {
        const blocks = res?.data?.blocks || [];

        // ✅ HERO SLIDER
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

        // ✅ TESTIMONIALS
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
          setTestimonials(FALLBACK_TESTIMONIALS);
        }
      })
      .catch(() => {
        setHeroSlides(FALLBACK_HERO_SLIDES);
        setTestimonials(FALLBACK_TESTIMONIALS);
      });
  }, [device]);

  return (
    <div className="home-page">
      <Topbar />
      <Header />

      {/* ✅ HERO SLIDER (ONLY IMAGE, NO TEXT, NO OVERLAY) */}
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
                onClick={() => {
                  if (!slide.link) return;
                  window.location.href = slide.link;
                }}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </section>

      {/* ✅ KEEP YOUR OTHER SECTIONS (unchanged) */}
      <section className="diamond-search">
        <div className="custom-container">
          <h2 className="section-title">
            Start Your <span className="text-highlight">Diamond Search</span> Here
          </h2>
          <div className="search-grid">
            {searchFilters.map((filter) => (
              <div key={filter.label} className="search-card">
                <div className="search-card-head">
                  <span className="icon-pill">
                    <i className={`fas ${filter.icon}`} aria-hidden="true"></i>
                  </span>
                  <span className="filter-label">{filter.label}</span>
                </div>
                <div className="option-row">
                  {filter.options.map((item) => (
                    <span key={item} className="option-chip">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="search-actions">
            <button className="cta-button ghost">Search Earth Mined Diamonds</button>
            <button className="cta-button">Search Lab Grown Diamonds</button>
          </div>
        </div>
      </section>

      <section
        className="trade-show-section"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(13,21,46,0.65), rgba(13,21,46,0.65)), url(${SliderTwoImg})`,
        }}
      >
        <div className="custom-container">
          <p className="section-kicker">Upcoming Trade Shows</p>
          <h2 className="section-title light">
            Come find out what the <span className="text-highlight">No-Bull Philosophy</span> is
          </h2>
          <p className="section-subtitle">See for yourself how we can help you make some money.</p>
          <div className="trade-card">
            <div className="trade-badge">{tradeShowHighlight.title}</div>
            <div className="trade-details">
              <h3>{tradeShowHighlight.location}</h3>
              <p>{tradeShowHighlight.date}</p>
              <p className="muted">{tradeShowHighlight.booth}</p>
            </div>
            <button className="cta-button">Schedule Appointment</button>
          </div>
        </div>
      </section>

      <section className="philosophy-section">
        <div className="custom-container">
          <h2 className="section-title">
            Experience The <span className="text-highlight">No Bull Philosophy</span>
          </h2>
          <div className="philosophy-grid">
            {philosophyPoints.map((item) => (
              <div key={item.title} className="philosophy-card">
                <div className="philosophy-icon">
                  <i className={`fas ${item.icon}`} aria-hidden="true"></i>
                </div>
                <div>
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sell-section">
        <div className="custom-container">
          <h2 className="section-title">
            Sell <span className="text-highlight">To Us</span>
          </h2>
          <p className="section-subtitle">
            Selling your diamonds and jewelry to Amipi is straightforward. Expect a quick, easy, no-bull experience.
          </p>
          <div className="sell-grid">
            {sellSteps.map((step) => (
              <div key={step.step} className="sell-card">
                <div className="step-number">{step.step}</div>
                <div className="sell-card-body">
                  <h4>{step.title}</h4>
                  <p>{step.description}</p>
                </div>
                <div className="sell-icon">
                  <i className={`fas ${step.icon}`} aria-hidden="true"></i>
                </div>
              </div>
            ))}
          </div>
          <div className="sell-cta">
            <h3>Start selling now!</h3>
            <p>We are here to help if you need it.</p>
            <button className="cta-button">Get Started</button>
          </div>
        </div>
      </section>

      {/* ✅ TESTIMONIAL SLIDER (API Driven) */}
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