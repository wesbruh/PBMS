import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function Services() {
  const heroImg = "/images/temp_img.jpg";
  const ctaImg = "/images/temp_booking.jpg";

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
        "60-90 minutes",
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
        "60-90 minutes",
        "Full gallery",
        "Location planning",
        "Candid + posed shots",
      ],
    },
  ];

  return (
    <div className="">
      <div className="relative w-full text-white font-serif">
        <img
          className="object-cover h-100 md:h-110 lg:h-120 w-full"
          src={heroImg}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-4xl md:text-5xl lg:text-6xl text-shadow-sm inline-block px-8 py-2 rounded-xl backdrop-blur-sm backdrop-brightness-90 leading-tight md:leading-snug lg:leading-snug">
            <p>Investment</p>
            <p className="text-base md:text-lg lg:text-xl mt-4 font-sans font-light">
              capturing your story with warmth & emotion
            </p>
          </div>
        </div>
      </div>

      {/* Packages*/}
      <div className="mx-5 md:mx-10 lg:mx-15 my-12 md:my-16 lg:my-20">
        <p className="font-serif  font-semibold text-center text-3xl md:text-4xl mb-6">
          Photography Packages
        </p>
        <p className="font-sans text-center text-sm md:text-lg mb-10 text-neutral-700">
          Logged in? <strong className="text-[#7E4C3C]">Click on a service</strong> to be redirected to the booking request form!<br></br> Otherwise, you'll be redirected to create an account.
        </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 cursor-pointer">
            {packages.map((p, i) => (
              <div
                key={i}
                onClick={() => handlePackageClick(p.name)}
                className="border border-neutral-200 rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition duration-300 bg-white"
              >
                <img src={p.img} className="object-cover h-60 w-full" />
                <div className="p-6">
                  <h2 className="font-serif text-2xl">{p.name}</h2>
                  <p className="font-sans font-bold text-md text-[#7E4C3C] mt-2">{p.price}</p>
                  <ul className="mt-4 text-sm space-y-1 text-neutral-600  list-disc list-inside">
                    {p.points.map((pt, idx) => (
                      <li key={idx}>{pt}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

        {/* <div className="mt-3 flex justify-center">
          <div className="font-sans w-48 md:w-56 ">
            <BookNowButton />
          </div>
        </div> */}
      </div>

      {/* SPECIAL SERVICES */}
      <div className="bg-[#887C62] text-white py-12 md:py-16 lg:py-20">
        <div className="mx-5 md:mx-10 lg:mx-15">
          <p className="font-serif text-3xl md:text-4xl">Special Services</p>
          <p className="mt-3 font-sans text-sm md:text-base">
            For moments that deserve their own story
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            <Link
              to="/services/weddings"
              className="block border border-white/30 rounded-2xl overflow-hidden hover:shadow-lg transition"
            >
              <img
                src="/images/temp_t.jpg"
                className="object-cover h-56 w-full"
              />
              <div className="p-6">
                <h4 className="font-serif text-2xl">Weddings</h4>
                <p className="text-sm mt-2">
                  Full or half-day coverage, timeline help, galleries & prints.
                </p>
                <span className="inline-block mt-4 underline">
                  View Packages
                </span>
              </div>
            </Link>

            <Link
              to="/services/labor-and-delivery"
              className="block border border-white/30 rounded-2xl overflow-hidden hover:shadow-lg transition"
            >
              <img
                src="/images/temp_s.jpg"
                className="object-cover h-56 w-full"
              />
              <div className="p-6">
                <h4 className="font-serif text-2xl">Labor & Delivery</h4>
                <p className="text-sm mt-2">
                  On-call experience documenting your birth story with care.
                </p>
                <span className="inline-block mt-4 underline">
                  View Packages
                </span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="relative h-auto w-full">
        <img
          className="absolute w-full object-cover object-[30%_35%] h-100 md:h-110 lg:h-120"
          src={ctaImg}
        />
        <div className="absolute flex flex-col my-25 w-full justify-between">
          <div className="flex pl-10 md:pl-13 lg:pl-15 h-1/3">
            <p className="text-white text-2xl md:text-3xl lg:text-4xl font-serif">
              Let's get you booked!
            </p>
          </div>
          <div className="flow-root my-24">
            <div className="flex flex-col float-left md:float-right lg:float-right pl-10 md:pr-13 lg:pr-15">
              <p className="font-mono text-white">YOUR ROOTS PHOTOGRAPHY</p>
            </div>
          </div>
        </div>
        <div className="invisible pb-100 md:pb-110 lg:pb-120">.</div>
      </div>
    </div>
  );
}

export default Services;
