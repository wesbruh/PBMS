import React from "react";

export default function About() {
  
  const hero = "/images/Aboutmeimage.jpg";

  return (
    <div className="bg-[url('/images/BackgroundBorder.png')] 
                 bg-cover 
                 bg-center 
                 bg-no-repeat 
                 py-24 md:py-32 lg:py-20">
      
      <div className="mx-2 md:mx-4 lg:mx-5">
       
        <div className="relative mx-auto max-w-300 grid grid-cols-1 lg:grid-cols-[minmax(0,450px)_minmax(0,1fr)] gap-10 lg:gap-16 items-center">

          {/* Left: image  */}
          <div className="relative w-full max-w-125 mx-auto"> 
            <div className="absolute -left-10 top-10 w-[86%] h-[86%] bg-[#F1EFE7] rounded-sm" />
            <img
              src={hero}
              alt="Photographer portrait in a field"
              className="relative block w-full aspect-2/3 object-cover shadow-sm"
            />
          </div>

          {/* Right: text */}
          <div className="relative lg:flex lg:flex-col lg:justify-center lg:pl-10 xl:pl-14"> 
            <svg
              className="hidden xl:block absolute -right-32 top-6 w-140 h-140 opacity-40"
              viewBox="0 0 600 600" fill="none"
            >
              <path
                d="M200,300 C120,120 280,160 360,240 C460,340 520,320 580,200"
                stroke="#D8D6C9" strokeWidth="2" fill="none"
              />
            </svg>

            {/* Pre-title*/}
            <p className="font-serif font-semibold text-[32px] text-brown mb-10 uppercase">
              Before you share your story...
            </p>

            {/* Title:  */}
            <h1 className="font-serif font-semibold text-4xl md:text-5xl text-brown mb-14 -ml-2 md:-ml-6 lg:ml-0 xl:-ml-10
                           lg:whitespace-nowrap">
              let me tell you mine!
            </h1>

            {/* Body*/}
            <div className="max-w-140  font-semibold text-[15px] md:text-[16px] leading-8 text-neutral-700 space-y-6 z-10">
              <p>
                Hello!! I'm a 24-year-old self-taught photographer based in Northern California.
                 I'm a wife to my high school sweetheart, a mama to a sweet baby boy born in April 2024,
                  a Rottweiler dog mom, an interior design enthusiast and a self-proclaimed plant lover.
              </p>
              <p>
               I've been drawn to photography for as long as I can remember—from capturing my animals growing up, to documenting family vacations, to creating fun backyard photoshoots with my siblings.
                In 2023, I decided to turn this lifelong passion into a dream, 
                and I've been in love with it ever since
              </p>
              <p>
                Being born and raised in Northern California has shaped who I am and how I see the world. 
                With beaches, lakes, mountains, valleys, farms, and city life all nearby, there's always 
                beauty and adventure waiting to be captured.
              </p>
              <p>
                After my very first photoshoot, I realized this was more than just a hobby. I fell in love with capturing real emotions, genuine connections, and moments that can be cherished forever.
                 I'm incredibly grateful to do what I do and to learn each of my client's unique stories.
              </p>
              <p>
                I can't wait to meet you—and I can't wait to tell your story next.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}