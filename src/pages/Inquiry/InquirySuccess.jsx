import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function InquirySuccess() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // We pass these details via Stripe's success url
  const sessionId = searchParams.get('session_id') || null;

  // parameters we want
  const [fullName, setFullName] = useState(null);
  const [email, setEmail] = useState(null);
  const [sessionType, setSessionType] = useState(null);
  const [dateTime, setDateTime] = useState(null);
  const [location, setLocation] = useState(null);

  // get user information
  const { session, profile } = useAuth();
  const [loading, setLoading] = useState(true);

  // If someone refreshes this page, state will be lost.
  // In that case, send them back to the inquiry form.
  useEffect(() => {
    if (!sessionId) {
      navigate("/dashboard/inquiry", { replace: true });
    }
  }, [sessionId, navigate]);

  useEffect(() => {
    if (!session || !profile || !sessionId) return;

    const loadParameters = async () => {
      try {
        const response = await fetch(`http://localhost:5001/api/sessions/${sessionId}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${session?.access_token}`,
            "Content-Type": "application/json"
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error("Failed to fetch session", errorData.error);
        }

        const sessionData = await response.json();
        
        // error checks
        if (profile && sessionData.User.id !== profile.id) throw new Error({ message: "Session not found or does not belong to user" });

        // set parameters
        setFullName(`${sessionData.User.first_name} ${sessionData.User.last_name}`);
        setEmail(sessionData.User.email);
        setSessionType(sessionData?.SessionType?.name || null);
        setDateTime(new Date(sessionData.start_at).toLocaleString());
        setLocation(sessionData.location_text);

        setLoading(false);
      } catch (error) {
        console.error("Error getting session: ", error);
        navigate("/dashboard/inquiry", { replace: true });
      }
    }

    loadParameters();
  }, [session, profile, sessionId, navigate])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center font-serif text-brown">
        Loading details...
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#FFFDF4]">
      <div className="mx-4 md:mx-6 lg:mx-10 py-10 md:py-14 flex justify-center">
        <div className="w-full max-w-3xl">
          {/* Header */}
          <div className="text-center mb-8 md:mb-10">
            <h1 className="text-3xl md:text-5xl font-serif font-extralight tracking-wide">
              REQUEST RECEIVED
            </h1>
            <p className="mt-3 text-sm md:text-base text-neutral-600 max-w-xl mx-auto">
              Thank you, {fullName || ""} 🤍  I'll review your request and email/text you within 24 hours
              with availability and next steps.
            </p>
          </div>

          {/* Card */}
          <div className="bg-white/60 backdrop-blur-sm border border-black/10 rounded-2xl shadow-sm px-5 md:px-10 py-10">
            {/* Check icon */}
            <div className="mx-auto mb-6 h-14 w-14 rounded-full border border-black/10 bg-white flex items-center justify-center">
              <svg
                className="h-7 w-7 text-[#7E4C3C]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m7 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            {/* Details */}
            <div className="text-center">
              <h2 className="font-serif text-xl md:text-2xl text-[#7E4C3C]">
                Here's what I received
              </h2>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="rounded-lg border border-black/10 bg-white/70 px-4 py-3">
                  <p className="text-[11px] tracking-widest text-neutral-500">SESSION TYPE</p>
                  <p className="mt-1 font-serif text-[#7E4C3C]">{sessionType || "-"}</p>
                </div>

                <div className="rounded-lg border border-black/10 bg-white/70 px-4 py-3">
                  <p className="text-[11px] tracking-widest text-neutral-500">DATE &amp; TIME</p>
                  <p className="mt-1 font-serif text-[#7E4C3C]">{dateTime || "—"}</p>
                </div>

                <div className="rounded-lg border border-black/10 bg-white/70 px-4 py-3">
                  <p className="text-[11px] tracking-widest text-neutral-500">LOCATION</p>
                  <p className="mt-1 font-serif text-[#7E4C3C]">{location || "—"}</p>
                </div>

                <div className="rounded-lg border border-black/10 bg-white/70 px-4 py-3">
                  <p className="text-[11px] tracking-widest text-neutral-500">CONTACT EMAIL</p>
                  <p className="mt-1 font-serif text-[#7E4C3C]">{email || "—"}</p>
                </div>
              </div>

              <p className="mt-6 text-[11px] text-neutral-500">
                If you don't see my email within 24 hours, check your spam/junk folder.
              </p>

              {/* CTAs */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/"
                  className="px-8 h-12 inline-flex items-center justify-center bg-brown hover:bg-[#AB8C4B] text-white text-sm font-serif border border-black rounded-md transition"
                >
                  Back to Home
                </Link>

                <Link
                  to="/dashboard"
                  className="px-8 h-12 inline-flex items-center justify-center bg-white hover:bg-neutral-100 text-[#7E4C3C] text-sm font-serif border border-black rounded-md transition"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-8 text-center">
            <p className="text-sm text-neutral-600">
              Want to submit another request?{" "}
              <Link className="text-[#7E4C3C] underline underline-offset-4 hover:text-[#AB8C4B]" to="/dashboard/inquiry">
                Submit Another Inquiry
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}