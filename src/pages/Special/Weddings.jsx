import { Link } from "react-router-dom";
import GoToTop from '../../GoToTop';
import BookNowButton from "../../components/BookNowButton";

function Weddings() {
  const heroImg = "/images/temp_wedding_hero.jpg";

  const packages = [
    {
      name: "Ivory",
      price: "FROM: $1600",
      img: "/images/temp_ivory.jpg",
      points: [
        "Elopement Style",
        "3 hour coverage",
        "48 Hour Sneak Previews",
        "Location Scouting (if needed)",
        "Personalized Inspo Page",
        "Discounted Engagement Session",
        "Downloadable Online Gallery",
        "350+ Edited Photos",
      ],
    },
    {
      name: "Champagne",
      price: "FROM: $2400",
      img: "/images/temp_champagne.jpg",
      points: [
        "Pre-Wedding Consultation",
        "5 Hour Coverage",
        "48 Hour Sneak Previews",
        "Personalized Inspo Page",
        "Discounted Engagement Session",
        "Downloadable Online Gallery",
        "550+ Edited Photos",
      ],
    },
    {
      name: "Pearl",
      price: "FROM: $3800",
      img: "/images/temp_pearl.jpg",
      points: [
        "Pre-Wedding Consultation",
        "7 Hour Coverage",
        "48 Hour Sneak Previews",
        "Personalized Inspo Page",
        "Complimentary Engagement Session",
        "Discounted Boudoir Session",
        "Downloadable Online Gallery",
        "800+ Edited Photos",
      ],
    },
  ];

  const qa = [
    {
      q: "How do we officially book with you? Is there a deposit?",
      a: "Fill out an inquiry with your information and the package you want and I will confirm availability & pricing. There is a 30% deposit required to secure your booking.",
    },
    {
      q: "How long does it take to receive our final gallery?",
      a: "You will receive your finished gallery between 4–6 weeks from your wedding or elopement! Sneak previews are delivered within 48 hours!",
    },
    {
      q: "Do you offer custom packages if your options don't work for us?",
      a: "YES! If you have a specific idea in mind for what you’re looking for, just let me know and I can build a package that fits your needs!",
    },
  ];

  return (
    <div className="bg-[#F8F4EA] text-black font-serif">

      {/* HERO */}
      <div className="relative w-full text-white">
        <img className="w-full object-cover h-[420px] md:h-[520px] lg:h-[620px]" src={heroImg} alt="" />
        <div className="absolute inset-0 bg-black/30"/>
        <div className="absolute inset-0 flex flex-col justify-center pl-10 md:pl-20">
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">WEDDING & ELOPEMENT PACKAGES</h1>
          
        </div>
      </div>

      {/* WEDDING PACKAGES TITLE */}
      <p className="text-center mt-20 mb-14 font-sans text-sm tracking-[0.3em] uppercase text-neutral-600">
        WEDDING PACKAGES & PRICING
      </p>

      {/* PACKAGES */}
      <div className="mx-auto max-w-6xl px-4 md:px-8 lg:px-10 space-y-14">
        {packages.map((p, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center rounded-3xl bg-white/60 backdrop-blur border border-black/5 shadow-sm p-6 md:p-10"
          >
            <div className={i % 2 === 1 ? "md:order-2" : "md:order-1"}>
            <img src={p.img} alt={p.name} className="w-full h-[320px] md:h-[380px] object-cover rounded-3xl shadow-md" />
            </div>

              {/* Text*/}
              <div className={i % 2 === 1 ? "md:order-1" : "md:order-2"}>
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#2b2b2b]">{p.name}</h2>
                  <p className="font-sans text-sm md:text-base tracking-widest uppercase text-[#7E4C3C]">{p.price}</p>
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
                <BookNowButton
                 className="flex justify-center items-center w-full mt-6 bg-brown hover:bg-[#AB8C4B] h-12 text-white text-sm rounded-3xl transition">
                 BookNow
               </BookNowButton>
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
            <p className="text-xl font-serif">{i + 1}. {item.q}</p>
            <p className="font-sans text-base md:text-lg leading-8 text-neutral-700">{item.a}</p>
          </div>
        ))}
      </div>
      <GoToTop />
    </div>
  );
}

export default Weddings;