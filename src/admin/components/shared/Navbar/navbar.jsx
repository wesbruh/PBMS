import { Link, useLocation } from "react-router-dom";

function Navbar() {
  // determines location of user based on current page
  const location = useLocation();
  // helper functions to indicate if the page link is an active page, including special services tab
  const isActive = (path) => location.pathname.startsWith(path);

  // shared styles for navbar links, sweeping underline when hovered with alternate color. Static underline with bg-brown
  const linkStyles = "tracking-wide relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-[#AB8C4B] hover:after:w-full after:transition-all after:duration-75 after:ease-in";
  const activeLinkStyles = "after:!w-full after:bg-brown after:h-[2px]";

  return (
    // each link uses the styles according to user indicating hover over a tab and what the active page
    <nav className='w-full flex items-center px-12 pr-15 py-3'>

      {/* logo and brand name on left side of Navbar */}
      <div className='flex items-center gap-3'>
        <img src="/favicon.ico" alt="Your Roots Photography Logo" className='h-12 w-12' />
        <h1 className='text-[#7E4C3C] font-serif text-3xl flex-grid text-center m-auto'>Admin Settings</h1>
      </div>

      {/* Navbar tabs and buttons on right side of Navbar. 
      specifically designed to have gaps between tabs and not large gaps between the buttons */}
      <div className='flex font-serif text-lg items-center ml-auto'>
        <div className='flex items-center gap-10'>
          <Link to="/admin" className={`${linkStyles} ${isActive('/admin') ? activeLinkStyles : ''}`}>Dashboard</Link>
        </div>

        {/* Sign Out button */}
        <Link
          to="/"
          className="ml-12 shrink-0 inline-block px-4 py-1.5 bg-[#7E4C3C] text-white text-lg leading-tight hover:bg-[#AB8C4B] transition border-2 border-black rounded-lg"
        >Sign Out</Link>
      </div>
    </nav>
  );
}

export default Navbar