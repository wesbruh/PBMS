import { Link } from "react-router-dom";
import GoToTop from '../../GoToTop';

function Labor() {
  const heroImg = "/images/temp_mother.jpg";

  const packages = [
    {
      name: "First Breath",
      price: "FROM: $400",
      img: "/images/temp_baby.jpg",
      points: [
        "Mother & Baby Room",
        "1 hour coverage",
        "48 Hour Sneak Previews",
        "First hours of Life",
        "Captures the first moments of life with family",
        "Downloadable Online Gallery",
        "30+ edited photos",
      ],
    },
    {
      name: "The Birth Story",
      price: "FROM: $1000",
      img: "/images/temp_tubes.jpg",
      points: [
        "Captures Special Moments From Your Labor",
        "Discounted Maternity Session",
        "Short Video of Precious memories to Hold Onto and Watch Back",
        "48 Hour Sneak Previews",
        "Downloadable Online Gallery",
        "100+ Edited Images",
      ],
    },
    {
      name: "From Womb to World",
      price: "FROM: $1500",
      img: "/images/temp_MB.jpg",
      points: [
        "Captures Special Moments From Your Labor",
        "Mother & Baby Room (1 Hour)",
        "Maternity Session Included",
        "Short Video of Precious memories to Hold Onto and Watch Back",
        "48 Hour Sneak Previews",
        "Downloadable Online Gallery",
        "150+ Edited Images",
      ],
    },
    {
      name: "Positive Test to First Breath",
      price: "$1750",
      img: "/images/temp_scan.jpg",
      points: [
        "Announcement Photos Discount",
        "Maternity Session Included",
        "Labor & Delivery Coverage",
        "Mother & Baby Room (1 Hour)",
        "Short Video of Precious memories to Hold Onto and Watch Back",
        "48 Hour Sneak Previews",
        "Downloadable Online Gallery",
        "150+ Edited Images",
      ],
    },
  ];

  const qa = [
    {
      q: "How do we officially book with you? Is there a deposit?",
      a: "Fill out an inquiry with your information and the package you are wanting to book and I will reach back out to confirm availability and pricing! There is a 30% deposit required in order to secure your booking!",
    },
    {
      q: "How long does it take to receive our final gallery?",
      a: "You will receive your finished gallery between 2–3 weeks from your L&D! You will receive sneak previews 48 hours after your special day!",
    },
    {
      q: "Do you offer custom packages if your options don’t work for us?",
      a: "YES! If you have a specific idea in your head in terms of what you're looking for in a photographer, just let me know and I can customize a package that best fits your needs!",
    },
    {
      q: "What if I don’t have a scheduled delivery date?",
      a: "That's totally fine! When your delivery date is near I will keep my phone on at all hours of the day waiting for a phone call! When you call I will drop everything and head to the hospital!",
    },
    {
      q: "What if my labor is too fast and you can't make it in time?",
      a: "If your labor happens too fast for me to capture it, I will only charge you for the First Breath package!",
    },
  ];

  return (
    <div className="bg-[#F8F4EA] text-black font-serif">
      {/* HERO */}
      <div className="relative w-full text-white">
        <img className="w-full object-cover h-[420px] md:h-[520px] lg:h-[620px]" src={heroImg} alt="" />

         <div className="absolute inset-0 bg-black/35" />

        <div className="absolute inset-0 flex flex-col justify-center pl-10 md:pl-20">
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">LABOR & DELIVERY PACKAGES</h1>
        </div>
      </div>

      {/* TITLE */}
      <p className="text-center mt-20 mb-14 font-sans text-sm tracking-[0.3em] uppercase text-neutral-600">
        L&D PACKAGES & PRICING
      </p>

      {/* PACKAGES */}
      <div className="mx-auto max-w-6xl px-4 md:px-8 lg:px-10 space-y-14">
        {packages.map((p, i) => (
          <div
            key={i}
            className= "grid grid-cols-1 md:grid-cols-2 gap-10 items-center rounded-3xl bg-white/60 backdrop-blur border border-black/5 shadow-sm p-6 md:p-10"
          >
             <div className={i % 2 === 1 ? "md:order-2" : "md:order-1"}>
              <img
                src={p.img}
                alt={p.name}
                className="w-full h-[320px] md:h-[380px] object-cover rounded-3xl shadow-md"
              />
            </div>

             <div className={i % 2 === 1 ? "md:order-1" : "md:order-2"}>
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#2b2b2b]">
                  {p.name}
                </h2>
                <p className="font-sans text-sm md:text-base tracking-widest uppercase text-[#7E4C3C]">
                  {p.price}
                </p>
              </div>
            
          
            <ul className="mt-6 space-y-2 text-[15px] md:text-base leading-7 md:leading-8 text-neutral-700 font-sans">
                {p.points.map((pt, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#7E4C3C] shrink-0" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex gap-3">
                <Link
                  to="/inquiry"
                  className="inline-flex items-center justify-center rounded-full bg-brown px-6 py-3 text-white text-sm hover:bg-[#AB8C4B] transition"
                >
                  Inquire
                </Link>
             </div>
          </div>
          </div>
        ))}
      </div>

      {/* Q&A SECTION */}
      <p className="text-center text-4xl mt-28 mb-14 font-serif">Q&A</p>
      <div className="mx-auto max-w-6xl px-4 md:px-8 lg:px-10 space-y-16 mb-28">
        {qa.map((item, i) => (
          <div key={i} className="grid md:grid-cols-2 gap-10 py-10 border-b border-black/5">
            <p className="text-xl">{i + 1}. {item.q}</p>
            <p className="font-sans text-base md:text-lg leading-8 text-neutral-700">{item.a}</p>
          </div>
        ))}
      </div>
      <GoToTop />
    </div>
  );
}

export default Labor;
