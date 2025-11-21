import InquiryForm from "../../components/forms/InquiryForm";
import GoToTop from '../../GoToTop';

export default function InquiryPage() {
  return (
    <section className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">Book a Session</h1>
      <p className="text-neutral-600 mb-8">
        Share a few details and we’ll follow up with availability.
      </p>
      <GoToTop />
      <InquiryForm />
    </section>
  );
}