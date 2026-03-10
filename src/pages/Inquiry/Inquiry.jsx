import InquiryForm from "../../components/forms/InquiryForm";
import GoToTop from "../../GoToTop";

export default function Inquiry() {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#FFFDF4]">
      <div className="mx-4 md:mx-6 lg:mx-10 py-10 md:py-14 flex justify-center">
        <section className="w-full max-w-3xl">
          <div className="text-center mb-8 md:mb-10">
            <h1 className="text-3xl md:text-5xl font-serif font-extralight tracking-wide">
              Inquiry
            </h1>
            <p className="mt-3 text-sm md:text-base text-neutral-600 max-w-xl mx-auto">
              Share a few details below and I'll follow up with availability within 24 hours.
            </p>
          </div>

          <GoToTop />

          <div className="bg-white/60 backdrop-blur-sm border border-black/10 rounded-2xl shadow-sm px-5 md:px-8 py-8">
            <InquiryForm />
          </div>

          <div className="mt-8 text-center">
          </div>
        </section>
      </div>
    </div>
  );
}
