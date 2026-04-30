import { useEffect, useState } from "react";
import BookNowButton from "../../components/Buttons/BookNowButton";

function Testimonials() {
  const [itr, setItr] = useState(0);

  const temp_list = [
    { client: "Izzy & Andrew", img: "/images/temp_ia.jpg", test: "You're so genuine and easy to vibe with! Having you behind the camera felt so normal!" },
    { client: "Hana & Westley", img: "/images/temp_hw.jpg", test: "You provided such beautiful photos that truly captured the essence of our love. Not only we’re the photos lovely, but the experience was fun- stress free and candid. You made us feel amazing about ourselves." },
    { client: "Karyne", img: "/images/temp_k.jpg", test: "You made me feel very comfortable and you were very professional! Best experience!" },
    { client: "The Carters", img: "/images/temp_tc.jpg", test: "Made our shoot feel so easy & fun, and did wonderful making our toddler have a blast" },
    { client: "Baylee", img: "/images/temp_b.jpg", test: "Amazing! Not stressful at all! You made me feel so beautiful" },
    { client: "Shelly", img: "/images/temp_s.jpg", test: "You made it so easy! You captured exactly what my daughter wanted." },
    { client: "Tina", img: "/images/temp_t.jpg", test: "Had our first session in September.. you were amazing" },
    { client: "Lexi Padilla", img: "/images/temp_lp.jpg", test: "Loveddd it, felt so comfortable. I cant wait for our next one!" }
  ];

  const temp_img = "/images/temp_img.jpg";
  const temp_booking = "/images/temp_booking.jpg";
  const GOOGLE_REVIEW_URL = "https://www.google.com/maps/place/Your+Roots+Photography/@38.8726015,-122.7047573,902583m/data=!3m1!1e3!4m8!3m7!1s0x4b67897ec0df59c9:0x7cba12b3c02b0bfa!8m2!3d38.898041!4d-120.0651799!9m1!1b1!16s%2Fg%2F11x3305chs?entry=ttu&g_ep=EgoyMDI2MDMxMS4wIKXMDSoASAFQAw%3D%3D";
  const YELP_REVIEW_URL = "https://www.yelp.com/writeareview/biz/63rzO6QWzrNijm7j-_00lw?return_url=%2Fbiz%2F63rzO6QWzrNijm7j-_00lw&review_origin=biz-details-war-button";
  const WIDGET_SCRIPT_SRC = "https://elfsightcdn.com/platform.js";
  const ELFSIGHT_APP_CLASS = "elfsight-app-6489279b-8ef7-45be-926b-6b213c14ba84";

  useEffect(() => {
    const existingScript = document.querySelector(`script[src="${WIDGET_SCRIPT_SRC}"]`);
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = WIDGET_SCRIPT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div className='overflow-x-hidden'>
      {/* Hero Section */}
      <div className='mx-2 md:mx-4 lg:mx-5 my-10 md:my-14'>
        <div className='relative justify-center-safe h-auto w-full text-center text-white font-serif'>
          <img className='object-cover h-135 md:h-100 lg:h-145 w-full' src={temp_img} alt="Testimonials hero" />
          <div className='flex flex-row space-x-4 absolute top-0 left-0 pl-10 md:pl-13 lg:pl-15 lg:max-w-1/5 py-10 lg:py-15 text-sm'>
            <p>love.</p>
            <p>memories.</p>
            <p className='lg:pr-100'>forever.</p>
          </div>
          <div className='absolute inset-0 flex items-center justify-center'>
            <div className='text-center text-4xl md:text-5xl lg:text-6xl text-shadow-sm font-extralight w-11/12 md:w-7/12 lg:w-10/24 px-4 rounded-xl backdrop-blur-sm backdrop-brightness-90 leading-tight md:leading-snug lg:leading-snug'>
              <p>Love notes from people I've photographed</p>
            </div>
          </div>
        </div>

        {/* Review Links Section */}
        <div className='my-10 flex flex-col justify-center items-center px-4'>
          <div className='w-full max-w-6xl text-center'>
            {/* <p className='font-sans text-md md:text-lg  text-brown mb-4 uppercase'>Client Reviews</p> */}
            <h2 className='font-serif text-3xl md:text-4xl text-brown mb-4'>Read what my clients are saying!</h2>
            <p className='font-sans text-sm md:text-base text-gray-600 max-w-3xl mx-auto mb-8 leading-7'>
              Browse live Google and Yelp reviews from past clients, or leave a review if we've worked together.
            </p>

            <div className='flex flex-col md:flex-row justify-center gap-4 mb-10'>
              <a
                href={GOOGLE_REVIEW_URL}
                target="_blank"
                rel="noopener noreferrer"
                className='flex justify-center items-center min-w-56 px-6 h-12 bg-brown hover:bg-[#AB8C4B] text-white text-sm font-sans rounded-md transition-colors uppercase'
              >
                Leave a Google Review
              </a>

              <a
                href={YELP_REVIEW_URL}
                target="_blank"
                rel="noopener noreferrer"
                className='flex justify-center items-center min-w-56 px-6 h-12 border border-brown text-brown hover:bg-gray-100 text-sm font-sans rounded-md transition-colors uppercase'
              >
                Leave a Yelp Review
              </a>
            </div>

            <div className='w-full bg-white rounded-sm min-h-40'>
              <div className='px-2 md:px-4 lg:px-6 py-4'>
                <div className={ELFSIGHT_APP_CLASS} data-elfsight-app-lazy></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Footer Section */}
      <div className='relative h-100 md:h-110 lg:h-120 w-full'>
        <img className='absolute inset-0 w-full h-full object-cover object-[30%_35%]' src={temp_booking} alt="Booking section" />
        <div className='absolute inset-0 flex flex-col justify-between py-20 px-10 md:px-13 lg:px-15'>
          <p className='text-white text-3xl md:text-4xl lg:text-5xl font-serif'>Let's get you booked!</p>
          <div className='flex flex-col items-start md:items-end'>
            <p className='font-serif text-white text-sm tracking-widest uppercase'>Your Roots Photography</p>
            {/* contact button */}
              <BookNowButton
                className='flex px-8 py-3 bg-[#7E4C3C] text-lg font-sans cursor-pointer hover:bg-[#AB8C4B] justify-center items-center min-w-56 mt-5 h-12 text-white rounded-md transition-colors'
                label="Book With Me!"
              />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Testimonials;