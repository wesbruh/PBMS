import CarouselSection from "../../components/HomePageComps/CarouselPhotos";

function Home() {
  const temp_bg_img = "images/temp_home_bg.jpg";
  const temp_ia_img = "images/temp_ia.jpg";
  const temp_upsideD_img = "images/temp_upsideD.jpg";

  // curly design 
  const sectionDesign = <svg
    className='hidden xl:block absolute right-0 -top-10 w-[1120px] h-[1120px] opacity-30 z-0'
    viewBox='0 0 1200 1200' fill='none'
  >
    <path
      d='M400,600 C240,240 560,320 720,480 C920,680 1200,800 1600,200'
      stroke="#D8D6C9" strokeWidth='2' fill='none'
    />
  </svg>;

  return (
    <div>
      {/* Home background image  */}
      <div className='relative '>
        <div className='relative w-full'>
          <img className='object-cover object-bottom sm:h-200 md:h-200 lg:h-200 w-full ' src={temp_bg_img} alt="Home Background Image" />
          <div className='absolute font-serif top-[30%] left-8  text-left  text-white z-10 max-w-4xl '>
            <h1 className='sm:text-3xl md:text-4xl lg:text-4xl leading-normal'>preserve your emotions and connections</h1>
          </div>
          <div className='absolute font-mono bottom-[14%] left-[65%] text-center m-3 text-white'>
            <h2 className='sm:text-3xl md:text-3xl lg:text-3xl leading-snug'>Candid & Romance Photographer, <br /> Northern CA</h2>
          </div>
        </div>
      </div>

      {/* Section 1 */}
      <section className='relative grid grid-cols-1 md:grid-cols-3  gap-4 m-5 min-h-170 overflow-hidden '>
        {sectionDesign}

        {/* title, order: mobile 1st, desktop 3rd */}
        <div className='font-serif pt-10 pr-5 pl-1 z-10 order-1 md:order-3 md:col-start-3'>
          <h1 className='relative text-2xl md:text-4xl lg:text-5xl text-center md:text-right  text-[#7E4C3C]'>
            documentary photography that tells your story</h1>
        </div>

        {/* image section, order: mobile 2nd, desktop 1st */}
        <div className='font-serif  pt-10 order-2 md:order-1' >
          <h1 className='font-serif text-center pb-5 text-md md:text-xl lg:text-2xl  text-[#7E4C3C] z-10'>
            Life is unique
          </h1>
          <img className='relative object-cover object-top sm:h-140 md:h-140 lg:h-140 sm:w-100 md:w-125 lg:w-125 rounded-xl z-10' src={temp_ia_img} alt="second home image" />
        </div>

        {/* paragraph section, order: mobile 3rd, desktop 2nd */}
        <div className='relative z-10 flex flex-col justify-end text-left ml-5 mr-5 md:mb-20 order-3 md:order-2'>
          <p className='relative font-serif sm:text-md md:text-lg lg:text-xl  md:min-h-75 overflow-hidden  text-[#3a4848]'>
            Every moment in life is unique, and photography allows me to capture these
            moments in all their natural beauty. Through my lens, I preserve the emotions,
            the connections, and the memories as they unfold.
          </p>
        </div>
      </section>

      {/* Section 2 */}
      <section className='relative grid grid-cols-2 md:gap-4 mx-2 md:mx-5'>
        {sectionDesign}

        {/* image,  always left column in desktop or mobile view */}
        <div className='relative flex justify-center md:justify-start items-center'>
          <img className='object-contain w-full  md:w-[75%] lg:w-[75%] md:ml-[10%] my-5 rounded-xl drop-shadow-[-10px_10px_8px_rgba(0,0,0,0.15)] md:drop-shadow-[-25px_30px_8px_rgba(0,0,0,0.15)]' src={temp_upsideD_img} alt="Life is Unique image" />
        </div>

        {/* text content, always right column */}
        <div className='font-serif z-10 px-2 md:px-0'>
          <h1 className='text-xl md:text-4xl lg:text-5xl pt-2 text-center text-[#7E4C3C] leading-tight md:leading-normal'>
            Welcome friend,<br /> my name is Bailey
          </h1>
          <h2 className='font-serif text-xs md:text-lg lg:text-xl mt-10 md:mt-20 text-center text-[#7E4C3C] '>
            LEARN A LITTLE ABOUT MY ROOTS</h2>
          <p className='font-serif text-xs md:text-lg lg:text-xl text-center mt-3  md:mr-2 md:pr-2 pt-3 md:pt-2 pb-3 text-[#3a4848]'>
            I was born and raised in Northern CA, this is where I grew my roots and was shaped into the person I am today.
            I have a strong relationship with the people and nature in this part of the world as it is what made me.
            It also presented me with the opportunity to meet my husband, the sweetest puppy in the whole world, and my son.
            I have always been a big family person and loved spending time with my loved ones because its when I feel the most like myself.
            Overall I just LOVE, love.</p>
        </div>
      </section>

      {/* quote */}
      <p className='relative font-serif text-[#7E4C3C] text-center text-lg lg:text-2xl mt-10 mb-10 w-full'>
        "We never leave our roots. We just grow new branches." <br />Aubrey Meadows</p>

      {/* Section 3 */}
      <section className='relative'>
        <CarouselSection />
      </section>

    </div>
  );
}

export default Home;