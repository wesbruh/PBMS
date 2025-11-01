import CarouselSection from "../../components/HomePageComps/CarouselPhotos";

function Home() {
  const temp_bg_img = "public/images/temp_home_bg.jpg";
  const temp_ia_img = "public/images/temp_ia.jpg";
  const temp_upsideD_img ="public/images/temp_upsideD.jpg";

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
    <div className='relative min-h-screen'>
      <div className='w-full'>
        <img className='object-cover object-bottom md:h-200 lg:h-200 w-full ' src={temp_bg_img} alt="Home Background Image" />
        <div className='absolute font-serif ml-[5%] top-[30%] left-[25%] transform -translate-x-1/2 -translate-y-1/2 text-left m-4 text-white z-10 max-w-4xl px-8'>
        <h1 className='md:text-4xl lg:text-5xl leading-normal'>preserve your emotions and connections</h1>
      </div>
      <div className='absolute font-serif bottom-[10%] left-[65%] text-center m-3 text-white'> 
        <h2 className='text-2xl md:text-2xl lg:text-3xl leading-snug'>Candid & Romance Photographer, <br /> Northern CA</h2>
      </div>
      </div>
    </div>

    {/* Section 1 */}
    <section className='relative grid grid-cols-3 md:grid-cols-3'>
      {sectionDesign}
      <div className='font-serif' >
      <h1 className='font-mono text-center  md:text-1xl lg:text-2xl ml-[15%] pt-[11%] pl-[4%] pb-[4%] text-[#7E4C3C] z-10'> 
        Life is unique
      </h1>
        <img className='object-cover object-top md:h-140 lg:h-140 w-125 ml-[10%] mt-[5%] mb-20 rounded-xl z-10' src={temp_ia_img} alt="second home image" />
        </div>
        <div className='z-10'>
          
          <p className='font-mono  md:text-lg lg:text-xl text-left mt-[95%] ml-[22%] text-[#3a4848]'>
            Every moment in life is unique, and photography allows me to capture these
             moments in all their natural beauty. Through my lens, I preserve the emotions, 
             the connections, and the memories as they unfold.</p>
        </div>
        <div className='font-serif z-10'>
          <h1 className='text-4xl md:text-4xl lg:text-6xl text-right mr-[20%] mt-[25%] text-[#7E4C3C]'>
            documentary photography that tells your story</h1>
        </div>
        </section>

        {/* Section 2 */}
        <section className='relative grid grid-cols-2 md:grid-cols-2 mt-20'>
          {sectionDesign}
      <div className='relative'>
        <img className=' object-contain sm:w-50 md:w-50 lg:w-[70%] ml-[10%] mt-[10%] mb-10 rounded-xl drop-shadow-[-35px_35px_14px_rgba(0,0,0,0.25)]' src={temp_upsideD_img} alt="Life is Unique image" />
        </div>
        <div className='font-serif z-10'>
          <h1 className='text-xl md:text-6xl lg:text-7xl pt-[15%] text-left text-[#7E4C3C]'>welcome friend,<br /> my name is bailey
          </h1>
          <h2 className=' font-mono text-md md:text-lg lg:text-xl pt-[14%] text-left text-[#7E4C3C] '>LEARN A LITTLE ABOUT MY ROOTS</h2>
          <p className=' font-mono text-md md:text-lg lg:text-xl text-left  mr-[5%] pr-[5%] pt-[5%] text-[#3a4848]'>
            I was born and raised in Northern CA, this is where I grew my roots and was shaped into the person I am today. 
            I have a strong relationship with the people and nature in this part of the world as it is what made me. 
            It also presented me with the opportunity to meet my husband, the sweetest puppy in the whole world, and my son.
            I have always been a big family person and loved spending time with my loved ones because its when I feel the most like myself. 
            Overall I just LOVE, love.</p>
            <p className='font-serif text-[#7E4C3C] text-center md:text-lg lg:text-xl m-20 mr-30 pt-10'>"We never leave our roots. We just grow new branches." <br />Aubrey Meadows</p>
        </div>
        </section>

        {/* Section 3 */}
        <section className='relative'>
          <CarouselSection />        
        </section>

    </div>
  );
}

export default Home