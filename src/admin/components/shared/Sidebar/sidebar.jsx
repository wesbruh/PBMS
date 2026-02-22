import { Link, useLocation } from "react-router-dom";
import { Home, Camera, Calendar, Contact2 ,Image as ImageIcon, Bell, Banknote, ReceiptText, Settings, } from "lucide-react";

function Sidebar() {
  // determines location of user based on current page
  const location = useLocation();

  // helper functions to indicate if the page link is an active page, including special services tab
  const isActive = (path) => location.pathname.substring('/admin'.length) == path;

  // shared styles for navbar links, sweeping underline when hovered with alternate color. Static underline with bg-brown
  const linkStyles = "ml-8 mt-2 tracking-wide flex items-center gap-3 relative after:content-[''] after:absolute after:left-[-16px] after:w-0 after:h-full after:bg-[#AB8C4B] hover:after:w-1 hover:after:rounded after:transition-all after:duration-0 text-white ";
  const activeLinkStyles = "after:w-1 after:bg-white after:h-full after:rounded";

  return (
    // each link uses the styles according to user indicating hover over a tab and what the active page
    <div className='lg:text-lg md:text-md sm:text-md flex w-full bg-brown rounded-lg'>
      <div className='w-30 md:w-full'>
        <nav className='my-auto'>
          <div className='flex flex-col w-full'>
            <div className='flex m-3'> 
              <Link to="/admin" className={`${linkStyles} ${isActive('') ? activeLinkStyles : ''}`}><Home size={24} />Home</Link>
            </div>
            <div className='flex m-3'>
              <Link to="/admin/sessions" className={`${linkStyles} ${isActive('/sessions') ? activeLinkStyles : ''}`}><Camera size={24} />Sessions</Link>
            </div>
            <div className='flex m-3'>
              <Link to="/admin/availability" className={`${linkStyles} ${isActive('/availability') ? activeLinkStyles : ''}`}><Calendar size={24} />Availability</Link>
            </div>
            <div className='flex m-3'>
              <Link to="/admin/contacts" className={`${linkStyles} ${isActive('/contacts') ? activeLinkStyles : ''}`}><Contact2 size={24} />Contacts</Link>
            </div>
            <div className='flex m-3'>
              <Link to="/admin/galleries" className={`${linkStyles} ${isActive('/galleries') ? activeLinkStyles : ''}`}><ImageIcon size={24} />Galleries</Link>
            </div>
            <div className='flex m-3'>
              <Link to="/admin/notifications" className={`${linkStyles} ${isActive('/notifications') ? activeLinkStyles : ''}`}><Bell size={24} />Notifications</Link>
            </div>
            <div className='flex m-3'>
              <Link to="/admin/payments" className={`${linkStyles} ${isActive('/payments') ? activeLinkStyles : ''}`}><Banknote size={24} />Payments and Invoices</Link>
            </div>
            <div className='flex m-3'>
              <Link to="/admin/forms/questionnaires" className={`${linkStyles} ${isActive('/forms/questionnaires') ? activeLinkStyles : ''}`}><ReceiptText size={24} />Forms and Contracts</Link>
            </div>
            <div className='flex m-3'>
              <Link to="/admin/settings" className={`${linkStyles} ${isActive('/settings') ? activeLinkStyles : ''}`}><Settings size={24} />Settings</Link>
            </div>
          </div>
        </nav>

      </div>
    </div>
  );
}

export default Sidebar