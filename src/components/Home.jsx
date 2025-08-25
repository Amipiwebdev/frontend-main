import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import SliderOneImg from '../images/banner/banner_1.jpg';
import SliderTwoImg from '../images/banner/banner_2.jpg';
import Header from './common/Header';
import Footer from './common/Footer';
import Topbar from './common/Topbar';

const Home = () => {
  return (
    <div>
        <Topbar />
        <Header />
        <section className='swiper-section '>
            <Swiper
                    spaceBetween={0}
                    slidesPerView={1}          
                    breakpoints={{
                        1024: {
                            slidesPerView: 1,
                            spaceBetween: 0,
                        }
                        }}
                    >               
                        <SwiperSlide>
                            <div className="content" style={{ backgroundImage: `url(${SliderOneImg})` }}>                        
                            </div>                   
                        </SwiperSlide>
                        <SwiperSlide>
                            <div className="content" style={{ backgroundImage: `url(${SliderTwoImg})` }}>                        
                            </div>
                        </SwiperSlide>                
                    </Swiper>
        </section>
        <Footer />
    </div>
  )
}

export default Home
