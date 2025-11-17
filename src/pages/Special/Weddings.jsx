import { Link } from "react-router-dom";
import GoToTop from '../../GoToTop';

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
        <img className="object-cover h-[65vh] w-full" src={heroImg} />
        <div className="absolute inset-0 flex flex-col justify-center pl-10 md:pl-20">
          <p className="text-4xl md:text-6xl font-light">WEDDING & ELOPEMENT PACKAGES</p>
        </div>

        <div className="absolute right-10 bottom-10">
          <a
            className="bg-brown px-6 py-3 text-white text-sm hover:bg-[#AB8C4B]"
            href="mailto:Your.rootsphotography@gmail.com">
            INQUIRE HERE
          </a>
        </div>
      </div>

      {/* WEDDING PACKAGES TITLE */}
      <p className="text-center mt-14 mb-10 font-mono tracking-widest">
        WEDDING PACKAGES & PRICING
      </p>

      {/* PACKAGES */}
      <div className="flex flex-col space-y-20 mx-6 md:mx-20 lg:mx-32">
        {packages.map((p, i) => (
          <div key={i} className={`grid grid-cols-1 md:grid-cols-2 items-center gap-10 ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}>
            <img src={p.img} className="w-full object-cover h-[350px]" />

            <div>
              <h2 className="text-3xl">{p.name}</h2>
              <p className="mt-2 font-mono">{p.price}</p>
              <ul className="mt-5 text-sm space-y-1 font-sans">
                {p.points.map((pt, idx) => (
                  <li key={idx}>- {pt}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Q&A SECTION */}
      <p className="text-center text-4xl mt-24 mb-10">Q&A</p>
      <div className="mx-6 md:mx-20 lg:mx-32 space-y-20 mb-24">
        {qa.map((item, i) => (
          <div key={i} className="grid md:grid-cols-2 gap-10">
            <p className="text-xl">{i + 1}. {item.q}</p>
            <p className="font-sans text-base">{item.a}</p>
          </div>
        ))}
      </div>
      <GoToTop />
    </div>
  );
}

export default Weddings;