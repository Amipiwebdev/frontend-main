import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import SliderOneImg from '../images/banner/banner_1.jpg';
import SliderTwoImg from '../images/banner/banner_2.jpg';
import Header from './common/Header';
import Footer from './common/Footer';
import Topbar from './common/Topbar';

const heroSlides = [
  {
    image: SliderOneImg,
    title: '1000s of GIA graded diamonds',
    highlight: 'with the best values in the nation!',
    description: [
      'Browse with actual videos and order by 5PM for next day delivery.',
      'Ask us about adding a fully customized Diamond Search Page to your retail website.'
    ]
  },
  {
    image: SliderTwoImg,
    title: 'Hand selected, ready to ship',
    highlight: 'premium stones and jewelry settings',
    description: [
      'Fast, friendly support and transparent pricing on every order.',
      'Let us build your private label diamond search experience.'
    ]
  }
];

const searchFilters = [
  {
    label: 'Shape',
    icon: 'fa-gem',
    options: ['Round', 'Cushion', 'Emerald', 'Princess', 'Radiant', 'Oval', 'Pear', 'Asscher', 'Heart']
  },
  {
    label: 'Carat Weight',
    icon: 'fa-balance-scale',
    options: ['0.50', '0.75', '1.00', '1.25', '1.50', '2.00', '3.00']
  },
  {
    label: 'Cut',
    icon: 'fa-cut',
    options: ['EX', 'VG', 'G', 'F']
  },
  {
    label: 'Color',
    icon: 'fa-palette',
    options: ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
  },
  {
    label: 'Clarity',
    icon: 'fa-star',
    options: ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2']
  }
];

const tradeShowHighlight = {
  title: 'RJO',
  location: 'Sheraton Downtown Phoenix',
  date: 'February 20 - 23, 2026',
  booth: 'Booth TBD'
};

const philosophyPoints = [
  {
    title: 'It is the Amipi way',
    description: 'We show up for the retailer: no hidden fees, no surprises & we work as an extension of your team.',
    icon: 'fa-hand-holding-heart'
  },
  {
    title: 'We say it like it is',
    description: 'You get only the essential, useful information to help you buy and sell quickly.',
    icon: 'fa-bullhorn'
  },
  {
    title: 'Transparent fixed pricing',
    description: 'No need to haggle. Honest, consistent pricing across every order.',
    icon: 'fa-scale-balanced'
  },
  {
    title: 'Clear terms & conditions',
    description: 'Expect clarity on policies, shipping and returns every single time.',
    icon: 'fa-file-lines'
  },
  {
    title: 'We know how to say sorry',
    description: 'If we make a mistake, we fix it fast, apologize and make the situation right.',
    icon: 'fa-face-smile'
  },
  {
    title: 'No bull',
    description: 'We stand for what we sell. We treat partners with respect and never waste your time.',
    icon: 'fa-shield-halved'
  }
];

const sellSteps = [
  {
    step: 1,
    title: 'Shop it around',
    description: 'Get a feel for the market and what you want for your diamond or jewelry.',
    icon: 'fa-magnifying-glass-dollar'
  },
  {
    step: 2,
    title: 'Offer us your final price',
    description: 'Share your number. We respond quickly with our best, no-bull offer.',
    icon: 'fa-hand-holding-dollar'
  },
  {
    step: 3,
    title: 'Ship and get paid',
    description: 'Send it in with prepaid, insured labels. We pay fast once inspected.',
    icon: 'fa-truck-fast'
  }
];

const testimonials = [
  {
    name: 'Julie Hilton',
    title: 'Independent Jeweler, Chicago',
    message:
      'Amipi makes it effortless to close sales with confident pricing and real videos. They feel like an in-house team.',
    rating: 5
  },
  {
    name: 'Marcus Patel',
    title: 'Retail Partner, Phoenix',
    message:
      'Their no-bull approach is real. Straight answers, quick shipping, and customers love the curated search pages.',
    rating: 5
  },
  {
    name: 'Dylan Cooper',
    title: 'Ecommerce Retailer',
    message:
      'Setup was easy and their inventory quality speaks for itself. I can promise next-day delivery with confidence.',
    rating: 4
  }
];

const StarRating = ({ value }) => (
  <div className="star-rating" aria-label={`Rated ${value} out of 5`}>
    {Array.from({ length: 5 }).map((_, index) => (
      <i
        key={index}
        className={`${index < value ? 'fas' : 'far'} fa-star`}
        aria-hidden="true"
      ></i>
    ))}
  </div>
);

const Home = () => {
  return (
    <div className="home-page">
      <Topbar />
      <Header />

      <section className="hero-section">
        <Swiper
          spaceBetween={0}
          slidesPerView={1}
          loop
          modules={[Autoplay, Pagination]}
          pagination={{ clickable: true }}
          autoplay={{ delay: 6500, disableOnInteraction: false }}
        >
          {heroSlides.map((slide, index) => (
            <SwiperSlide key={slide.title + index}>
              <div className="hero-slide" style={{ backgroundImage: `url(${slide.image})` }}>
                <div className="hero-overlay" />
                <div className="custom-container hero-content">
                  <p className="hero-kicker">GIA graded diamonds</p>
                  <h1>
                    {slide.title}{' '}
                    <span className="text-highlight">
                      {slide.highlight}
                    </span>
                  </h1>
                  <ul className="hero-list">
                    {slide.description.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <button className="cta-button">Search Diamonds</button>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </section>

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
        style={{ backgroundImage: `linear-gradient(180deg, rgba(13,21,46,0.65), rgba(13,21,46,0.65)), url(${SliderTwoImg})` }}
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
            loop
            modules={[Autoplay, Pagination]}
            pagination={{ clickable: true }}
            autoplay={{ delay: 7000, disableOnInteraction: false }}
            breakpoints={{
              768: { slidesPerView: 2 },
              1200: { slidesPerView: 3 }
            }}
          >
            {testimonials.map((item) => (
              <SwiperSlide key={item.name}>
                <div className="testimonial-card">
                  <div className="testimonial-avatar" aria-hidden="true">
                    {item.name
                      .split(' ')
                      .map((part) => part[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
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
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
