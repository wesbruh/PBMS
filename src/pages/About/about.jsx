import React from "react";

export default function About() {
  
  const hero = "/images/temp_client.jpg";

  return (
    <div className="">
      
      <div className="mx-2 md:mx-4 lg:mx-5 my-10 md:my-14">
       
        <div className="relative mx-auto max-w-[1200px] grid grid-cols-1 lg:grid-cols-[minmax(0,450px)_minmax(0,1fr)] gap-10 lg:gap-16 items-center">

          {/* Left: image  */}
          <div className="relative w-full max-w-[560px] mx-auto"> 
            <div className="absolute -left-10 top-10 w-[86%] h-[86%] bg-[#F1EFE7] rounded-sm" />
            <img
              src={hero}
              alt="Photographer portrait in a field"
              className="relative block w-full h-auto max-w-full object-cover shadow-sm"
            />
          </div>

          {/* Right: text */}
          <div className="relative lg:flex lg:flex-col lg:justify-center lg:pl-10 xl:pl-14"> 
            <svg
              className="hidden xl:block absolute -right-32 top-6 w-[560px] h-[560px] opacity-40"
              viewBox="0 0 600 600" fill="none"
            >
              <path
                d="M200,300 C120,120 280,160 360,240 C460,340 520,320 580,200"
                stroke="#D8D6C9" strokeWidth="2" fill="none"
              />
            </svg>

            {/* Pre-title*/}
            <p className="font-mono text-[14px] tracking-[0.25em] text-brown mb-14">
              BEFORE YOU SHARE YOUR STORY..
            </p>

            {/* Title:  */}
            <h1 className="font-serif font-light text-4xl md:text-5xl lg:text-6xl text-brown mb-14 -ml-2 md:-ml-6 lg:ml-0 xl:-ml-10
                           lg:whitespace-nowrap">
              let me tell you mine..
            </h1>

            {/* Body*/}
            <div className="max-w-[560px] font-mono text-[15px] md:text-[16px] leading-8 text-neutral-600 space-y-6">
              <p>
                My name is Bailey White. I'm a 24 year old self-taught photographer, wife, mom,
                proud dog mom and a crazy plant lady.
              </p>
              <p>
                I've always loved taking pictures of others and capturing real life moments and the
                emotions that they bring. I have a very strong connection to photos as they hold
                onto moments that we only carry as memories afterwards. They allow you to reminisce
                on the past that has shaped you and allowed you to grow new branches.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}