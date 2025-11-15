import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function CarouselSection() {
    const [currentIndex, setCurrentIndex] = useState(0);
    // horizontal photos
    const images = [
      "public/images/temp_b.jpg",
      "public/images/temp_cb.jpg",
      "public/images/temp_gr.jpg",
      "public/images/temp_img.jpg",
      "public/images/temp_t.jpg"
    ];
  
    // auto-slide effect changes shown image every 5 seconds
    useEffect(() => {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => 
          prevIndex === images.length - 1 ? 0 : prevIndex + 1
        );
      }, 5000); // 5ms = 5 sec
  
      return () => clearInterval(interval); // cleanup on unmount
    }, [images.length]);
  
    return (
      <section className='relative w-screen  bg-[#FFFDF4] overflow-hidden'>
        {/* carousel container */}
        <div className='relative w-screen h-[500px] md:h-[600px] lg:h-[700px]'>
          {/* images */}
          {images.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={image}
                alt={`Carousel ${index + 1}`}
                className='w-full h-full object-cover'
              />
            </div>
          ))}
  
          {/* overlay text */}
          <div className='absolute inset-0 flex items-center justify-center z-10'>
            <div className='text-center text-white px-8 py-6'>
              <h2 className='text-4xl md:text-5xl lg:text-6xl pt-0.1 pb-0.1 pr-0.5 pl-0.5 font-serif leading-tight rounded-xl backdrop-blur-sm backdrop-brightness-90'>
                Never Forget Your Roots
              </h2>
              {/* contact button */}
        <div className='flex justify-center mt-12'>
          <Link
            to="/contact"
            className='inline-block px-8 py-3 bg-[#7E4C3C] text-white text-lg font-serif hover:bg-[#AB8C4B] transition'
          >
            Book With Me!
          </Link>
        </div>
            </div>
            
          </div>
          
          {/* carousel indicators to show which image visitor is on, clickable if visitor wants to click on a specific one */}
          <div className='absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-3 z-10'>
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentIndex 
                    ? 'bg-white w-8' 
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
        
      </section>
    );
  }
  
  export default CarouselSection;