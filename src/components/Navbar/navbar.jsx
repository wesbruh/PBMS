import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

function Navbar() {
  // determines location of user based on current page
  const location = useLocation();

  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };


  // helper functions to indicate if the page link is an active page, including special services tab
  // if on homePage navbar is transparent
  const isActive = (path) => location.pathname === path;
  const isSpecialServicesActive = location.pathname.startsWith('/services/weddings') || location.pathname.startsWith('/services/labor-and-delivery');
  const isHomePage = location.pathname === '/';

  // shared styles for navbar links, sweeping underline when hovered with alternate color. Static underline with bg-brown
  const linkStyles = `tracking-wide relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-[#AB8C4B] hover:after:w-full after:transition-all after:duration-500 after:ease-in' ${isHomePage ? 'text-white' : 'text-black'}`;
  const activeLinkStyles = "after:!w-full after:bg-brown after:h-[2px]";

  return (
    // each link uses the styles according to user indicating hover over a tab and what the active page, navbar is trasnparent on homepage only
    <nav className={`w-full flex items-center pt-[2%] p-4  ${isHomePage ? 'bg-transparent absolute top-0 left-0 z-20' : 'bg-[#FFFDF4]'}`}>

      {/* logo and brand name on left side of Navbar */}
      <div className='flex items-center gap-3'>
        <img src="public/favicon.ico" alt="Your Roots Photography Logo" className='h-12 w-12'/>
        <h1 className={`${isHomePage ? 'text-white' : 'text-[#7E4C3C]'} font-serif text-2xl flex-grid`}>Your Roots Photography</h1> 
      </div>

      {/* Navbar tabs and buttons on right side of Navbar. 
      specifically designed to have gaps between tabs and not large gaps between the buttons */}
      <div className='flex font-mono text-sm  items-center ml-auto'>
        <div className='flex items-center gap-6'>
      <Link to="/" className={`${linkStyles} ${isActive('/') ? activeLinkStyles : ''}`}>Home</Link> 
      <Link to="/about" className={`${linkStyles} ${isActive('/about') ? activeLinkStyles : ''}`}>About</Link> 
      <Link to="/testimonials" className={`${linkStyles} ${isActive('/testimonials') ? activeLinkStyles : ''}`}>Testimonials</Link>
      <Link to="/portfolio" className={`${linkStyles} ${isActive('/portfolio') ? activeLinkStyles : ''}`}>Portfolio</Link>
      <Link to="/services" className={`${linkStyles} ${isActive('/services') ? activeLinkStyles : ''}`}>Services</Link>
      <Link to="/inquiry"  className={`${linkStyles} ${isActive('/inquiry') ? activeLinkStyles : ''}`}>Book with me </Link>
      
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
      </div>

      {/* Login/Create Account buttons */}
      {user ? (
        <>
          <Link
            to="/dashboard"
            className="ml-12 shrink-0 inline-block px-4 py-1.5 bg-[#7E4C3C] text-white text-lg leading-tight hover:bg-[#AB8C4B] transition border-2 border-black rounded-lg"
          >
            Dashboard
          </Link>
          <button
            onClick={handleLogout}
            className="ml-4 shrink-0 inline-block px-4 py-1.5 bg-white text-[#7E4C3C] text-lg leading-tight hover:bg-neutral-100 transition border-2 border-black rounded-lg"
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
    </nav>
  );
}

export default Navbar