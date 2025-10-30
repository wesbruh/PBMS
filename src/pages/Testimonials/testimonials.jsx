import { useState } from "react";

function Testimonials() {
  const [itr, setItr] = useState(0);

  const prev = () => {
    setItr((prev) => (prev === 0 ? 7 : prev - 1));
  };

  const next = () => {
    setItr((prev) => (prev === 7 ? 0 : prev + 1));
  };

  const temp_img = "../public/images/temp_img.jpg"
  const temp_list = [
    { client: "Izzy & Andrew", img: "../public/images/temp_ia.jpg", test: "You're so genuine and easy to vibe with! Having you behind the camera felt so normal!" },
    { client: "Hana & Westley", img: "../public/images/temp_hw.jpg", test: "You provided such beautiful photos that truly captured the essence of our love. Not only we’re the photos lovely, but the experience was fun- stress free and candid. You made us feel amazing about ourselves." },
    { client: "Karyne", img: "../public/images/temp_k.jpg", test: "You made me feel very comfortable and you were very professional! Best experience!" },
    { client: "The Carters", img: "../public/images/temp_tc.jpg", test: "Made our shoot feel so easy & fun, and did wonderful making our toddler have a blast" },
    { client: "Baylee", img: "../public/images/temp_b.jpg", test: "Amazing! Not stressful at all! You made me feel so beautiful" },
    { client: "Shelly", img: "../public/images/temp_s.jpg", test: "You made it so easy! You captured exactly what my daughter wanted." },
    { client: "Tina", img: "../public/images/temp_t.jpg", test: "Had our first session in September.. you were amazing" },
    { client: "Lexi Padilla", img: "../public/images/temp_lp.jpg", test: "Loveddd it, felt so comfortable. I cant wait for our next one!" }
  ]
  const temp_booking = "../public/images/temp_booking.jpg"

  return (
    <div className=''>
      <div className='mx-2 md:mx-4 lg:mx-5'>
        <div className=''>
          <div className='relative justify-center-safe w-full 
                        text-center text-white font-serif'>
            <img className='object-cover h-135 md:h-100 lg:h-145 w-full' src={temp_img} />
            <div className='flex flex-row space-x-4 
                          w-full lg:w-1/5 py-10 lg:py-15 
                          absolute top-0 left-0 pl-10 md:pl-13 lg:pl-15
                          text-sm'>
              <p>love.</p>
              <p>memories.</p>
              <p className='lg:pr-100'>forever.</p>
            </div>
            <div className='absolute inset-0 flex items-center justify-center'>
              <div className='text-center text-4xl md:text-5xl lg:text-6xl text-shadow-sm font-extralight
                            w-11/12 md:w-7/12 lg:w-10/24'>
                <p>love Notes from people i"ve photographed</p>
              </div>
            </div>
          </div>
        </div>
        <div className='my-10 flex flex-col justify-center items-center'>
          <form className='flex flex-col font-mono text-xs' noValidate>
            <label>
              <p className=' text-center text-brown py-3'>NAME *</p>
              <input className='text-center border-neutral-200 border-b py-3 text-sm'
                id="name" name="name" type="text" size="64" autoComplete="off" autoCorrect="off" required />
            </label>

            <label>
              <p className='mt-6 text-center text-brown pb-5'>MESSAGE *</p>
              <textarea className='w-full h-20 min-h-20 text-center border-neutral-200 border-b focus:outline-none text-sm leading-8'
                id="message" type="text" maxLength="5000" rows="5" autoComplete="off" required />
            </label>
            <button className='flex justify-center items-center w-1/2 mx-auto mt-15 mb-6 md:mb-8 lg:mb-10
                             bg-brown hover:bg-[#AB8C4B] h-12 text-white text-sm'
              type="submit" >
              LEAVE A REVIEW!
            </button>
          </form>
        </div>
      </div>
      <div className='flex flex-col bg-[#887C62] text-white'>
        <div className='mt-8 md:mt-12 lg:mt-18'></div>
        <div className='flex flex-col md:flex-row lg:flex-row mx-5'>
          <div className='flex flex-col w-full md:h-80 lg:h-120 md:w-3/8 lg:w-3/8 md:mx-5 lg:mx-10'>
            <div className='font-mono font-extralight flex flex-col justify-between'>
              <p className='flex text-sm mt-5 md:mt-10 lg:mt-20 mb-5 md:mb-12 lg:mb-20'>
                TESTIMONIALS
              </p>
              <div className='flex md:h-44 lg:h-47 items-center'>
                <p className='flex text-xs md:text-xs lg:text-sm my-10 md:my-15 lg:my-25 w-4/5 md:w-full lg:w-full'>
                  "{temp_list[itr].test}"
                </p>
              </div>
            </div>
            <div className='font-sans font-extralight text-2xl mt-5 md:mt-18 lg:mt-20 mb-5 md:mb-12 lg:mb-20'>
              <p className='text-2xl md:text-3xl lg:text-3xl font-serif'>{temp_list[itr].client}</p>
            </div>
          </div>
          <div className='flex flex-col mr-0 md:mr-5 lg:mr-10 w-full md:w-5/8 lg:w-5/8'>
            <div className='relative h-auto w-full'>
              <div className='absolute right-0 flex flex-row border-red-400 h-full w-full'>
                <button onClick={prev} class="cursor-pointer bg-transparent text-transparent w-1/2">Previous</button>
                <button onClick={next} class="cursor-pointer bg-transparent text-transparent w-1/2">Next</button>
              </div>
              <img className='object-cover object-[center_65%] h-70 md:h-80 lg:h-100 w-full'
                src={temp_list[itr].img} />
            </div>
            <div className='w-full h-auto'>
              <div className='flex w-full h-auto font-sans font-extralight text-2xl mt-8 md:mt-10 lg:mt-12 mb-8 md:mb-10 lg:mb-12 justify-between'>
                <button type="button" onClick={prev} className="cursor-pointer">&larr;</button>
                <div className='flex flex-row py-2 text-xs'>
                  <p>{itr + 1}</p>
                  <p className='pl-3 pr-3'>/</p>
                  <p>8</p>
                </div>
                <button type="button" onClick={next} className="cursor-pointer">&rarr;</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className='relative h-100 md:h-110 lg:h-120 w-full'>
        <img className='absolute w-full object-cover object-[30%_35%] h-100 md:h-110 lg:h-120'
          src={temp_booking} />
        <div className='absolute flex flex-col my-25 w-full justify-between'>
          <div className='flex pl-10 md:pl-13 lg:pl-15 h-1/3'>
            <p className='text-white text-2xl md:text-3xl lg:text-4xl font-serif'>lets get you booked!</p>
          </div>
          <div className="flow-root my-24">
            <div className='flex flex-col float-left md:float-right lg:float-right pl-10 md:pr-13 lg:pr-15'>
              <p className='font-mono text-white'>YOUR ROOTS PHOTOGRAPHY</p>
                          <button className='flex justify-center items-center w-full mx-auto mt-5 mb-6 md:mb-8 lg:mb-10
                             bg-brown hover:bg-[#AB8C4B] h-12 text-white text-sm'
              type="submit" >
              CONTACT ME!
            </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Testimonials