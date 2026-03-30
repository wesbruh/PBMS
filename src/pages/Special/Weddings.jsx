import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import GoToTop from "../../GoToTop";
import BookNowButton from "../../components/Buttons/BookNowButton";

function Weddings() {
  const heroImg = "/images/temp_wedding_hero.jpg";

  const navigate = useNavigate();
  const { user } = useAuth();
  const handlePackageClick = (packageName) => {
    if (user) {
      navigate('/dashboard/inquiry', { state: { selectedPackage: packageName } });
    } else {
      navigate('/signup');
    }
  };

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
        <img
          className="w-full object-cover h-105 md:h-130 lg:h-155"
          src={heroImg}
          alt=""
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 flex flex-col justify-center pl-10 md:pl-20">
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
            WEDDING & ELOPEMENT PACKAGES
          </h1>
        </div>
      </div>

      {/* WEDDING PACKAGES TITLE */}
      <p className="text-center mt-20 mb-4 font-serif font-semibold text-3xl tracking-wide uppercase">
        Wedding Packages & Pricing
      </p>
      <p className="font-sans text-center text-sm md:text-lg mb-10 text-neutral-700">
          Logged in? <strong className="text-[#7E4C3C]">Click on a service</strong> to be redirected to the booking request form!<br></br> Otherwise, you'll be redirected to create an account.
        </p>
      {/* PACKAGES */}
      <div className="mx-auto max-w-400 px-4 md:px-8 lg:px-10 ">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {packages.map((p, i) => (
            <div
              key={i}
              onClick={() => handlePackageClick(p.name)}
              className="flex flex-col overflow-hidden shadow-md hover:shadow-xl transition duration-300 rounded-3xl bg-white/60 backdrop-blur border border-black/5 p-5 md:p-6 cursor-pointer "
            >
              <img
                src={p.img}
                alt={p.name}
                className="w-full h-60 md:h-72 object-cover rounded-xl shadow-md overflow-hidden"
              />

              <div className="mt-5 flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#2b2b2b]">
                  {p.name}
                </h2>
                <p className="font-sans font-bold text-md tracking-widest uppercase text-[#7E4C3C] whitespace-nowrap">
                  {p.price}
                </p>
              </div>

              <ul className="mt-4 space-y-2 text-[15px] leading-7 text-neutral-700 font-sans flex-1">
                {p.points.map((pt, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#7E4C3C] shrink-0" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
{/* 
        <div className="mt-3 flex justify-center">
          <div className="font-sans w-48 md:w-56 ">
            <BookNowButton />
          </div>
        </div> */}
      </div>

      {/* Q&A SECTION */}
      <p className="text-center text-4xl mt-28 mb-14 font-serif">Q&A</p>
      <div className="mx-auto max-w-6xl px-4 md:px-8 lg:px-10 space-y-16 mb-28">
        {qa.map((item, i) => (
          <div
            key={i}
            className="grid md:grid-cols-2 gap-10 py-10 border-b border-black/5"
          >
            <p className="text-xl font-serif">
              {i + 1}. {item.q}
            </p>
            <p className="font-sans text-base md:text-lg leading-8 text-neutral-700">
              {item.a}
            </p>
          </div>
        ))}
      </div>
      <GoToTop />
    </div>
  );
}

export default Weddings;
