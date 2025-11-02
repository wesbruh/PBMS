import { Link, useLocation } from "react-router-dom";

function Navbar() {
  // determines location of user based on current page
  const location = useLocation();
  // helper functions to indicate if the page link is an active page, including special services tab
  const isActive = (path) => location.pathname === path;
  const isSpecialServicesActive = location.pathname.startsWith('/services/weddings') || location.pathname.startsWith('/services/labor-and-delivery');

  // shared styles for navbar links, sweeping underline when hovered with alternate color. Static underline with bg-brown
  const linkStyles = "tracking-wide relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-[#AB8C4B] hover:after:w-full after:transition-all after:duration-75 after:ease-in";
  const activeLinkStyles = "after:!w-full after:bg-brown after:h-[2px]";

  return (
    // each link uses the styles according to user indicating hover over a tab and what the active page
    <nav className='w-full flex items-center px-12 pr-15 py-3'>

      {/* logo and brand name on left side of Navbar */}
      <div className='flex items-center gap-3'>
        <img src="/favicon.ico" alt="Your Roots Photography Logo" className='h-12 w-12' />
        <h1 className='text-[#7E4C3C] font-serif text-3xl felx-grid'>Your Roots<br />Photography</h1>
      </div>

      {/* Navbar tabs and buttons on right side of Navbar. 
      specifically designed to have gaps between tabs and not large gaps between the buttons */}
      <div className='flex font-serif text-lg items-center ml-auto'>
        <div className='flex items-center gap-10'>
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
                <Link to="/services/weddings" className={`${linkStyles} ${isActive('/services/weddings') ? activeLinkStyles : ''}`}>Weddings</Link>
              </li>
              <li className='whitespace-nowrap px-3 py-4'>
                <Link to="/services/labor-and-delivery" className={`${linkStyles} ${isActive('/services/labor-and-delivery') ? activeLinkStyles : ''}`}>Labor & Delivery</Link>
              </li>
            </ul>

       </div>
      </div>

        {/* Login/Create Account buttons */}
        <Link
          to="/login"
          className="ml-12 shrink-0 inline-block px-4 py-1.5 bg-[#7E4C3C] text-white text-lg leading-tight hover:bg-[#AB8C4B] transition border-2 border-black rounded-lg"
        >Log in</Link>
        <Link
          to="/signup"
          className="ml-8 shrink-0 inline-block px-4 py-1.5 bg-[#7E4C3C] text-white text-lg leading-tight hover:bg-[#AB8C4B] transition border-2 border-black rounded-lg"
        >Create account</Link>
      </div>
    </nav>
  );
}

export default Navbar