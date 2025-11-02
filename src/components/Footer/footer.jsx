import { Link } from "react-router-dom";

// page footer with logo and copyright, should be available across all pages
function Footer() {
  return (
    <footer className='relative w-full text-[#7E4C3C] px-12 py-6 mt-auto font-serif'>
      <div className='flex items-center gap-3'>
        <img src="/favicon.ico" alt="Your Roots Photography Logo" className='h-12 w-12' />
        <span className='text-[#7E4C3C] font-serif text-md'> &copy; Your Roots Photography</span>
      </div>
    </footer>
  );
}

export default Footer