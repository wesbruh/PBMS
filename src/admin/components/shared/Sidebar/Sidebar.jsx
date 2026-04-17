import { Link, useLocation } from "react-router-dom";
import { Home, Camera, Calendar, Contact2, Image as ImageIcon, Bell, BellDot, Banknote, ReceiptText, Settings, Package } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../../../../lib/supabaseClient";

function Sidebar() {
  // determines location of user based on current page
  const location = useLocation();

  const [hasUnread, setHasUnread] = useState(false);

  const checkUnread = async () => {
    const { count } = await supabase
      .from("Notification")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent");
    setHasUnread((count ?? 0) > 0);
  };

  useEffect(() => {
    checkUnread();

    // Listen to both INSERT and UPDATE events so when notifications.jsx
    // marks them as "read" the sidebar re-checks and clears the BellDot
    const channel = supabase
      .channel("sidebar-unread")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "Notification" }, checkUnread)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Notification" }, checkUnread)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "Notification" }, checkUnread)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // Re-check unread count whenever the route changes
  // This catches the case where the admin navigates to /notifications
  // and the mark-as-read runs before the real-time event fires
  useEffect(() => {
    checkUnread();
  }, [location.pathname]);

  // helper functions to indicate if the page link is an active page
  const isActive = (path) => location.pathname.substring('/admin'.length) == path;

  // shared styles for navbar links
  const linkStyles = "mx-3 md:ml-8 mt-2 tracking-wide flex items-center gap-4 relative after:content-[''] after:absolute  after:left-[-12px] md:after:left-[-16px] after:w-0 after:h-full after:bg-[#AB8C4B] hover:after:w-1 hover:after:rounded after:transition-all after:duration-0 text-white ";
  const activeLinkStyles = "after:w-1 after:bg-white after:h-full after:rounded";
  //for collapsing sidebar on smaller screens, keeping the icons shown jsut hidding the text
  const labelStyles="hidden md:inline"

  return (
        <nav className='h-full w-auto md:max-w-75 sm:text-md md:text-base lg:text-lg flex bg-brown rounded-lg'>
          <div className='flex flex-col w-full justify-between pt-2 pb-2'>
            <div className='flex md:mx-3 mx-2 my-1'>
              <Link to="/admin" className={`${linkStyles} ${isActive('') ? activeLinkStyles : ''}`}><Home size={24} /><span className={labelStyles}>Home</span></Link>
            </div>
            <div className='flex md:mx-3 mx-2 my-1'>
              <Link to="/admin/sessions" className={`${linkStyles} ${isActive('/sessions') ? activeLinkStyles : ''}`}><Camera size={24} /><span className={labelStyles}>Sessions</span></Link>
            </div>
            <div className='flex md:mx-3 mx-2 my-1'>
              <Link to="/admin/availability" className={`${linkStyles} ${isActive('/availability') ? activeLinkStyles : ''}`}><Calendar size={24} /><span className={labelStyles}>Availability</span></Link>
            </div>
            <div className='flex md:mx-3 mx-2 my-1'>
              <Link to="/admin/contacts" className={`${linkStyles} ${isActive('/contacts') ? activeLinkStyles : ''}`}><Contact2 size={24} /><span className={labelStyles}>Contacts</span></Link>
            </div>
            <div className='flex md:mx-3 mx-2 my-1'>
              <Link to="/admin/galleries" className={`${linkStyles} ${isActive('/galleries') ? activeLinkStyles : ''}`}><ImageIcon size={24} /><span className={labelStyles}>Galleries</span></Link>
            </div>
            <div className='flex md:mx-3 mx-2 my-1'>
              <Link
                to="/admin/notifications"
                className={`${linkStyles} ${isActive('/notifications') ? activeLinkStyles : ''}`}
              >
                {hasUnread ? <BellDot size={24} /> : <Bell size={24} />}
                <span className={labelStyles}>Notifications</span>
              </Link>
            </div>
            <div className='flex md:mx-3 mx-2 my-1'>
              <Link to="/admin/payments" className={`${linkStyles} ${isActive('/payments') ? activeLinkStyles : ''}`}><Banknote size={24} /><span className={labelStyles}>Payments</span></Link>
            </div>
            <div className='flex md:mx-3 mx-2 my-1'>
              <Link to="/admin/offerings" className={`${linkStyles} ${isActive('/offerings') ? activeLinkStyles : ''}`}><Package size={24} /><span className={labelStyles}>Session Packages</span></Link>
            </div>
            <div className='flex md:mx-3 mx-2 my-1'>
              <Link to="/admin/forms" className={`${linkStyles} ${isActive('/forms') ? activeLinkStyles : ''}`}><ReceiptText size={24} /><span className={labelStyles}>Forms</span></Link>
            </div>
            <div className='flex md:mx-3 mx-2 my-1'>
              <Link to="/admin/settings" className={`${linkStyles} ${isActive('/settings') ? activeLinkStyles : ''}`}><Settings size={24} /><span className={labelStyles}>Settings</span></Link>
            </div>
          </div>
        </nav>
  );
}

export default Sidebar;