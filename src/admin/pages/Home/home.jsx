import Sidebar from "../../components/shared/Sidebar/Sidebar";
import Frame from "../../components/shared/Frame/Frame";
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
    <div className="flex my-10 md:my-14 h-[65vh] mx-4 md:mx-6 lg:mx-10 bg-[#faf8f4] rounded-lg overflow-clip">
      <div className="flex w-1/5 min-w-50">
        <Sidebar />
      </div>
      <div className="flex h-full w-full shadow-inner rounded-lg overflow-hidden">
        <Frame>
          <div className='relative w-full m-10 font-bold text-brown text-2xl overflow-y-scroll'>
            <h2>Welcome, {username}</h2>
          </div>
        </Frame>
      </div>
    </div>
  );
}

export default AdminHome