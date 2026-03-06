import { Link } from "react-router-dom";

function Services() {
 const heroImg = "/images/temp_img.jpg";
 const ctaImg = "/images/temp_booking.jpg";

 const packages = [
   {
     name: "Mini Session",
     price: "$250",
     img: "/images/temp_ia.jpg",
     points: [
       "30 minutes",
       "20 edited images",
       "Online gallery",
       "1 location",
     ],
   },
  
   {
     name: "Full Session",
     price: "$400",
     img: "/images/temp_hw.jpg",
     points: [
       "1 hour",
       "Full gallery",
       "Online gallery",
       "Multiple poses & prompts",
     ],
   },
   {
     name: "Family Session",
     price: "$450",
     img: "/images/temp_tc.jpg",
     points: [
       "60–90 minutes",
       "Full gallery",
       "Up to 6 people",
       "Location guidance",
     ],
   },
   {
     name: "Maternity",
     price: "$375",
     img: "/images/temp_b.jpg",
     points: [
       "1 hour",
       "35+ edited images",
       "Optional outfit changes",
       "Romantic posing",
     ],
   },
   {
     name: "Newborn (Lifestyle)",
     price: "$475",
     img: "/images/temp_k.jpg",
     points: [
       "In-home session",
       "2 hours",
       "Full gallery",
       "Natural lifestyle posing",
     ],
   },
   {
     name: "Couples / Engagement",
     price: "$375",
     img: "/images/temp_lp.jpg",
     points: [
       "60–90 minutes",
       "Full gallery",
       "Location planning",
       "Candid + posed shots",
     ],
   },
 ];


 return (
   <div className="">
     <div className="relative w-full text-white font-serif">
       <img className="object-cover h-100 md:h-110 lg:h-120 w-full" src={heroImg} />
       <div className="absolute inset-0 flex items-center justify-center">
         <div className="text-center text-4xl md:text-5xl lg:text-6xl text-shadow-sm font-extralight
                         w-11/12 md:w-7/12 lg:w-1/2">
           <p>Investment</p>
           <p className="text-base md:text-lg lg:text-xl mt-4 font-sans font-light">capturing your story with warmth & emotion</p>
         </div>
       </div>
     </div>


     <div className="mx-5 md:mx-10 lg:mx-15 my-12 md:my-16 lg:my-20">
       <p className="font-serif text-center text-3xl md:text-4xl mb-10">Photography Packages</p>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
         {packages.map((p, i) => (
           <div key={i} className="border border-neutral-200">
             <img src={p.img} className="object-cover h-60 w-full" />
             <div className="p-5">
               <h2 className="font-serif text-2xl">{p.name}</h2>
               <p className="text-brown font-semibold mt-2">{p.price}</p>
               <ul className="mt-4 text-sm space-y-1">
                 {p.points.map((pt, idx) => (
                   <li key={idx}>{pt}</li>
                 ))}
               </ul>
               <Link to="/inquiry"
                 className="flex justify-center items-center w-full mt-6 bg-brown hover:bg-[#AB8C4B] h-12 text-white text-sm">
                 Book Now
               </Link>
             </div>
           </div>
         ))}
       </div>
     </div>


     <div className="bg-[#887C62] text-white py-12 md:py-16 lg:py-20">
       <div className="mx-5 md:mx-10 lg:mx-15">
         <p className="font-serif text-3xl md:text-4xl">Special Services</p>
         <p className="mt-3 font-sans text-sm md:text-base">for moments that deserve their own story</p>


         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
           <Link to="/services/weddings" className="block border border-white/30">
             <img src="/images/temp_t.jpg" className="object-cover h-56 w-full" />
             <div className="p-5">
               <h4 className="font-serif text-2xl">Weddings</h4>
               <p className="text-sm mt-2">Full or half-day coverage, timeline help, galleries & prints.</p>
               <span className="inline-block mt-4 underline">View Packages</span>
             </div>
           </Link>


           <Link to="/services/labor-delivery" className="block border border-white/30">
             <img src="/images/temp_s.jpg" className="object-cover h-56 w-full" />
             <div className="p-5">
               <h4 className="font-serif text-2xl">Labor & Delivery</h4>
               <p className="text-sm mt-2">On-call experience documenting your birth story with care.</p>
               <span className="inline-block mt-4 underline">Learn More</span>
             </div>
           </Link>
         </div>
       </div>
     </div>


     <div className="relative h-auto w-full">
       <img className="absolute w-full object-cover object-[30%_35%] h-100 md:h-110 lg:h-120" src={ctaImg} />
       <div className="absolute flex flex-col my-25 w-full justify-between">
         <div className="flex pl-10 md:pl-13 lg:pl-15 h-1/3">
           <p className="text-white text-2xl md:text-3xl lg:text-4xl font-serif">let’s get you booked</p>
         </div>
         <div className="flow-root my-24">
           <div className="flex flex-col float-left md:float-right lg:float-right pl-10 md:pr-13 lg:pr-15">
             <p className="font-mono text-white">YOUR ROOTS PHOTOGRAPHY</p>
              <a className='flex justify-center items-center w-full mx-auto mt-5 mb-6 md:mb-8 lg:mb-10
                             bg-brown hover:bg-[#AB8C4B] h-12 text-white text-sm'
                href="mailto:Your.rootsphotography@gmail.com">
                CONTACT ME!
              </a>
           </div>
         </div>
       </div>
       <div className="invisible pb-100 md:pb-110 lg:pb-120">.</div>
     </div>
   </div>
 );
}

export default Services;