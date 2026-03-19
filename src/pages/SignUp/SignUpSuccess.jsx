import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

export default function SignUpSuccess() {
  const navigate = useNavigate();

  // Auto-redirect to inquiry after a few seconds
  const REDIRECT_SECONDS = 10;

  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);

  const nextPath = useMemo(() => "/dashboard/inquiry", []);

  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) return 0;
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (secondsLeft === 0) {
      navigate(nextPath, { replace: true });
    }
  }, [secondsLeft, navigate, nextPath]);

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#FFFDF4]">
      <div className="mx-4 md:mx-6 lg:mx-10 py-10 md:py-14 flex justify-center">
        <div className="w-full max-w-3xl">
          {/* Header */}
          <div className="text-center mb-8 md:mb-10">
            <h1 className="text-3xl md:text-5xl font-serif font-extralight tracking-wide">
              YOU’RE ALL SET
            </h1>
            <p className="mt-3 text-sm md:text-base text-neutral-600 max-w-xl mx-auto">
              Your account has been created successfully. Next, tell me a little about the session you’d like to book.
            </p>
          </div>

          {/* Card */}
          <div className="bg-white/60 backdrop-blur-sm border border-black/10 rounded-2xl shadow-sm px-5 md:px-10 py-10">
            {/* Icon */}
            <div className="mx-auto mb-6 h-14 w-14 rounded-full border border-black/10 bg-white flex items-center justify-center">
              <svg
                className="h-7 w-7 text-[#7E4C3C]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m7 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <div className="text-center">
              <h2 className="font-serif text-xl md:text-2xl text-[#7E4C3C]">
                Let’s book your session
              </h2>
              <p className="mt-2 text-sm text-neutral-600 max-w-xl mx-auto">
                Click below to fill out your session request form. I’ll follow up with availability within 24 hours.
              </p>

              {/* CTA buttons */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => navigate("/dashboard/inquiry")}
                  className="px-8 h-12 bg-brown hover:bg-[#AB8C4B] text-white text-sm font-serif border border-black rounded-md transition"
                >
                  Continue to Booking
                </button>

                <Link
                  to="/"
                  className="px-8 h-12 inline-flex items-center justify-center bg-white hover:bg-neutral-100 text-[#7E4C3C] text-sm font-serif border border-black rounded-md transition"
                >
                  Back to Home
                </Link>
              </div>

              {/* Optional auto redirect notice */}
              <p className="mt-6 text-[11px] text-neutral-500">
                Taking you to the booking form in{" "}
                <span className="text-[#7E4C3C] font-semibold">{secondsLeft}</span>{" "}
                seconds…
              </p>

              <p className="mt-2 text-[10px] text-neutral-500">
                You can always return later from the “Book with me” button in the navigation.
              </p>
            </div>
          </div>

          {/* Footer reassurance */}
          <div className="mt-8 text-center">
            <p className="text-sm text-neutral-600">
              Questions before booking?{" "}
              <Link
                to="/contact"
                className="text-[#7E4C3C] underline underline-offset-4 hover:text-[#AB8C4B]"
              >
                Contact me
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}