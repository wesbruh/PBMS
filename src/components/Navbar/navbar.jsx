import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useState } from "react"; // added for menu mangement when on mobile

function Navbar() {
  // determines location of user based on current page
  const location = useLocation();

  const { user } = useAuth();
  const navigate = useNavigate();

  // for mobile menu management and special services accordian
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSpecialServicesOpen, setIsSpecialServicesOpen] = useState(false);

  const handleLogout = async () => {
    if (user?.id) {
      const { error } = await supabase
        .from("User")
        .update({ is_active: false })
        .eq("id", user.id);
      if (error) {
        console.error("Failed to mark user inactive:", error);
      }
    }
    await supabase.auth.signOut();
    navigate("/login");
    setIsMenuOpen(false); // mobile menu close on logout
  };


  // helper functions to indicate if the page link is an active page, including special services tab
  // if on homePage navbar is transparent
  const isActive = (path) => location.pathname === path;
  const isSpecialServicesActive = location.pathname.startsWith('/services/weddings') || location.pathname.startsWith('/services/labor-and-delivery');
  const isHomePage = location.pathname === '/';

  // shared styles for navbar links, sweeping underline when hovered with alternate color. Static underline with bg-brown
  const linkStyles = `tracking-wide relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-[#AB8C4B] hover:after:w-full after:transition-all after:duration-500 after:ease-in' ${isHomePage ? 'text-white' : 'text-black'}`;
  const activeLinkStyles = "after:!w-full after:bg-brown after:h-[2px]";

  // for mobile view links
  const mobileLinkStyles = "block py-3 px-4 hover:bg-[#AB8C4B] hover:text-white transition-colors rounded";

  return (
    // each link uses the styles according to user indicating hover over a tab and what the active page, navbar is trasnparent on homepage only
    <nav className={`w-full flex items-center justify-between p-3  ${isHomePage ? 'bg-transparent absolute top-0 left-0 z-20' : 'bg-[#FFFDF4]'}`}>

      {/* logo and brand name on left side of Navbar, adjusted size */}
      <div className='flex items-center gap-3'>
        <img src="/logo2.png" alt="Your Roots Photography Logo" className='h-12 w-12 md:h-25 md:w-25'/>
        <h1 className={`${isHomePage ? 'text-white' : 'text-[#7E4C3C]'} font-serif text-2xl flex-grid`}>YOUR ROOTS PHOTOGRAPHY</h1> 
      </div>

      {/* Navbar tabs and buttons on right side of Navbar. Specifically designed to have gaps between tabs and not large gaps between the buttons
      Adjusted to hidden desktop navbar when viewing from mobile. Moved special services to be next to regular services in desktop nav */}
      <div className='hidden lg:flex font-serif text-sm items-center ml-auto'>
        <div className='flex items-center gap-6'>
      <Link to="/" className={`${linkStyles} ${isActive('/') ? activeLinkStyles : ''}`}>Home</Link> 
      <Link to="/about" className={`${linkStyles} ${isActive('/about') ? activeLinkStyles : ''}`}>About</Link> 
      <Link to="/testimonials" className={`${linkStyles} ${isActive('/testimonials') ? activeLinkStyles : ''}`}>Testimonials</Link>
      <Link to="/portfolio" className={`${linkStyles} ${isActive('/portfolio') ? activeLinkStyles : ''}`}>Portfolio</Link>
      <Link to="/services" className={`${linkStyles} ${isActive('/services') ? activeLinkStyles : ''}`}>Services</Link>
      
      {/* Special Services Dropdown Menu */}
      <div className="inline-block relative group">
        <button className={`${linkStyles} ${isSpecialServicesActive ? activeLinkStyles : ''}`}>Special Services</button>
        <ul className ='absolute top-full mt-2 bg-white shadow-xl rounded-md py-2 z-10 max-h-0 opacity-0 overflow-hidden 
        group-hover:max-h-40 group-hover:opacity-100  transition-all duration-800 ease-out'>
          <li className='px-3 py-1'>
          <Link to="/services/weddings" className={`${linkStyles} text-black! ${isActive('/services/weddings') ? activeLinkStyles : ''}`}>Weddings</Link>
          </li>
          <li className='whitespace-nowrap px-3 py-4'>
          <Link to="/services/labor-and-delivery" className={`${linkStyles} text-black! ${isActive('/services/labor-and-delivery') ? activeLinkStyles : ''}`}>Labor & Delivery</Link>
          </li>
        </ul>

       </div>
       <Link to="/inquiry"  className={`${linkStyles} ${isActive('/inquiry') ? activeLinkStyles : ''}`}>Book with me</Link>
      </div>

      {/* Login/Create Account buttons */}
      {user ? (
        <>
          <Link
            to="/dashboard"
            className="ml-12 shrink-0 inline-block px-4 py-1.5 bg-[#7E4C3C] text-white text-sm leading-tight hover:bg-[#AB8C4B] transition border border-black rounded-lg"
          >
            Dashboard
          </Link>
          <button
            onClick={handleLogout}
            className="ml-4 shrink-0 inline-block px-4 py-1.5 bg-white text-[#7E4C3C] text-sm leading-tight hover:bg-gray-200 cursor-pointer transition border border-black rounded-lg"
          >
            Log out
          </button>
        </>
      ) : (
        <>
          <Link
            to="/login"
            className="ml-5 shrink-0 inline-block px-4 py-1.5 bg-[#7E4C3C] text-white text-sm leading-tight hover:bg-[#AB8C4B] transition border border-black rounded-lg"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="ml-4 shrink-0 inline-block px-4 py-1.5 bg-[#7E4C3C] text-white text-sm leading-tight hover:bg-[#AB8C4B] transition border border-black rounded-lg"
          >
            Create account
          </Link>
        </>
          )}

      </div>

      {/* Added: Mobile Hamburger Menu button */}
      <button 
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className={`lg:hidden z-50 ${isHomePage ? 'text-white' : 'text-[#7E4C3C]'}`}
        aria-label="Toggle menu"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile Sidebar overlay */}
      {isMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-transparent z-30"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar menu */}
      <div className={`lg:hidden fixed top-0 right-0 h-full w-80 bg-[#FFFDF4] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'} overflow-y-auto`}>
        
        {/* Close button */}
        <button 
          onClick={() => setIsMenuOpen(false)}
          className="absolute top-4 right-4 text-[#7E4C3C] hover:text-[#AB8C4B]"
          aria-label="Close menu"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Mobile Menu content */}
        <div className="pt-16 px-4 font-serif text-[#7E4C3C]">
          <Link to="/" onClick={() => setIsMenuOpen(false)} className={`${mobileLinkStyles} ${isActive('/') ? 'bg-[#7E4C3C] text-white' : ''}`}>Home</Link>
          <Link to="/about" onClick={() => setIsMenuOpen(false)} className={`${mobileLinkStyles} ${isActive('/about') ? 'bg-[#7E4C3C] text-white' : ''}`}>About</Link>
          <Link to="/testimonials" onClick={() => setIsMenuOpen(false)} className={`${mobileLinkStyles} ${isActive('/testimonials') ? 'bg-[#7E4C3C] text-white' : ''}`}>Testimonials</Link>
          <Link to="/portfolio" onClick={() => setIsMenuOpen(false)} className={`${mobileLinkStyles} ${isActive('/portfolio') ? 'bg-[#7E4C3C] text-white' : ''}`}>Portfolio</Link>
          <Link to="/services" onClick={() => setIsMenuOpen(false)} className={`${mobileLinkStyles} ${isActive('/services') ? 'bg-[#7E4C3C] text-white' : ''}`}>Services</Link>
          
          {/* Special Services Accordion, moved special services to be under regular services */}
          <div className="my-2">
            <button 
              onClick={() => setIsSpecialServicesOpen(!isSpecialServicesOpen)}
              className={`${mobileLinkStyles} w-full text-left flex justify-between items-center ${isSpecialServicesActive ? 'bg-[#7E4C3C] text-white' : ''}`}
            >
              Special Services
              <svg className={`w-5 h-5 transform transition-transform ${isSpecialServicesOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isSpecialServicesOpen && (
              <div className="ml-4 mt-2">
                <Link to="/services/weddings" onClick={() => setIsMenuOpen(false)} className={`${mobileLinkStyles} ${isActive('/services/weddings') ? 'bg-[#7E4C3C] text-white' : ''}`}>Weddings</Link>
                <Link to="/services/labor-and-delivery" onClick={() => setIsMenuOpen(false)} className={`${mobileLinkStyles} ${isActive('/services/labor-and-delivery') ? 'bg-[#7E4C3C] text-white' : ''}`}>Labor & Delivery</Link>
              </div>
            )}
          </div>

          <Link to="/inquiry" onClick={() => setIsMenuOpen(false)} className={`${mobileLinkStyles} ${isActive('/inquiry') ? 'bg-[#7E4C3C] text-white' : ''}`}>Book with me</Link>

          {/* Mobile Authentication buttons */}
          <div className="mt-8 space-y-3 px-4">
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="block w-full text-center px-4 py-1.5 bg-[#7E4C3C] text-white rounded-lg hover:bg-[#AB8C4B] transition border border-black">
                  Dashboard
                </Link>
                <button onClick={handleLogout} className="block w-full text-center px-4 py-1.5 bg-white text-[#7E4C3C] rounded-lg hover:bg-neutral-100 transition border border-black">
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setIsMenuOpen(false)} className="block w-full text-center px-4 py-1.5 bg-[#7E4C3C] text-white rounded-lg hover:bg-[#AB8C4B] transition border border-black">
                  Log in
                </Link>
                <Link to="/signup" onClick={() => setIsMenuOpen(false)} className="block w-full text-center px-4 py-1.5 bg-[#7E4C3C] text-white rounded-lg hover:bg-[#AB8C4B] transition border border-black">
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar
