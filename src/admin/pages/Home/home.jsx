import Sidebar from "../../components/shared/Sidebar/sidebar";
import Frame from "../../components/shared/Frame/frame";
import { useAuth } from "../../../context/AuthContext";

function AdminHome() {
  const { profile } = useAuth();
  const username = (profile != null) ? `${profile.first_name} ${profile.last_name}` : "Admin";

  if (username === "Admin") {
    return (
      <div className="w-full py-16 text-center text-brown font-serif">
        Loading your account...
      </div>
    );
  }
  
  return (
    <div className='flex my-10 md:my-14 h-[80vh] mx-4 md:mx-6 lg:mx-10 bg-white rounded-lg'>
      <div className='flex w-1/3'>
        <Sidebar />
      </div>
      <div className='flex w-2/3'>
        <Frame>
          <div className='relative m-10 font-bold text-brown  text-2xl'>
            <h2>Welcome, {username}</h2>
          </div>
        </Frame>
      </div>
    </div>
  );
}

export default AdminHome